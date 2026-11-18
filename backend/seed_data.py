import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "securechain.settings")

import django

django.setup()

from attribute_authority.models import Doctor


DEMO_DOCTORS = [
    {
        "name": "Dr. Rajesh Sharma",
        "specialty": "Cardiology",
        "attributes": ["Role:ChiefDoctor", "Role:Doctor", "Dept:Cardiology", "Clearance:Level3"],
    },
    {
        "name": "Dr. Priya Nair",
        "specialty": "Neurology",
        "attributes": ["Role:SeniorDoctor", "Role:Doctor", "Dept:Neurology", "Clearance:Level2"],
    },
    {
        "name": "Dr. Aarav Patel",
        "specialty": "Oncology",
        "attributes": ["Role:Consultant", "Role:Doctor", "Dept:Oncology", "Clearance:Level2"],
    },
    {
        "name": "Dr. Ananya Iyer",
        "specialty": "Pediatrics",
        "attributes": ["Role:Doctor", "Dept:Pediatrics", "Clearance:Level1"],
    },
    {
        "name": "Dr. Vikramaditya Reddy",
        "specialty": "Radiology",
        "attributes": ["Role:ChiefRadiologist", "Role:Doctor", "Dept:Radiology", "Clearance:Level2"],
    },
    {
        "name": "Dr. Sunita Deshmukh",
        "specialty": "Emergency Medicine",
        "attributes": ["Role:EmergencyLead", "Role:Doctor", "Dept:Emergency", "Emergency:True", "Clearance:Level3"],
    },
    {
        "name": "Dr. Rohan Kapoor",
        "specialty": "Orthopedics",
        "attributes": ["Role:Surgeon", "Role:Doctor", "Dept:Orthopedics", "Clearance:Level2"],
    },
    {
        "name": "Dr. Meera Mukherjee",
        "specialty": "Dermatology",
        "attributes": ["Role:Doctor", "Dept:Dermatology", "Clearance:Level1"],
    },
    {
        "name": "Dr. Arjun Menon",
        "specialty": "General Surgery",
        "attributes": ["Role:SeniorSurgeon", "Role:Doctor", "Dept:Surgery", "Clearance:Level3"],
    },
    {
        "name": "Dr. Kavita Sundaram",
        "specialty": "Pathology",
        "attributes": ["Role:Pathologist", "Role:Doctor", "Dept:Pathology", "Clearance:Level2"],
    },
    {
        "name": "Dr. Sarah Jenkins",
        "specialty": "Cardiology",
        "attributes": ["Role:Doctor", "Dept:Cardiology"],
    },
    {
        "name": "Dr. Alex Morgan",
        "specialty": "Emergency Medicine",
        "attributes": ["Role:Doctor", "Dept:Emergency", "Emergency:True"],
    },
]

for doctor_data in DEMO_DOCTORS:
    Doctor.objects.update_or_create(
        name=doctor_data["name"],
        defaults={
            "specialty": doctor_data["specialty"],
            "attributes": doctor_data["attributes"],
            "verified": True,
        },
    )

print(f"Successfully seeded {len(DEMO_DOCTORS)} doctors into database.")
