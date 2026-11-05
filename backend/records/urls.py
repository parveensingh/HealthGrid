from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("doctors/", views.doctors),
    path("records/", views.records),
    path("records/<uuid:record_id>/access/", views.access_record),
    path("records/<uuid:record_id>/revoke/", views.revoke_record),
    path("audit/", views.audit),
]
