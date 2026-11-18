import uuid
from django.contrib.auth.models import User
from django.db import models

from attribute_authority.models import Doctor


class MedicalRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="medical_records",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=160)
    patient_name = models.CharField(max_length=120, default="Demo Patient")
    policy = models.JSONField(default=dict)
    encrypted_file = models.FileField(upload_to="encrypted_reports/")
    ipfs_cid = models.CharField(max_length=128, blank=True)
    storage_backend = models.CharField(max_length=32, default="local_encrypted")
    file_size = models.PositiveIntegerField(default=0)
    content_type = models.CharField(max_length=120, default="application/octet-stream")
    revoked = models.BooleanField(default=False)
    consent_granted = models.BooleanField(default=True)
    on_chain_tx = models.CharField(max_length=66, blank=True)
    granted_doctors = models.ManyToManyField(
        Doctor,
        blank=True,
        related_name="explicitly_granted_records",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.patient_name})"


class AuditEvent(models.Model):
    ACTIONS = [
        ("uploaded", "Uploaded"),
        ("access_granted", "Access granted"),
        ("access_denied", "Access denied"),
        ("revoked", "Revoked"),
        ("consent_withdrawn", "Consent withdrawn"),
        ("consent_granted", "Consent granted"),
        ("emergency_access", "Emergency access used"),
        ("doctor_grant_added", "Doctor access granted"),
        ("doctor_grant_removed", "Doctor access revoked"),
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
    tx_hash = models.CharField(max_length=66, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.action}] Record: {self.record_id_snapshot} by {self.actor}"


class BlockchainTransaction(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("failed", "Failed"),
        ("skipped", "Skipped (Offline)"),
    ]
    record = models.ForeignKey(
        MedicalRecord,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="blockchain_txs",
    )
    contract_name = models.CharField(max_length=64)
    function_name = models.CharField(max_length=64)
    args_json = models.TextField(default="[]")
    tx_hash = models.CharField(max_length=66, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contract_name}.{self.function_name} [{self.status}]"
