"""
Education module views — public endpoints.
All under /api/education/ prefix.
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
    Quiz,
    QuizAttempt,
    TrainingProgram,
)


# ─────────────────────────── helpers ────────────────────────────

def _serialize_user(u):
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "institution": u.institution,
        "academic_purpose": u.academic_purpose,
        "status": u.status,
        "created_at": u.created_at,
        "verified_at": u.verified_at,
    }


def _serialize_specialty(s):
    return {"id": s.id, "name": s.name, "description": s.description, "icon": s.icon}


def _serialize_quiz(q, include_answer=False):
    data = {
        "id": q.id,
        "question": q.question,
        "option_a": q.option_a,
        "option_b": q.option_b,
        "option_c": q.option_c,
        "option_d": q.option_d,
    }
    if include_answer:
        data["correct_option"] = q.correct_option
    return data


def _serialize_case(c, include_quizzes=False):
    data = {
        "id": c.id,
        "title": c.title,
        "specialty": _serialize_specialty(c.specialty) if c.specialty else None,
        "description": c.description,
        "anonymized_content": c.anonymized_content,
        "difficulty": c.difficulty,
        "is_active": c.is_active,
        "created_at": c.created_at,
    }
    if include_quizzes:
        data["quizzes"] = [_serialize_quiz(q) for q in c.quizzes.all()]
    return data


def _serialize_dataset_request(r):
    return {
        "id": r.id,
        "requester": _serialize_user(r.requester),
        "specialty": _serialize_specialty(r.specialty) if r.specialty else None,
        "research_objective": r.research_objective,
        "status": r.status,
        "admin_note": r.admin_note,
        "created_at": r.created_at,
        "reviewed_at": r.reviewed_at,
    }


def _serialize_program(p):
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "specialty": _serialize_specialty(p.specialty) if p.specialty else None,
        "supervising_doctor": (
            {"id": p.supervising_doctor.id, "name": p.supervising_doctor.name}
            if p.supervising_doctor
            else None
        ),
        "is_active": p.is_active,
        "created_at": p.created_at,
    }


def _serialize_assignment(a):
    return {
        "id": a.id,
        "intern": _serialize_user(a.intern),
        "program": _serialize_program(a.program),
        "assigned_at": a.assigned_at,
        "completed": a.completed,
        "feedback": a.feedback,
    }


def _serialize_notification(n):
    return {
        "id": n.id,
        "user_email": n.user_email,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "created_at": n.created_at,
    }


# ─────────────────────── education users ────────────────────────

@api_view(["GET", "POST"])
def users(request):
    if request.method == "GET":
        qs = EducationUser.objects.order_by("-created_at")
        return Response([_serialize_user(u) for u in qs])

    data = request.data
    required = ["name", "email", "role"]
    for field in required:
        if not data.get(field):
            return Response({"error": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)

    if EducationUser.objects.filter(email=data["email"]).exists():
        return Response({"error": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST)

    valid_roles = [r[0] for r in EducationUser.ROLES]
    if data["role"] not in valid_roles:
        return Response({"error": f"role must be one of {valid_roles}."}, status=status.HTTP_400_BAD_REQUEST)

    user = EducationUser.objects.create(
        name=data["name"],
        email=data["email"],
        role=data["role"],
        institution=data.get("institution", ""),
        academic_purpose=data.get("academic_purpose", ""),
    )
    # Send a welcome notification
    Notification.objects.create(
        user_email=user.email,
        title="Welcome to HealthGrid Education",
        message=f"Hi {user.name}, your account is pending verification.",
    )
    return Response(_serialize_user(user), status=status.HTTP_201_CREATED)


@api_view(["GET"])
def user_detail(request, user_id):
    try:
        u = EducationUser.objects.get(pk=user_id)
    except EducationUser.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_user(u))


# ─────────────────────── specialties ────────────────────────────

@api_view(["GET"])
def specialties(request):
    qs = MedicalSpecialty.objects.order_by("name")
    return Response([_serialize_specialty(s) for s in qs])


# ─────────────────────── case studies ───────────────────────────

@api_view(["GET"])
def cases(request):
    qs = CaseStudy.objects.filter(is_active=True).select_related("specialty").order_by("-created_at")
    specialty_param = request.query_params.get("specialty")
    difficulty_param = request.query_params.get("difficulty")
    if specialty_param:
        qs = qs.filter(specialty__name__icontains=specialty_param)
    if difficulty_param:
        qs = qs.filter(difficulty=difficulty_param)
    return Response([_serialize_case(c) for c in qs])


@api_view(["GET"])
def case_detail(request, case_id):
    try:
        c = CaseStudy.objects.select_related("specialty").get(pk=case_id, is_active=True)
    except CaseStudy.DoesNotExist:
        return Response({"error": "Case study not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_case(c, include_quizzes=True))


# ─────────────────────── quiz attempt ───────────────────────────

@api_view(["POST"])
def quiz_attempt(request):
    data = request.data
    for field in ["user_id", "quiz_id", "selected_option"]:
        if data.get(field) is None:
            return Response({"error": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = EducationUser.objects.get(pk=data["user_id"])
        quiz = Quiz.objects.get(pk=data["quiz_id"])
    except EducationUser.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    except Quiz.DoesNotExist:
        return Response({"error": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

    selected = str(data["selected_option"]).lower()
    if selected not in ("a", "b", "c", "d"):
        return Response({"error": "selected_option must be a, b, c, or d."}, status=status.HTTP_400_BAD_REQUEST)

    is_correct = selected == quiz.correct_option.lower()
    attempt = QuizAttempt.objects.create(
        user=user,
        quiz=quiz,
        selected_option=selected,
        is_correct=is_correct,
    )
    return Response(
        {
            "id": attempt.id,
            "is_correct": is_correct,
            "correct_option": quiz.correct_option,
            "attempted_at": attempt.attempted_at,
        },
        status=status.HTTP_201_CREATED,
    )


# ─────────────────────── progress ───────────────────────────────

@api_view(["GET"])
def user_progress(request, user_id):
    try:
        user = EducationUser.objects.get(pk=user_id)
    except EducationUser.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    attempts = QuizAttempt.objects.filter(user=user).select_related("quiz__case_study")
    total = attempts.count()
    correct = attempts.filter(is_correct=True).count()

    # Group by case study
    case_stats = {}
    for a in attempts:
        cs_id = a.quiz.case_study_id
        cs_title = a.quiz.case_study.title
        if cs_id not in case_stats:
            case_stats[cs_id] = {"case_id": cs_id, "title": cs_title, "total": 0, "correct": 0}
        case_stats[cs_id]["total"] += 1
        if a.is_correct:
            case_stats[cs_id]["correct"] += 1

    return Response(
        {
            "user_id": user_id,
            "total_attempts": total,
            "total_correct": correct,
            "accuracy_pct": round(correct / total * 100, 1) if total else 0,
            "by_case": list(case_stats.values()),
        }
    )


# ─────────────────────── dataset requests ───────────────────────

@api_view(["GET", "POST"])
def dataset_requests(request):
    if request.method == "GET":
        qs = DatasetRequest.objects.select_related("requester", "specialty").order_by("-created_at")
        # Optional filter by requester
        requester_id = request.query_params.get("requester_id")
        if requester_id:
            qs = qs.filter(requester_id=requester_id)
        return Response([_serialize_dataset_request(r) for r in qs])

    data = request.data
    for field in ["requester_id", "research_objective"]:
        if not data.get(field):
            return Response({"error": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        requester = EducationUser.objects.get(pk=data["requester_id"])
    except EducationUser.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    specialty = None
    if data.get("specialty_id"):
        try:
            specialty = MedicalSpecialty.objects.get(pk=data["specialty_id"])
        except MedicalSpecialty.DoesNotExist:
            return Response({"error": "Specialty not found."}, status=status.HTTP_404_NOT_FOUND)

    dr = DatasetRequest.objects.create(
        requester=requester,
        specialty=specialty,
        research_objective=data["research_objective"],
    )
    return Response(_serialize_dataset_request(dr), status=status.HTTP_201_CREATED)


@api_view(["GET"])
def dataset_request_detail(request, request_id):
    try:
        r = DatasetRequest.objects.select_related("requester", "specialty").get(pk=request_id)
    except DatasetRequest.DoesNotExist:
        return Response({"error": "Dataset request not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_dataset_request(r))


# ─────────────────────── training programs ──────────────────────

@api_view(["GET"])
def programs(request):
    qs = TrainingProgram.objects.filter(is_active=True).select_related("specialty", "supervising_doctor").order_by("-created_at")
    return Response([_serialize_program(p) for p in qs])


# ─────────────────────── intern assignments ──────────────────────

@api_view(["GET", "POST"])
def intern_assignments(request):
    if request.method == "GET":
        qs = InternAssignment.objects.select_related("intern", "program").order_by("-assigned_at")
        intern_id = request.query_params.get("intern_id")
        if intern_id:
            qs = qs.filter(intern_id=intern_id)
        return Response([_serialize_assignment(a) for a in qs])

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


# ─────────────────────── notifications ──────────────────────────

@api_view(["GET"])
def notifications_for_user(request, email):
    qs = Notification.objects.filter(user_email=email).order_by("-created_at")
    return Response([_serialize_notification(n) for n in qs])


@api_view(["POST"])
def mark_notification_read(request, notif_id):
    try:
        n = Notification.objects.get(pk=notif_id)
    except Notification.DoesNotExist:
        return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
    n.is_read = True
    n.save(update_fields=["is_read"])
    return Response(_serialize_notification(n))
