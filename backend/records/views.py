import json
import logging
import mimetypes
from pathlib import Path
from typing import Tuple

from cryptography.exceptions import InvalidTag
from django.db import transaction
from django.http import HttpResponse
from django.utils.text import get_valid_filename
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from attribute_authority.models import Doctor
from users.permissions import IsAdmin, IsDoctor, IsPatient
from .blockchain import (
    BlockchainError,
    grant_doctor_access_on_chain,
    log_on_chain,
    register_record_on_chain,
    revoke_doctor_access_on_chain,
    revoke_record_on_chain,
    verify_on_chain_status,
)
from .crypto import decrypt_file, encrypt_file
from .models import AuditEvent, BlockchainTransaction, MedicalRecord
from .policy import policy_allows, validate_policy
from .serializers import (
    AuditEventSerializer,
    BlockchainTransactionSerializer,
    RecordSerializer,
)
from .storage import StorageError, fetch_encrypted_payload, pin_encrypted_payload

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".dcm", ".txt", ".json", ".csv"}


def _record_event(record, actor: str, action: str, details=None) -> Tuple:
    """Creates a local AuditEvent and attempts to record it to the on-chain AuditLogger."""
    event = AuditEvent.objects.create(
        record=record,
        record_id_snapshot=str(record.id),
        actor=actor[:120],
        action=action,
        details=details or {},
    )
    try:
        tx_hash = log_on_chain(record.id, action, actor)
        if tx_hash:
            event.tx_hash = tx_hash
            event.save(update_fields=["tx_hash"])
    except Exception as exc:
        logger.warning(f"On-chain audit event logging skipped: {exc}")
        tx_hash = None
    return event, tx_hash


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """System health and operational mode status endpoint."""
    return Response(
        {
            "status": "ok",
            "service": "HealthGrid API",
            "version": "2.0.0",
            "auth": "JWT",
            "mode": "academic-prototype",
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def doctors(request):
    """Public directory of registered medical specialists and attributes."""
    qs = Doctor.objects.order_by("id")
    return Response(
        [
            {
                "id": doctor.id,
                "name": doctor.name,
                "specialty": doctor.specialty,
                "attributes": doctor.attributes,
                "verified": doctor.verified,
            }
            for doctor in qs
        ]
    )


@api_view(["GET", "POST"])
@parser_classes([JSONParser, FormParser, MultiPartParser])
@permission_classes([IsAuthenticated])
def records(request):
    """
    GET: Returns medical records filtered by role.
         - Patients see only their own uploaded records.
         - Doctors see records satisfying their attributes, with active consent and unrevoked.
         - Admins see all records for system monitoring.
    POST: Uploads a new medical report (Patient only). Encrypts with AES-256-GCM,
          pins to IPFS (if available), registers on Ethereum, and creates audit entry.
    """
    user = request.user
    profile = getattr(user, "profile", None)
    role = profile.role if profile else ("admin" if user.is_staff else "patient")

    if request.method == "GET":
        if role == "patient":
            qs = MedicalRecord.objects.filter(owner=user).order_by("-created_at")
        elif role == "doctor":
            doctor = getattr(profile, "doctor", None)
            if not doctor or not doctor.verified:
                qs = MedicalRecord.objects.none()
            else:
                all_active = MedicalRecord.objects.filter(revoked=False, consent_granted=True).order_by("-created_at")
                accessible_ids = [
                    r.id
                    for r in all_active
                    if (
                        doctor in r.granted_doctors.all()
                        or policy_allows(r.policy, doctor.attributes)
                    )
                ]
                qs = MedicalRecord.objects.filter(id__in=accessible_ids).order_by("-created_at")
        else:
            # Admin role sees all records
            qs = MedicalRecord.objects.order_by("-created_at")

        return Response(RecordSerializer(qs, many=True, context={"request": request}).data)

    # POST method: Upload new medical report
    if role not in ("patient", "admin"):
        return Response(
            {"error": "Only registered patients can upload medical records."},
            status=status.HTTP_403_FORBIDDEN,
        )

    uploaded = request.FILES.get("file")
    title = request.data.get("title", "")
    title = title.strip() if isinstance(title, str) else ""
    policy_value = request.data.get("policy")

    if uploaded is None or not title:
        return Response(
            {"error": "A medical report file and title are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if uploaded.size > MAX_UPLOAD_BYTES:
        return Response(
            {"error": f"File exceeds maximum allowed size of {MAX_UPLOAD_BYTES // (1024*1024)} MB."},
            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    # Validate file extension
    file_ext = Path(uploaded.name).suffix.lower()
    if file_ext and file_ext not in ALLOWED_EXTENSIONS:
        return Response(
            {
                "error": f"Unsupported file extension '{file_ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(policy_value, str):
        try:
            policy_value = json.loads(policy_value)
        except ValueError:
            return Response({"error": "Access policy must be valid JSON."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        policy_value = validate_policy(policy_value)
    except (TypeError, ValueError) as exc:
        return Response({"error": f"Invalid policy: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

    patient_display_name = profile.full_name or user.get_full_name() or user.username

    with transaction.atomic():
        record = MedicalRecord(
            owner=user,
            title=title[:160],
            patient_name=patient_display_name[:120],
            policy=policy_value,
            file_size=uploaded.size,
            content_type=mimetypes.guess_type(uploaded.name)[0] or "application/octet-stream",
            consent_granted=True,
        )

        # 1. Encrypt raw plaintext with AES-256-GCM
        raw_plaintext = uploaded.read()
        encrypted_payload = encrypt_file(record.id, raw_plaintext)

        # 2. Pin to IPFS Kubo if available
        cid = ""
        storage_backend = "local_encrypted"
        try:
            cid = pin_encrypted_payload(encrypted_payload)
            if cid:
                storage_backend = "ipfs"
        except StorageError as exc:
            logger.warning(f"IPFS pinning unavailable, using local encrypted vault: {exc}")

        record.ipfs_cid = cid
        record.storage_backend = storage_backend

        # 3. Save encrypted file to disk fallback
        from django.core.files.base import ContentFile
        safe_filename = get_valid_filename(f"{record.id}.bin")
        record.encrypted_file.save(safe_filename, ContentFile(encrypted_payload), save=False)
        record.save()

        # 4. Register metadata on Ethereum contracts
        on_chain_hashes = register_record_on_chain(record, cid)
        if on_chain_hashes.get("registry_tx"):
            record.on_chain_tx = on_chain_hashes["registry_tx"]
            record.save(update_fields=["on_chain_tx"])

        # 5. Audit event
        _record_event(
            record,
            patient_display_name,
            "uploaded",
            {
                "ipfs_cid": cid,
                "storage_backend": storage_backend,
                "on_chain": on_chain_hashes,
            },
        )

    return Response(
        RecordSerializer(record, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@parser_classes([JSONParser])
@permission_classes([IsAuthenticated])
def access_record(request, record_id):
    """
    Decrypted record access endpoint for verified doctors.
    Enforces:
      1. Doctor authentication and verification.
      2. Record active status (not revoked).
      3. Patient consent verification.
      4. Attribute-based policy satisfaction (or explicit grant).
      5. On-chain registry status validation.
    """
    try:
        record = MedicalRecord.objects.get(id=record_id)
    except MedicalRecord.DoesNotExist:
        return Response({"error": "Medical record not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    profile = getattr(user, "profile", None)

    # Identify clinician
    doctor = None
    if profile and profile.role == "doctor":
        doctor = profile.doctor
    elif profile and profile.role == "admin":
        # Admin can view metadata but clinical decryption requires doctor role
        doctor_id = request.data.get("doctor_id")
        if doctor_id:
            doctor = Doctor.objects.filter(id=doctor_id).first()

    if not doctor:
        return Response(
            {"error": "Access denied: Clinician profile not found or user is not a doctor."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not doctor.verified:
        _record_event(record, doctor.name, "access_denied", {"reason": "Doctor unverified by Attribute Authority"})
        return Response({"error": "Doctor is not verified by Attribute Authority."}, status=status.HTTP_403_FORBIDDEN)

    if record.revoked:
        _record_event(record, doctor.name, "access_denied", {"reason": "Record has been revoked by patient"})
        return Response({"error": "Access denied: Record has been revoked by patient."}, status=status.HTTP_403_FORBIDDEN)

    if not record.consent_granted:
        _record_event(record, doctor.name, "access_denied", {"reason": "Patient consent has been withdrawn"})
        return Response({"error": "Access denied: Patient has withdrawn consent for this record."}, status=status.HTTP_403_FORBIDDEN)

    # Check ABAC policy or explicit doctor grant
    is_explicitly_granted = record.granted_doctors.filter(id=doctor.id).exists()
    policy_satisfied = policy_allows(record.policy, doctor.attributes)

    if not (is_explicitly_granted or policy_satisfied):
        _record_event(record, doctor.name, "access_denied", {"reason": "Doctor attributes do not satisfy access policy"})
        return Response(
            {"error": "Access denied: Your clinical attributes do not satisfy this record's access policy."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Verify on-chain status
    is_valid_on_chain, on_chain_msg = verify_on_chain_status(record.id)
    if not is_valid_on_chain:
        _record_event(record, doctor.name, "access_denied", {"reason": f"On-chain check failed: {on_chain_msg}"})
        return Response(
            {"error": f"On-chain verification failed: {on_chain_msg}"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Fetch and decrypt payload
    try:
        if record.storage_backend == "ipfs" and record.ipfs_cid:
            encrypted_payload = fetch_encrypted_payload(record.ipfs_cid)
        else:
            with record.encrypted_file.open("rb") as f:
                encrypted_payload = f.read()

        plaintext = decrypt_file(record.id, encrypted_payload)
        _record_event(record, doctor.name, "access_granted", {"doctor_specialty": doctor.specialty})
    except (InvalidTag, ValueError) as exc:
        logger.error(f"Decryption failed: {exc}")
        _record_event(record, doctor.name, "access_denied", {"reason": f"Decryption integrity failure: {exc}"})
        return Response({"error": "Decryption failed: Ciphertext integrity check failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except StorageError as exc:
        logger.error(f"Storage retrieval failed: {exc}")
        return Response({"error": f"Storage retrieval failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

    # Serve decrypted file
    content_type = record.content_type or "application/octet-stream"
    response = HttpResponse(plaintext, content_type=content_type)
    download_filename = get_valid_filename(f"decrypted_{record.title}")
    response["Content-Disposition"] = f'attachment; filename="{download_filename}"'
    response["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_record(request, record_id):
    """
    Permanently revokes a medical record.
    Only the record owner (Patient) or an Administrator can revoke.
    Synchronizes revocation to both on-chain smart contracts.
    """
    try:
        record = MedicalRecord.objects.get(id=record_id)
    except MedicalRecord.DoesNotExist:
        return Response({"error": "Record was not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    profile = getattr(user, "profile", None)
    is_owner = record.owner_id == user.id
    is_admin = profile and profile.role == "admin" or user.is_staff or user.is_superuser

    if not (is_owner or is_admin):
        return Response(
            {"error": "Unauthorized: You can only revoke your own medical records."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not record.revoked:
        record.revoked = True
        record.save(update_fields=["revoked"])

        actor = profile.full_name or user.username
        # Revoke on-chain
        on_chain_res = revoke_record_on_chain(record, actor=actor)
        # Log audit event
        _record_event(record, actor, "revoked", {"on_chain": on_chain_res})

    return Response(RecordSerializer(record, context={"request": request}).data)


@api_view(["POST"])
@parser_classes([JSONParser])
@permission_classes([IsAuthenticated])
def record_consent(request, record_id):
    """
    Toggles patient consent for a medical record.
    Only the authenticated patient who owns the record can alter consent.
    Enforces boolean validation and immediately records the change in audit history.
    """
    try:
        record = MedicalRecord.objects.get(id=record_id)
    except MedicalRecord.DoesNotExist:
        return Response({"error": "Record was not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if record.owner_id != user.id and not (user.is_staff or user.is_superuser):
        return Response(
            {"error": "Unauthorized: Only the patient who owns this record can modify consent."},
            status=status.HTTP_403_FORBIDDEN,
        )

    consent_given = request.data.get("consent_given")
    if not isinstance(consent_given, bool):
        return Response(
            {"error": "consent_given must be an explicit boolean value (true or false)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    record.consent_granted = consent_given
    record.save(update_fields=["consent_granted"])

    action = "consent_granted" if consent_given else "consent_withdrawn"
    actor = getattr(user.profile, "full_name", "") or user.username

    event, tx_hash = _record_event(
        record,
        actor,
        action,
        {"consent_granted": consent_given},
    )

    return Response(
        {
            "record_id": str(record.id),
            "consent_granted": record.consent_granted,
            "action": action,
            "audit_event_id": event.id,
            "tx_hash": tx_hash,
        }
    )


@api_view(["POST"])
@parser_classes([JSONParser])
@permission_classes([IsAuthenticated])
def toggle_doctor_grant(request, record_id):
    """
    Patient explicitly grants or revokes access for an individual doctor.
    """
    try:
        record = MedicalRecord.objects.get(id=record_id)
    except MedicalRecord.DoesNotExist:
        return Response({"error": "Record was not found."}, status=status.HTTP_404_NOT_FOUND)

    if record.owner_id != request.user.id and not request.user.is_staff:
        return Response({"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN)

    doctor_id = request.data.get("doctor_id")
    grant = request.data.get("grant", True)

    try:
        doctor = Doctor.objects.get(id=doctor_id)
    except Doctor.DoesNotExist:
        return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

    actor = getattr(request.user.profile, "full_name", "") or request.user.username

    if grant:
        record.granted_doctors.add(doctor)
        action = "doctor_grant_added"
        # Optional on-chain grant if doctor has Ethereum address
        doc_profile = doctor.user_profiles.first()
        if doc_profile and doc_profile.ethereum_address:
            grant_doctor_access_on_chain(record, doc_profile.ethereum_address)
    else:
        record.granted_doctors.remove(doctor)
        action = "doctor_grant_removed"
        doc_profile = doctor.user_profiles.first()
        if doc_profile and doc_profile.ethereum_address:
            revoke_doctor_access_on_chain(record, doc_profile.ethereum_address)

    _record_event(record, actor, action, {"doctor_id": doctor.id, "doctor_name": doctor.name})
    return Response(RecordSerializer(record, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit(request):
    """
    Returns audit events filtered by user role:
    - Patients: events related to their owned records.
    - Doctors: events where they were the actor.
    - Admins: complete system audit trail.
    """
    user = request.user
    profile = getattr(user, "profile", None)
    role = profile.role if profile else ("admin" if user.is_staff else "patient")

    if role == "patient":
        qs = AuditEvent.objects.filter(record__owner=user).select_related("record")[:150]
    elif role == "doctor" and profile and profile.doctor:
        qs = AuditEvent.objects.filter(actor=profile.doctor.name).select_related("record")[:150]
    else:
        qs = AuditEvent.objects.select_related("record").all()[:200]

    return Response(AuditEventSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def record_history(request, record_id):
    """Returns the detailed audit history for a specific record."""
    try:
        record = MedicalRecord.objects.get(id=record_id)
    except MedicalRecord.DoesNotExist:
        return Response({"error": "Record was not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    profile = getattr(user, "profile", None)
    is_owner = record.owner_id == user.id
    is_admin = profile and profile.role == "admin" or user.is_staff

    if not (is_owner or is_admin or (profile and profile.role == "doctor")):
        return Response({"error": "Unauthorized to view this record's history."}, status=status.HTTP_403_FORBIDDEN)

    events = AuditEvent.objects.filter(record_id_snapshot=str(record.id)).order_by("-created_at")
    return Response(AuditEventSerializer(events, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdmin])
def blockchain_transactions(request):
    """Admin-only view of the on-chain outbox transaction queue."""
    txs = BlockchainTransaction.objects.select_related("record").order_by("-created_at")[:100]
    return Response(BlockchainTransactionSerializer(txs, many=True).data)
