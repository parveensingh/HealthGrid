from django.urls import path
from . import views

urlpatterns = [
    path("doctors/", views.doctors_list, name="aa-doctors"),
    path("doctors/<int:doctor_id>/", views.doctor_detail, name="aa-doctor-detail"),
    path("doctors/<int:doctor_id>/verify/", views.verify_doctor, name="aa-doctor-verify"),
    path("doctors/<int:doctor_id>/unverify/", views.unverify_doctor, name="aa-doctor-unverify"),
]
