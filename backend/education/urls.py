from django.urls import path
from . import views

urlpatterns = [
    # Users
    path("users/", views.users, name="edu-users"),
    path("users/<int:user_id>/", views.user_detail, name="edu-user-detail"),
    # Specialties
    path("specialties/", views.specialties, name="edu-specialties"),
    # Case studies
    path("cases/", views.cases, name="edu-cases"),
    path("cases/<int:case_id>/", views.case_detail, name="edu-case-detail"),
    # Quizzes
    path("quiz-attempt/", views.quiz_attempt, name="edu-quiz-attempt"),
    path("progress/<int:user_id>/", views.user_progress, name="edu-progress"),
    # Dataset requests
    path("dataset-requests/", views.dataset_requests, name="edu-dataset-requests"),
    path("dataset-requests/<int:request_id>/", views.dataset_request_detail, name="edu-dataset-request-detail"),
    # Training programs
    path("programs/", views.programs, name="edu-programs"),
    # Intern assignments
    path("intern-assignments/", views.intern_assignments, name="edu-intern-assignments"),
    # Notifications
    path("notifications/<str:email>/", views.notifications_for_user, name="edu-notifications"),
    path("notifications/<int:notif_id>/read/", views.mark_notification_read, name="edu-notification-read"),
]
