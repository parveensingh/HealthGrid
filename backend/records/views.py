import json
import logging
import mimetypes
from pathlib import Path

from cryptography.exceptions import InvalidTag
from django.http import HttpResponse
from django.utils.text import get_valid_filename
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework import status

from attribute_authority.models import Doctor
from .blockchain import BlockchainError, log_on_chain
from .crypto import decrypt_file, encrypt_file
from .models import AuditEvent, MedicalRecord
from .policy import policy_allows, validate_policy
from .serializers import AuditEventSerializer, RecordSerializer
from .storage import StorageError, fetch_encrypted_payload, pin_encrypted_payload

logger = logging.getLogger(__name__)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def _record_event(record, actor, action, details=None):
    event = AuditEvent.objects.create(
        record=record,
        record_id_snapshot=str(record.id),
        actor=actor[:120],
        action=action,
        details=details or {},
    )
    tx_hash = log_on_chain(record.id, action, actor)
    return event, tx_hash


@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "mode": "local-demo"})


@api_view(["GET"])
def doctors(request):
    return Response(
        [
            {
                "id": doctor.id,
                "name": doctor.name,
                "specialty": doctor.specialty,
                "attributes": doctor.attributes,
                "verified": doctor.verified,
            }
            for doctor in Doctor.objects.order_by("id")
        ]
    )


@api_view(["GET", "POST"])
@parser_classes([JSONParser, FormParser, MultiPartParser])
def records(request):
    if request.method == "GET":
        return Response(RecordSerializer(MedicalRecord.objects.order_by("-created_at"), many=True).data)

    uploaded = request.FILES.get("file")
    title = request.data.get("title", "")
    patient_name = request.data.get("patient_name", "Demo Patient")
    title = title.strip() if isinstance(title, str) else ""
    patient_name = patient_name.strip() if isinstance(patient_name, str) else ""
    policy_value = request.data.get("policy")
    if uploaded is None or not title:
        return Response({"error": "A file and title are required."}, status=status.HTTP_400_BAD_REQUEST)
    if uploaded.size > MAX_UPLOAD_BYTES:
        return Response({"error": "Files must be 10 MB or smaller."}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    if not patient_name:
        return Response({"error": "Patient name cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(policy_value, str):
        try:
            policy_value = json.loads(policy_value)
        except ValueError:
            return Response({"error": "Policy must be valid JSON."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        policy_value = validate_policy(policy_value)
    except (TypeError, ValueError) as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    record = MedicalRecord(title=title[:160], patient_name=patient_name[:120], policy=policy_value)
    encrypted = encrypt_file(record.id, uploaded.read())
    try:
        cid = pin_encrypted_payload(encrypted)
    except StorageError as exc:
        logger.exception("Could not pin encrypted report to the configured IPFS node.")
        return Response(
            {"error": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    record.ipfs_cid = cid
    from django.core.files.base import ContentFile

    record.encrypted_file.save(
        f"{record.id}.bin",
        ContentFile(encrypted),
        save=False,
    )
    record.save()
    try:
        _record_event(record, patient_name, "uploaded", {"ipfs_cid": cid})
    except (BlockchainError, OSError, ValueError) as exc:
        logger.exception("Could not record upload audit event.")
        return Response(
            {"error": f"Record saved but audit logging failed: {exc}", "record_id": str(record.id)},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    return Response(RecordSerializer(record).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@parser_classes([JSONParser])
def access_record(request, record_id):
    try:
        record = MedicalRecord.objects.get(id=record_id)
        doctor = Doctor.objects.get(id=request.data.get("doctor_id"))
    except (MedicalRecord.DoesNotExist, Doctor.DoesNotExist, TypeError, ValueError):
        return Response({"error": "Record or doctor was not found."}, status=status.HTTP_404_NOT_FOUND)

    if not doctor.verified or record.revoked or not policy_allows(record.policy, doctor.attributes):
        try:
            _record_event(
                record,
                doctor.name,
                "access_denied",
                {"reason": "unverified, revoked, or policy mismatch"},
            )
        except (BlockchainError, OSError, ValueError) as exc:
            logger.exception("Could not record denied-access audit event.")
            return Response({"error": f"Audit logging failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"error": "Access denied by record policy."}, status=status.HTTP_403_FORBIDDEN)

    try:
        if record.ipfs_cid:
            payload = fetch_encrypted_payload(record.ipfs_cid)
        else:
            with record.encrypted_file.open("rb") as encrypted_file:
                payload = encrypted_file.read()
        plaintext = decrypt_file(record.id, payload)
        _record_event(record, doctor.name, "access_granted")
    except (BlockchainError, InvalidTag, OSError, StorageError, ValueError) as exc:
        logger.exception("Could not retrieve, decrypt, or audit the record.")
        return Response(
            {"error": f"Record access failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    content_type = mimetypes.guess_type(record.title)[0] or "application/octet-stream"
    response = HttpResponse(plaintext, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{get_valid_filename(Path(record.title).name)}"'
    response["Cache-Control"] = "no-store"
    return response


@api_view(["POST"])
@parser_classes([JSONParser])
def revoke_record(request, record_id):
    try:
        record = MedicalRecord.objects.get(id=record_id)
    except MedicalRecord.DoesNotExist:
        return Response({"error": "Record was not found."}, status=status.HTTP_404_NOT_FOUND)
    if not record.revoked:
        record.revoked = True
        record.save(update_fields=["revoked"])
        try:
            _record_event(record, "Demo Patient", "revoked")
        except (BlockchainError, OSError, ValueError) as exc:
            logger.exception("Could not record revocation audit event.")
            return Response({"error": f"Record revoked but audit logging failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)
    return Response({"id": str(record.id), "revoked": record.revoked})


@api_view(["GET"])
def audit(request):
    events = AuditEvent.objects.select_related("record").all()[:200]
    return Response(AuditEventSerializer(events, many=True).data)
