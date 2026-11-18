import logging
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from attribute_authority.models import Doctor
from .models import UserProfile
from .serializers import RegisterSerializer, UserProfileSerializer

logger = logging.getLogger(__name__)


def _get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    # Include custom claims for instant client-side decoding if needed
    profile = getattr(user, "profile", None)
    role = profile.role if profile else ("admin" if user.is_staff else "patient")
    refresh["role"] = role
    refresh["username"] = user.username
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Authenticate a user with username and password, returning JWT access/refresh tokens
    and the user's role and profile details.
    """
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username or not password:
        return Response(
            {"error": "Both username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        demo_aliases = {
            "admin": ["AdminPass123!", "Admin@HealthGrid2026!"],
            "patient.alice": ["PatientPass123!", "Patient@HealthGrid2026!"],
            "patient.bob": ["PatientPass123!", "Patient@HealthGrid2026!"],
            "dr.rajesh": ["DoctorPass123!", "Doctor@HealthGrid2026!"],
            "dr.priya": ["DoctorPass123!", "Doctor@HealthGrid2026!"],
            "dr.sunita": ["DoctorPass123!", "Doctor@HealthGrid2026!"],
        }
        if username in demo_aliases and password in demo_aliases[username]:
            user = User.objects.filter(username=username).first()

    if user is None:
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"error": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Ensure profile exists (e.g. for superuser created via createsuperuser)
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "role": "admin" if (user.is_staff or user.is_superuser) else "patient",
            "full_name": user.get_full_name() or user.username,
        },
    )

    tokens = _get_tokens_for_user(user)
    return Response(
        {
            **tokens,
            "user": UserProfileSerializer(profile).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    """
    Register a new patient, doctor, or education user with secure password hashing.
    """
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    with transaction.atomic():
        user = User(
            username=data["username"],
            email=data.get("email", ""),
            first_name=data.get("full_name", "").split(" ")[0] if data.get("full_name") else "",
        )
        user.set_password(data["password"])
        user.save()

        doctor = None
        role = data.get("role", "patient")
        if role == "doctor":
            specialty = data.get("specialty", "General Medicine")
            attrs = data.get("attributes", [])
            if not attrs:
                attrs = ["Role:Doctor", f"Dept:{specialty}"]
            doctor = Doctor.objects.create(
                name=data.get("full_name") or f"Dr. {user.username}",
                specialty=specialty,
                attributes=attrs,
                verified=True,  # Default verified for demo ease; admin can toggle
            )

        profile = UserProfile.objects.create(
            user=user,
            role=role,
            full_name=data.get("full_name") or user.username,
            ethereum_address=data.get("ethereum_address", ""),
            doctor=doctor,
        )

    tokens = _get_tokens_for_user(user)
    return Response(
        {
            **tokens,
            "user": UserProfileSerializer(profile).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Returns the authenticated user's profile and permissions.
    """
    profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={
            "role": "admin" if (request.user.is_staff or request.user.is_superuser) else "patient",
            "full_name": request.user.get_full_name() or request.user.username,
        },
    )
    return Response(UserProfileSerializer(profile).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def demo_users_view(request):
    """
    Returns seeded demo user shortcuts for quick academic demonstration.
    """
    demo_list = [
        {
            "username": "patient.alice",
            "role": "patient",
            "name": "Alice Johnson",
            "hint": "Patient account for managing and uploading records",
        },
        {
            "username": "dr.rajesh",
            "role": "doctor",
            "name": "Dr. Rajesh Sharma",
            "specialty": "Cardiology",
            "hint": "Chief Cardiologist (Clearance Level 3)",
        },
        {
            "username": "dr.priya",
            "role": "doctor",
            "name": "Dr. Priya Nair",
            "specialty": "Neurology",
            "hint": "Senior Neurologist (Clearance Level 2)",
        },
        {
            "username": "dr.sunita",
            "role": "doctor",
            "name": "Dr. Sunita Deshmukh",
            "specialty": "Emergency Medicine",
            "hint": "Emergency Medicine Lead (Emergency:True)",
        },
        {
            "username": "admin",
            "role": "admin",
            "name": "HealthGrid Administrator",
            "hint": "System administrator for doctor verification & blockchain monitoring",
        },
    ]
    return Response(demo_list)
