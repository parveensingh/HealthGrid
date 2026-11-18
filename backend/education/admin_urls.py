from django.urls import path
from . import admin_views

urlpatterns = [
    # Users admin
    path("users/", admin_views.admin_users, name="admin-edu-users"),
    path("users/<int:user_id>/verify/", admin_views.admin_verify_user, name="admin-edu-verify-user"),
    path("users/<int:user_id>/reject/", admin_views.admin_reject_user, name="admin-edu-reject-user"),
    # Dataset requests admin
    path("dataset-requests/", admin_views.admin_dataset_requests, name="admin-edu-dataset-requests"),
    path("dataset-requests/<int:request_id>/approve/", admin_views.admin_approve_dataset_request, name="admin-edu-approve-request"),
    path("dataset-requests/<int:request_id>/reject/", admin_views.admin_reject_dataset_request, name="admin-edu-reject-request"),
    # Programs admin
    path("programs/", admin_views.admin_programs, name="admin-edu-programs"),
    # Intern assignments admin
    path("intern-assignments/", admin_views.admin_intern_assignments, name="admin-edu-intern-assignments"),
    # Analytics
    path("analytics/", admin_views.admin_analytics, name="admin-edu-analytics"),
]
