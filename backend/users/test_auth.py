from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from attribute_authority.models import Doctor
from users.models import UserProfile


class AuthenticationAndRoleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_user(
            username="admin_test",
            password="Password123!",
            email="admin@test.local",
            is_staff=True,
        )
        UserProfile.objects.create(user=self.admin_user, role="admin", full_name="Admin Test")

        # Create Patient
        self.patient_user = User.objects.create_user(
            username="patient_test",
            password="Password123!",
            email="patient@test.local",
        )
        UserProfile.objects.create(user=self.patient_user, role="patient", full_name="Patient Test")

        # Create Doctor
        self.doctor_model = Doctor.objects.create(
            name="Dr. Tester",
            specialty="Cardiology",
            attributes=["Role:Doctor", "Dept:Cardiology"],
            verified=True,
        )
        self.doctor_user = User.objects.create_user(
            username="doctor_test",
            password="Password123!",
            email="doctor@test.local",
        )
        UserProfile.objects.create(
            user=self.doctor_user,
            role="doctor",
            full_name="Dr. Tester",
            doctor=self.doctor_model,
        )

    def test_user_login_success_and_jwt_generation(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "patient_test", "password": "Password123!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["role"], "patient")

    def test_user_login_invalid_password_rejected(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "patient_test", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(res.status_code, 401)

    def test_user_registration_creates_hashed_password(self):
        res = self.client.post(
            "/api/auth/register/",
            {
                "username": "new_patient",
                "password": "SecurePassword123!",
                "email": "new@patient.local",
                "role": "patient",
                "full_name": "New Patient",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("access", res.data)

        # Verify password is not stored plaintext
        created_user = User.objects.get(username="new_patient")
        self.assertNotEqual(created_user.password, "SecurePassword123!")
        self.assertTrue(created_user.check_password("SecurePassword123!"))

    def test_me_endpoint_requires_jwt(self):
        unauth = self.client.get("/api/auth/me/")
        self.assertEqual(unauth.status_code, 401)

        # Authenticate with token
        login = self.client.post(
            "/api/auth/login/",
            {"username": "patient_test", "password": "Password123!"},
            format="json",
        )
        token = login.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        auth = self.client.get("/api/auth/me/")
        self.assertEqual(auth.status_code, 200)
        self.assertEqual(auth.data["username"], "patient_test")
