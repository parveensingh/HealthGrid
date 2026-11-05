import uuid

from django.db import models

from attribute_authority.models import Doctor


class MedicalRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=160)
    patient_name = models.CharField(max_length=120, default="Demo Patient")
    policy = models.JSONField(default=dict)
    encrypted_file = models.FileField(upload_to="encrypted_reports/")
    ipfs_cid = models.CharField(max_length=128, blank=True)
    revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class AuditEvent(models.Model):
    ACTIONS = [
        ("uploaded", "Uploaded"),
        ("access_granted", "Access granted"),
        ("access_denied", "Access denied"),
        ("revoked", "Revoked"),
    ]

    record = models.ForeignKey(
        MedicalRecord,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    record_id_snapshot = models.CharField(max_length=36)
    actor = models.CharField(max_length=120)
    action = models.CharField(max_length=32, choices=ACTIONS)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
