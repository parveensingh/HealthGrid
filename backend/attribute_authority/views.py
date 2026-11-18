"""
Attribute Authority views — doctor management and verification endpoints.
Under /api/attribute-authority/ prefix.
Protected by role-based authentication (Admin operations require IsAdmin).
"""
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsAdmin
from .models import Doctor


def _serialize_doctor(d):
    return {
        "id": d.id,
        "name": d.name,
        "specialty": d.specialty,
        "attributes": d.attributes,
        "verified": d.verified,
    }


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
def doctors_list(request):
    if request.method == "GET":
        qs = Doctor.objects.order_by("id")
        return Response([_serialize_doctor(d) for d in qs])

    # POST: Creating a new doctor identity requires Admin permissions
    if not (request.user and request.user.is_authenticated and (
        getattr(request.user, "profile", None) and request.user.profile.role == "admin"
        or request.user.is_staff or request.user.is_superuser
    )):
        return Response(
            {"error": "Administrator privileges required to register clinician identities."},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data
    for field in ["name", "specialty"]:
        if not data.get(field):
            return Response({"error": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)

    attributes = data.get("attributes", [])
    if not isinstance(attributes, list):
        return Response({"error": "attributes must be a list."}, status=status.HTTP_400_BAD_REQUEST)

    doctor = Doctor.objects.create(
        name=data["name"],
        specialty=data["specialty"],
        attributes=attributes,
        verified=data.get("verified", True),
    )
    return Response(_serialize_doctor(doctor), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def doctor_detail(request, doctor_id):
    try:
        d = Doctor.objects.get(pk=doctor_id)
    except Doctor.DoesNotExist:
        return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_doctor(d))


@api_view(["POST"])
@permission_classes([IsAdmin])
def verify_doctor(request, doctor_id):
    try:
        d = Doctor.objects.get(pk=doctor_id)
    except Doctor.DoesNotExist:
        return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
    d.verified = True
    d.save(update_fields=["verified"])
    return Response(_serialize_doctor(d))


@api_view(["POST"])
@permission_classes([IsAdmin])
def unverify_doctor(request, doctor_id):
    try:
        d = Doctor.objects.get(pk=doctor_id)
    except Doctor.DoesNotExist:
        return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)
    d.verified = False
    d.save(update_fields=["verified"])
    return Response(_serialize_doctor(d))
