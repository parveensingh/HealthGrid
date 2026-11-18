from django.contrib.auth.models import User
from django.db import models

from attribute_authority.models import Doctor


class UserProfile(models.Model):
    ROLES = [
        ("patient", "Patient"),
        ("doctor", "Doctor"),
        ("admin", "Admin"),
        ("education", "Education"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLES, default="patient")
    full_name = models.CharField(max_length=150, blank=True)
    ethereum_address = models.CharField(max_length=42, blank=True)
    doctor = models.ForeignKey(
        Doctor,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="user_profiles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
