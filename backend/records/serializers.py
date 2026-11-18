from rest_framework import serializers

from .models import AuditEvent, BlockchainTransaction, MedicalRecord


class RecordSerializer(serializers.ModelSerializer):
    granted_doctor_ids = serializers.PrimaryKeyRelatedField(
        source="granted_doctors",
        many=True,
        read_only=True,
    )
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = (
            "id",
            "title",
            "patient_name",
            "policy",
            "ipfs_cid",
            "storage_backend",
            "file_size",
            "content_type",
            "revoked",
            "consent_granted",
            "on_chain_tx",
            "granted_doctor_ids",
            "is_owner",
            "created_at",
            "updated_at",
        )

    def get_is_owner(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return obj.owner_id == request.user.id
        return False


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = (
            "id",
            "record_id_snapshot",
            "actor",
            "action",
            "details",
            "tx_hash",
            "created_at",
        )


class BlockchainTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockchainTransaction
        fields = (
            "id",
            "record",
            "contract_name",
            "function_name",
            "args_json",
            "tx_hash",
            "status",
            "error_message",
            "created_at",
            "updated_at",
        )
