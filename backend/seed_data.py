import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "securechain.settings")

import django

django.setup()

from attribute_authority.models import Doctor


DEMO_DOCTORS = [
    {
        "name": "Dr. Sarah Jenkins",
        "specialty": "Cardiology",
        "attributes": ["Role:Doctor", "Dept:Cardiology"],
    },
    {
        "name": "Dr. Marcus Vance",
        "specialty": "Dermatology",
        "attributes": ["Role:Doctor", "Dept:Dermatology"],
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
