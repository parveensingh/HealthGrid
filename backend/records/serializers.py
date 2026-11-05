from rest_framework import serializers

from .models import AuditEvent, MedicalRecord


class RecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = (
            "id",
            "title",
            "patient_name",
            "policy",
            "ipfs_cid",
            "revoked",
            "created_at",
        )


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = ("id", "record_id_snapshot", "actor", "action", "details", "created_at")
