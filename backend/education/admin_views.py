"""
Education module — admin-only views.
All under /api/admin/education/ prefix.
Checks X-Admin: true header (simple header-based guard, no real auth).
"""
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import (
    CaseStudy,
    DatasetRequest,
    EducationUser,
    InternAssignment,
    MedicalSpecialty,
    Notification,
    TrainingProgram,
)
from .views import (
    _serialize_assignment,
    _serialize_dataset_request,
    _serialize_program,
    _serialize_specialty,
    _serialize_user,
)


def _require_admin(request):
    """Return error Response if request is not from admin, else None."""
    if request.headers.get("X-Admin", "").lower() != "true":
        return Response({"error": "Admin access required (X-Admin: true header missing)."}, status=status.HTTP_403_FORBIDDEN)
    return None


# ─────────────────────── admin: users ───────────────────────────

@api_view(["GET"])
def admin_users(request):
    err = _require_admin(request)
    if err:
        return err
    qs = EducationUser.objects.order_by("-created_at")
    status_filter = request.query_params.get("status")
    role_filter = request.query_params.get("role")
    if status_filter:
        qs = qs.filter(status=status_filter)
    if role_filter:
        qs = qs.filter(role=role_filter)
    return Response([_serialize_user(u) for u in qs])


@api_view(["POST"])
def admin_verify_user(request, user_id):
    err = _require_admin(request)
    if err:
        return err
    try:
        u = EducationUser.objects.get(pk=user_id)
    except EducationUser.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    u.status = "verified"
    u.verified_at = timezone.now()
    u.save(update_fields=["status", "verified_at"])
    Notification.objects.create(
        user_email=u.email,
        title="Account Verified",
        message="Your HealthGrid Education account has been verified. You now have full access.",
    )
    return Response(_serialize_user(u))


@api_view(["POST"])
def admin_reject_user(request, user_id):
    err = _require_admin(request)
    if err:
        return err
    try:
        u = EducationUser.objects.get(pk=user_id)
    except EducationUser.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    u.status = "rejected"
    u.save(update_fields=["status"])
    reason = request.data.get("reason", "")
    Notification.objects.create(
        user_email=u.email,
        title="Account Rejected",
        message=f"Your HealthGrid Education account was rejected.{' Reason: ' + reason if reason else ''}",
    )
    return Response(_serialize_user(u))


# ─────────────────────── admin: dataset requests ─────────────────

@api_view(["GET"])
def admin_dataset_requests(request):
    err = _require_admin(request)
    if err:
        return err
    qs = DatasetRequest.objects.select_related("requester", "specialty").order_by("-created_at")
    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)
    return Response([_serialize_dataset_request(r) for r in qs])


@api_view(["POST"])
def admin_approve_dataset_request(request, request_id):
    err = _require_admin(request)
    if err:
        return err
    try:
        r = DatasetRequest.objects.select_related("requester").get(pk=request_id)
    except DatasetRequest.DoesNotExist:
        return Response({"error": "Dataset request not found."}, status=status.HTTP_404_NOT_FOUND)
    r.status = "approved"
    r.reviewed_at = timezone.now()
    r.admin_note = request.data.get("admin_note", "")
    r.save(update_fields=["status", "reviewed_at", "admin_note"])
    Notification.objects.create(
        user_email=r.requester.email,
        title="Dataset Request Approved",
        message="Your dataset request has been approved.",
    )
    return Response(_serialize_dataset_request(r))


@api_view(["POST"])
def admin_reject_dataset_request(request, request_id):
    err = _require_admin(request)
    if err:
        return err
    try:
        r = DatasetRequest.objects.select_related("requester").get(pk=request_id)
    except DatasetRequest.DoesNotExist:
        return Response({"error": "Dataset request not found."}, status=status.HTTP_404_NOT_FOUND)
    r.status = "rejected"
    r.reviewed_at = timezone.now()
    r.admin_note = request.data.get("admin_note", "")
    r.save(update_fields=["status", "reviewed_at", "admin_note"])
    Notification.objects.create(
        user_email=r.requester.email,
        title="Dataset Request Rejected",
        message=f"Your dataset request was rejected.{' Note: ' + r.admin_note if r.admin_note else ''}",
    )
    return Response(_serialize_dataset_request(r))


# ─────────────────────── admin: programs ────────────────────────

@api_view(["GET", "POST"])
def admin_programs(request):
    err = _require_admin(request)
    if err:
        return err

    if request.method == "GET":
        qs = TrainingProgram.objects.select_related("specialty", "supervising_doctor").order_by("-created_at")
        return Response([_serialize_program(p) for p in qs])

    data = request.data
    for field in ["name", "description"]:
        if not data.get(field):
            return Response({"error": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)

    specialty = None
    if data.get("specialty_id"):
        try:
            specialty = MedicalSpecialty.objects.get(pk=data["specialty_id"])
        except MedicalSpecialty.DoesNotExist:
            return Response({"error": "Specialty not found."}, status=status.HTTP_404_NOT_FOUND)

    from attribute_authority.models import Doctor
    supervising_doctor = None
    if data.get("supervising_doctor_id"):
        try:
            supervising_doctor = Doctor.objects.get(pk=data["supervising_doctor_id"])
        except Doctor.DoesNotExist:
            return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

    program = TrainingProgram.objects.create(
        name=data["name"],
        description=data["description"],
        specialty=specialty,
        supervising_doctor=supervising_doctor,
        is_active=data.get("is_active", True),
    )
    return Response(_serialize_program(program), status=status.HTTP_201_CREATED)


# ─────────────────────── admin: intern assignments ───────────────

@api_view(["POST"])
def admin_intern_assignments(request):
    err = _require_admin(request)
    if err:
        return err

    data = request.data
    for field in ["intern_id", "program_id"]:
        if not data.get(field):
            return Response({"error": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        intern = EducationUser.objects.get(pk=data["intern_id"], role="intern")
    except EducationUser.DoesNotExist:
        return Response({"error": "Intern user not found."}, status=status.HTTP_404_NOT_FOUND)
    try:
        program = TrainingProgram.objects.get(pk=data["program_id"])
    except TrainingProgram.DoesNotExist:
        return Response({"error": "Training program not found."}, status=status.HTTP_404_NOT_FOUND)

    assignment = InternAssignment.objects.create(intern=intern, program=program)
    return Response(_serialize_assignment(assignment), status=status.HTTP_201_CREATED)


# ─────────────────────── admin: analytics ───────────────────────

@api_view(["GET"])
def admin_analytics(request):
    err = _require_admin(request)
    if err:
        return err

    from django.db.models import Count

    users_by_role = {
        item["role"]: item["count"]
        for item in EducationUser.objects.values("role").annotate(count=Count("id"))
    }
    users_by_status = {
        item["status"]: item["count"]
        for item in EducationUser.objects.values("status").annotate(count=Count("id"))
    }
    dataset_requests_by_status = {
        item["status"]: item["count"]
        for item in DatasetRequest.objects.values("status").annotate(count=Count("id"))
    }

    return Response(
        {
            "total_users": EducationUser.objects.count(),
            "users_by_role": users_by_role,
            "users_by_status": users_by_status,
            "total_case_studies": CaseStudy.objects.filter(is_active=True).count(),
            "total_specialties": MedicalSpecialty.objects.count(),
            "total_dataset_requests": DatasetRequest.objects.count(),
            "dataset_requests_by_status": dataset_requests_by_status,
            "total_programs": TrainingProgram.objects.count(),
            "total_intern_assignments": InternAssignment.objects.count(),
        }
    )
