import tempfile

from cryptography.exceptions import InvalidTag
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from attribute_authority.models import Doctor
from .crypto import decrypt_file, encrypt_file
from .models import MedicalRecord
from .policy import policy_allows, validate_policy


class FileEncryptionTests(TestCase):
    def test_encrypted_payload_round_trips_and_rejects_tampering(self):
        record_id = "record-123"
        plaintext = b"private sample report"
        ciphertext = encrypt_file(record_id, plaintext)

        self.assertNotEqual(ciphertext, plaintext)
        self.assertEqual(decrypt_file(record_id, ciphertext), plaintext)
        with self.assertRaises(InvalidTag):
            decrypt_file(record_id, ciphertext[:-1] + bytes([ciphertext[-1] ^ 1]))


class PolicyTests(TestCase):
    def test_nested_policy_supports_all_and_any(self):
        policy = validate_policy(
            {"any": [{"all": ["Role:Doctor", "Dept:Cardiology"]}, "Emergency:True"]}
        )

        self.assertTrue(policy_allows(policy, ["Role:Doctor", "Dept:Cardiology"]))
        self.assertTrue(policy_allows(policy, ["Emergency:True"]))
        self.assertFalse(policy_allows(policy, ["Role:Doctor", "Dept:Dermatology"]))

    def test_rejects_empty_or_malformed_policy(self):
        with self.assertRaises(ValueError):
            validate_policy({"all": []})
        with self.assertRaises(ValueError):
            validate_policy({"or": ["Role:Doctor"]})


@override_settings(BLOCKCHAIN_RPC_URL="", KUBO_API_URL="")
class RecordApiTests(TestCase):
    def setUp(self):
        self.temp_media = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_media.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.temp_media.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.client = APIClient()
        self.cardiologist = Doctor.objects.create(
            name="Dr. Cardio",
            specialty="Cardiology",
            attributes=["Role:Doctor", "Dept:Cardiology"],
        )
        self.dermatologist = Doctor.objects.create(
            name="Dr. Derm",
            specialty="Dermatology",
            attributes=["Role:Doctor", "Dept:Dermatology"],
        )

    def create_record(self):
        return self.client.post(
            "/api/records/",
            {
                "title": "sample-report.txt",
                "patient_name": "Demo Patient",
                "policy": '{"all":["Role:Doctor","Dept:Cardiology"]}',
                "file": SimpleUploadedFile("sample-report.txt", b"sample medical report"),
            },
            format="multipart",
        )

    def test_upload_encrypts_and_authorized_doctor_can_download(self):
        upload = self.create_record()
        self.assertEqual(upload.status_code, 201, upload.data)

        record = MedicalRecord.objects.get(id=upload.data["id"])
        with record.encrypted_file.open("rb") as stored:
            self.assertNotEqual(stored.read(), b"sample medical report")

        response = self.client.post(
            f"/api/records/{record.id}/access/",
            {"doctor_id": self.cardiologist.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"sample medical report")
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_policy_denies_other_doctor_and_revocation_denies_authorized_doctor(self):
        upload = self.create_record()
        record_id = upload.data["id"]

        denied = self.client.post(
            f"/api/records/{record_id}/access/",
            {"doctor_id": self.dermatologist.id},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        revoked = self.client.post(f"/api/records/{record_id}/revoke/", {}, format="json")
        self.assertEqual(revoked.status_code, 200)
        denied_after_revoke = self.client.post(
            f"/api/records/{record_id}/access/",
            {"doctor_id": self.cardiologist.id},
            format="json",
        )
        self.assertEqual(denied_after_revoke.status_code, 403)
