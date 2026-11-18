import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "securechain.settings")

import django

django.setup()

from django.contrib.auth.models import User
from attribute_authority.models import Doctor
from records.models import MedicalRecord
from users.models import UserProfile

DEMO_DOCTORS = [
    {
        "name": "Dr. Rajesh Sharma",
        "specialty": "Cardiology",
        "attributes": ["Role:ChiefDoctor", "Role:Doctor", "Dept:Cardiology", "Clearance:Level3"],
        "username": "dr.rajesh",
    },
    {
        "name": "Dr. Priya Nair",
        "specialty": "Neurology",
        "attributes": ["Role:SeniorDoctor", "Role:Doctor", "Dept:Neurology", "Clearance:Level2"],
        "username": "dr.priya",
    },
    {
        "name": "Dr. Aarav Patel",
        "specialty": "Oncology",
        "attributes": ["Role:Consultant", "Role:Doctor", "Dept:Oncology", "Clearance:Level2"],
        "username": "dr.aarav",
    },
    {
        "name": "Dr. Ananya Iyer",
        "specialty": "Pediatrics",
        "attributes": ["Role:Doctor", "Dept:Pediatrics", "Clearance:Level1"],
        "username": "dr.ananya",
    },
    {
        "name": "Dr. Vikramaditya Reddy",
        "specialty": "Radiology",
        "attributes": ["Role:ChiefRadiologist", "Role:Doctor", "Dept:Radiology", "Clearance:Level2"],
        "username": "dr.vikram",
    },
    {
        "name": "Dr. Sunita Deshmukh",
        "specialty": "Emergency Medicine",
        "attributes": ["Role:EmergencyLead", "Role:Doctor", "Dept:Emergency", "Emergency:True", "Clearance:Level3"],
        "username": "dr.sunita",
    },
    {
        "name": "Dr. Rohan Kapoor",
        "specialty": "Orthopedics",
        "attributes": ["Role:Surgeon", "Role:Doctor", "Dept:Orthopedics", "Clearance:Level2"],
        "username": "dr.rohan",
    },
    {
        "name": "Dr. Meera Mukherjee",
        "specialty": "Dermatology",
        "attributes": ["Role:Doctor", "Dept:Dermatology", "Clearance:Level1"],
        "username": "dr.meera",
    },
    {
        "name": "Dr. Arjun Menon",
        "specialty": "General Surgery",
        "attributes": ["Role:SeniorSurgeon", "Role:Doctor", "Dept:Surgery", "Clearance:Level3"],
        "username": "dr.arjun",
    },
    {
        "name": "Dr. Kavita Sundaram",
        "specialty": "Pathology",
        "attributes": ["Role:Pathologist", "Role:Doctor", "Dept:Pathology", "Clearance:Level2"],
        "username": "dr.kavita",
    },
    {
        "name": "Dr. Sarah Jenkins",
        "specialty": "Cardiology",
        "attributes": ["Role:Doctor", "Dept:Cardiology"],
        "username": "dr.sarah",
    },
    {
        "name": "Dr. Alex Morgan",
        "specialty": "Emergency Medicine",
        "attributes": ["Role:Doctor", "Dept:Emergency", "Emergency:True"],
        "username": "dr.alex",
    },
]

print("Seeding demo doctors and accounts...")

# 1. Seed Doctors & Doctor User Accounts
for doc_data in DEMO_DOCTORS:
    doctor, _ = Doctor.objects.update_or_create(
        name=doc_data["name"],
        defaults={
            "specialty": doc_data["specialty"],
            "attributes": doc_data["attributes"],
            "verified": True,
        },
    )
    username = doc_data["username"]
    user, created = User.objects.get_or_create(
        username=username,
        defaults={"email": f"{username}@healthgrid.local"},
    )
    user.set_password("Doctor@HealthGrid2026!")
    user.save()

    UserProfile.objects.update_or_create(
        user=user,
        defaults={
            "role": "doctor",
            "full_name": doc_data["name"],
            "doctor": doctor,
        },
    )

# 2. Seed Admin User Account
admin_user, _ = User.objects.get_or_create(
    username="admin",
    defaults={
        "email": "admin@healthgrid.local",
        "is_staff": True,
        "is_superuser": True,
    },
)
admin_user.set_password("Admin@HealthGrid2026!")
admin_user.is_staff = True
admin_user.is_superuser = True
admin_user.save()

UserProfile.objects.update_or_create(
    user=admin_user,
    defaults={
        "role": "admin",
        "full_name": "HealthGrid Administrator",
    },
)

# 3. Seed Patient User Accounts
patient_alice, _ = User.objects.get_or_create(
    username="patient.alice",
    defaults={"email": "alice.johnson@healthgrid.local"},
)
patient_alice.set_password("Patient@HealthGrid2026!")
patient_alice.save()

UserProfile.objects.update_or_create(
    user=patient_alice,
    defaults={
        "role": "patient",
        "full_name": "Alice Johnson",
    },
)

patient_bob, _ = User.objects.get_or_create(
    username="patient.bob",
    defaults={"email": "bob.smith@healthgrid.local"},
)
patient_bob.set_password("Patient@HealthGrid2026!")
patient_bob.save()

UserProfile.objects.update_or_create(
    user=patient_bob,
    defaults={
        "role": "patient",
        "full_name": "Bob Smith",
    },
)

# 4. Associate any existing unowned demo records to Alice
unowned = MedicalRecord.objects.filter(owner__isnull=True)
if unowned.exists():
    count = unowned.update(owner=patient_alice, patient_name="Alice Johnson")
    print(f"Associated {count} existing unowned records to Alice Johnson.")

print("Successfully seeded demo clinicians, users, and administrative accounts:")
print("  - Admin:   username='admin'         password='Admin@HealthGrid2026!'")
print("  - Patient: username='patient.alice' password='Patient@HealthGrid2026!'")
print("  - Doctors: username='dr.rajesh'     password='Doctor@HealthGrid2026!'")
print("             username='dr.priya'      password='Doctor@HealthGrid2026!'")
print("             username='dr.sunita'     password='Doctor@HealthGrid2026!'")
