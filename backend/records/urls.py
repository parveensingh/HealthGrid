from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("doctors/", views.doctors, name="doctors"),
    path("records/", views.records, name="records"),
    path("records/<uuid:record_id>/access/", views.access_record, name="access_record"),
    path("records/<uuid:record_id>/revoke/", views.revoke_record, name="revoke_record"),
    path("records/<uuid:record_id>/history/", views.record_history, name="record_history"),
    path("records/<uuid:record_id>/consent/", views.record_consent, name="record_consent"),
    path("records/<uuid:record_id>/grant-doctor/", views.toggle_doctor_grant, name="toggle_doctor_grant"),
    path("audit/", views.audit, name="audit"),
    path("blockchain/transactions/", views.blockchain_transactions, name="blockchain_transactions"),
]
