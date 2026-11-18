from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("doctors/", views.doctors),
    path("records/", views.records),
    path("records/<uuid:record_id>/access/", views.access_record),
    path("records/<uuid:record_id>/revoke/", views.revoke_record),
    path("records/<uuid:record_id>/history/", views.record_history),
    path("records/<uuid:record_id>/consent/", views.record_consent),
    path("audit/", views.audit),
]
