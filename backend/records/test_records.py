import tempfile

from cryptography.exceptions import InvalidTag
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from attribute_authority.models import Doctor
from users.models import UserProfile
from .crypto import decrypt_file, encrypt_file
from .models import MedicalRecord
from .policy import policy_allows, validate_policy


class FileEncryptionTests(TestCase):
    def test_encrypted_payload_round_trips_and_rejects_tampering(self):
        record_id = "record-123"
        plaintext = b"Confidential Medical Record EHR 2026"
        ciphertext = encrypt_file(record_id, plaintext)

        self.assertNotEqual(ciphertext, plaintext)
        self.assertTrue(ciphertext.startswith(b"HG02"))
        self.assertEqual(decrypt_file(record_id, ciphertext), plaintext)

        # Tampered ciphertext must fail authentication tag check
        with self.assertRaises(InvalidTag):
            decrypt_file(record_id, ciphertext[:-1] + bytes([ciphertext[-1] ^ 1]))

    def test_record_id_binding_prevents_ciphertext_swapping(self):
        rec_a = "record-aaa"
        rec_b = "record-bbb"
        ciphertext_a = encrypt_file(rec_a, b"Report for Patient A")

        # Attempting to decrypt with different record_id must fail AAD check
        with self.assertRaises(InvalidTag):
            decrypt_file(rec_b, ciphertext_a)


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
class RecordApiSecurityTests(TestCase):
    def setUp(self):
        self.temp_media = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_media.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.temp_media.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

        self.client = APIClient()

        # 1. Patient Alice
        self.patient = User.objects.create_user(
            username="alice",
            password="Password123!",
            email="alice@test.local",
        )
        UserProfile.objects.create(user=self.patient, role="patient", full_name="Alice Johnson")

        # 2. Patient Bob
        self.bob = User.objects.create_user(
            username="bob",
            password="Password123!",
            email="bob@test.local",
        )
        UserProfile.objects.create(user=self.bob, role="patient", full_name="Bob Smith")

        # 3. Cardiologist
        self.cardiologist_doc = Doctor.objects.create(
            name="Dr. Cardio",
            specialty="Cardiology",
            attributes=["Role:Doctor", "Dept:Cardiology"],
            verified=True,
        )
        self.cardiologist_user = User.objects.create_user(
            username="dr_cardio",
            password="Password123!",
            email="cardio@test.local",
        )
        UserProfile.objects.create(
            user=self.cardiologist_user,
            role="doctor",
            full_name="Dr. Cardio",
            doctor=self.cardiologist_doc,
        )

        # 4. Dermatologist
        self.dermatologist_doc = Doctor.objects.create(
            name="Dr. Derm",
            specialty="Dermatology",
            attributes=["Role:Doctor", "Dept:Dermatology"],
            verified=True,
        )
        self.dermatologist_user = User.objects.create_user(
            username="dr_derm",
            password="Password123!",
            email="derm@test.local",
        )
        UserProfile.objects.create(
            user=self.dermatologist_user,
            role="doctor",
            full_name="Dr. Derm",
            doctor=self.dermatologist_doc,
        )

    def login_as(self, user):
        res = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "Password123!"},
            format="json",
        )
        token = res.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return token

    def create_record(self, user):
        self.login_as(user)
        return self.client.post(
            "/api/records/",
            {
                "title": "sample-report.txt",
                "policy": '{"all":["Role:Doctor","Dept:Cardiology"]}',
                "file": SimpleUploadedFile("sample-report.txt", b"Sensitive Cardiology Patient Data"),
            },
            format="multipart",
        )

    def test_unauthenticated_request_rejected(self):
        res = self.client.get("/api/records/")
        self.assertEqual(res.status_code, 401)

    def test_patient_upload_and_ownership_isolation(self):
        # Alice uploads a record
        res_alice = self.create_record(self.patient)
        self.assertEqual(res_alice.status_code, 201)
        record_id = res_alice.data["id"]

        # Alice sees her record
        alice_records = self.client.get("/api/records/")
        self.assertEqual(len(alice_records.data), 1)
        self.assertEqual(alice_records.data[0]["id"], record_id)

        # Bob logs in and cannot see Alice's record
        self.login_as(self.bob)
        bob_records = self.client.get("/api/records/")
        self.assertEqual(len(bob_records.data), 0)

    def test_consent_enforcement_prevents_doctor_access(self):
        res = self.create_record(self.patient)
        record_id = res.data["id"]

        # Dr. Cardio can access initially
        self.login_as(self.cardiologist_user)
        access_res = self.client.post(f"/api/records/{record_id}/access/", {}, format="json")
        self.assertEqual(access_res.status_code, 200)
        self.assertEqual(access_res.content, b"Sensitive Cardiology Patient Data")

        # Patient Alice revokes consent
        self.login_as(self.patient)
        consent_res = self.client.post(
            f"/api/records/{record_id}/consent/",
            {"consent_given": False},
            format="json",
        )
        self.assertEqual(consent_res.status_code, 200)
        self.assertEqual(consent_res.data["consent_granted"], False)

        # Dr. Cardio tries to access again — must be rejected with 403
        self.login_as(self.cardiologist_user)
        denied_res = self.client.post(f"/api/records/{record_id}/access/", {}, format="json")
        self.assertEqual(denied_res.status_code, 403)
        self.assertIn("consent", denied_res.data["error"].lower())

    def test_unauthorized_user_cannot_alter_consent(self):
        res = self.create_record(self.patient)
        record_id = res.data["id"]

        # Bob attempts to change Alice's record consent
        self.login_as(self.bob)
        hack_res = self.client.post(
            f"/api/records/{record_id}/consent/",
            {"consent_given": False},
            format="json",
        )
        self.assertEqual(hack_res.status_code, 403)

    def test_revocation_permanently_blocks_access(self):
        res = self.create_record(self.patient)
        record_id = res.data["id"]

        # Patient revokes record
        self.login_as(self.patient)
        rev_res = self.client.post(f"/api/records/{record_id}/revoke/", {}, format="json")
        self.assertEqual(rev_res.status_code, 200)
        self.assertEqual(rev_res.data["revoked"], True)

        # Doctor access must be blocked
        self.login_as(self.cardiologist_user)
        denied = self.client.post(f"/api/records/{record_id}/access/", {}, format="json")
        self.assertEqual(denied.status_code, 403)

    def test_policy_denies_unauthorized_specialty(self):
        res = self.create_record(self.patient)
        record_id = res.data["id"]

        # Dermatologist is denied because policy specifies Dept:Cardiology
        self.login_as(self.dermatologist_user)
        denied = self.client.post(f"/api/records/{record_id}/access/", {}, format="json")
        self.assertEqual(denied.status_code, 403)
