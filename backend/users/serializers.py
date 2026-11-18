from django.contrib.auth.models import User
from rest_framework import serializers

from attribute_authority.models import Doctor
from .models import UserProfile


class DoctorBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ["id", "name", "specialty", "attributes", "verified"]


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    doctor = DoctorBriefSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "username",
            "email",
            "role",
            "full_name",
            "ethereum_address",
            "doctor",
            "created_at",
        ]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=6, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=UserProfile.ROLES, default="patient")
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    ethereum_address = serializers.CharField(max_length=42, required=False, allow_blank=True)
    specialty = serializers.CharField(max_length=120, required=False, allow_blank=True)
    attributes = serializers.ListField(
        child=serializers.CharField(max_length=120),
        required=False,
        default=list,
    )

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value
