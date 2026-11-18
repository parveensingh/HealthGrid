"""
Seed script for the education app.
Run with: python seed_education.py  (from the backend directory with venv active)
Or: python manage.py shell < education/seed_education.py
"""
import os
import sys
import django

# Allow running directly
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "securechain.settings")
    django.setup()

from education.models import CaseStudy, MedicalSpecialty, Quiz


def seed():
    # ── Specialties ────────────────────────────────────────────
    specialties_data = [
        {
            "name": "Cardiology",
            "description": "Study and treatment of heart disorders.",
            "icon": "heart",
        },
        {
            "name": "Neurology",
            "description": "Study and treatment of nervous system disorders.",
            "icon": "brain",
        },
        {
            "name": "Oncology",
            "description": "Diagnosis and treatment of cancer.",
            "icon": "ribbon",
        },
        {
            "name": "Pediatrics",
            "description": "Medical care for infants, children, and adolescents.",
            "icon": "child",
        },
        {
            "name": "Radiology",
            "description": "Medical imaging for diagnosis and treatment.",
            "icon": "xray",
        },
        {
            "name": "Emergency Medicine",
            "description": "Immediate decision-making and care for acute conditions.",
            "icon": "ambulance",
        },
    ]

    specialties = {}
    for data in specialties_data:
        s, created = MedicalSpecialty.objects.get_or_create(
            name=data["name"],
            defaults={"description": data["description"], "icon": data["icon"]},
        )
        specialties[data["name"]] = s
        print(f"  {'Created' if created else 'Exists'}: Specialty '{s.name}'")

    # ── Case Studies ───────────────────────────────────────────
    cases_data = [
        {
            "title": "Acute Myocardial Infarction — Anterior STEMI",
            "specialty": "Cardiology",
            "description": (
                "A 58-year-old male presents with crushing chest pain radiating to the left arm, "
                "diaphoresis, and nausea for 90 minutes. BP 100/70, HR 110 bpm."
            ),
            "anonymized_content": (
                "Patient A58M presents with sudden-onset substernal chest pressure (9/10), "
                "diaphoresis, and nausea. ECG shows 2 mm ST elevation in leads V1–V4. "
                "Troponin I rising. Activated cath lab. Primary PCI performed to LAD. "
                "Post-procedure TIMI 3 flow restored."
            ),
            "difficulty": "intermediate",
            "quizzes": [
                {
                    "question": "Which ECG finding is most consistent with anterior STEMI?",
                    "option_a": "ST depression in V1-V4",
                    "option_b": "ST elevation in V1-V4",
                    "option_c": "PR prolongation",
                    "option_d": "QTc prolongation",
                    "correct_option": "b",
                },
                {
                    "question": "What is the preferred reperfusion strategy within 90 minutes of first medical contact?",
                    "option_a": "Thrombolysis",
                    "option_b": "Coronary artery bypass graft",
                    "option_c": "Primary PCI",
                    "option_d": "Medical management only",
                    "correct_option": "c",
                },
            ],
        },
        {
            "title": "Ischemic Stroke — Left MCA Territory",
            "specialty": "Neurology",
            "description": (
                "A 72-year-old woman with atrial fibrillation presents with sudden right-sided "
                "weakness and aphasia. Last seen normal 2 hours ago."
            ),
            "anonymized_content": (
                "Patient F72, known AF not on anticoagulation, sudden right arm/face weakness, "
                "expressive aphasia, NIHSS 14. Non-contrast CT brain: no hemorrhage. "
                "CTA: left M1 occlusion. IV alteplase administered at 2h10m. Thrombectomy performed."
            ),
            "difficulty": "advanced",
            "quizzes": [
                {
                    "question": "What is the maximum time window for IV alteplase from symptom onset (in eligible patients)?",
                    "option_a": "1 hour",
                    "option_b": "3 hours",
                    "option_c": "4.5 hours",
                    "option_d": "6 hours",
                    "correct_option": "c",
                },
                {
                    "question": "Which finding on non-contrast CT would be a contraindication to thrombolysis?",
                    "option_a": "Hypodense MCA territory infarct involving < 1/3 MCA territory",
                    "option_b": "Hyperdense MCA sign",
                    "option_c": "Intracerebral hemorrhage",
                    "option_d": "Loss of gray-white differentiation",
                    "correct_option": "c",
                },
            ],
        },
        {
            "title": "Paediatric Febrile Seizure",
            "specialty": "Pediatrics",
            "description": (
                "An 18-month-old boy is brought to the ED following a 3-minute generalized "
                "tonic-clonic seizure with fever of 39.2°C. No prior seizure history."
            ),
            "anonymized_content": (
                "Patient M18m, temp 39.2°C. Witnessed 3-minute GTCS at home, self-terminating. "
                "Post-ictal but now alert. Physical exam: upper respiratory symptoms. "
                "Diagnosed: simple febrile seizure. Counselled parents. Antipyretics. "
                "EEG and neuroimaging deferred (simple, age-appropriate, full recovery)."
            ),
            "difficulty": "beginner",
            "quizzes": [
                {
                    "question": "What is the most important differentiating factor between a simple and complex febrile seizure?",
                    "option_a": "Duration > 15 minutes or focal features or recurrence in 24 hours",
                    "option_b": "Age of the child",
                    "option_c": "Height of fever",
                    "option_d": "Presence of post-ictal drowsiness",
                    "correct_option": "a",
                },
            ],
        },
        {
            "title": "Pulmonary Embolism — Submassive",
            "specialty": "Emergency Medicine",
            "description": (
                "A 44-year-old woman post knee replacement, presents with sudden-onset dyspnoea "
                "and pleuritic chest pain. HR 118, SpO2 89% on air."
            ),
            "anonymized_content": (
                "Patient F44, 5-day post right TKR, sudden dyspnoea and right-sided pleuritic pain. "
                "HR 118, BP 108/72, SpO2 89% on RA. D-dimer markedly elevated. CTPA: bilateral PE "
                "with right heart strain. BNP and troponin mildly elevated. Echo: RV dilation. "
                "Anticoagulation started. Monitored for haemodynamic deterioration."
            ),
            "difficulty": "intermediate",
            "quizzes": [
                {
                    "question": "Which scoring system is used to estimate pre-test probability of PE?",
                    "option_a": "CURB-65",
                    "option_b": "Wells PE Score",
                    "option_c": "APACHE II",
                    "option_d": "Glasgow Coma Scale",
                    "correct_option": "b",
                },
                {
                    "question": "In a haemodynamically stable PE patient with right heart strain on echo, what classification is this?",
                    "option_a": "Massive PE",
                    "option_b": "Submassive PE",
                    "option_c": "Low-risk PE",
                    "option_d": "Incidental PE",
                    "correct_option": "b",
                },
            ],
        },
        {
            "title": "Breast Cancer Screening — Abnormal Mammogram",
            "specialty": "Oncology",
            "description": (
                "A 51-year-old woman with no family history of breast cancer is recalled "
                "following routine screening mammogram showing a spiculated mass in the right upper outer quadrant."
            ),
            "anonymized_content": (
                "Patient F51, routine mammogram: spiculated 1.8 cm mass right UOQ, BIRADS 5. "
                "Ultrasound: irregular hypoechoic mass with posterior shadowing. "
                "Core biopsy: invasive ductal carcinoma, ER+/PR+/HER2−, grade 2. "
                "Staging: T1c N0 M0. Multidisciplinary team recommended breast-conserving surgery + sentinel node biopsy."
            ),
            "difficulty": "intermediate",
            "quizzes": [
                {
                    "question": "What does BIRADS 5 signify on a mammogram report?",
                    "option_a": "Negative — no abnormality",
                    "option_b": "Probably benign — short follow-up",
                    "option_c": "Highly suggestive of malignancy",
                    "option_d": "Known biopsy-proven malignancy",
                    "correct_option": "c",
                },
            ],
        },
        {
            "title": "Chest X-Ray Interpretation — Pneumothorax",
            "specialty": "Radiology",
            "description": (
                "A 24-year-old tall, thin male presents with sudden onset right-sided chest pain and dyspnoea. "
                "CXR provided for interpretation."
            ),
            "anonymized_content": (
                "Patient M24, tall thin build, sudden right pleuritic pain and mild dyspnoea. "
                "CXR: absent right lung markings laterally, visible visceral pleural line, mediastinum not shifted. "
                "Diagnosis: right-sided primary spontaneous pneumothorax (~30%). Aspirated. Repeat CXR: good re-expansion."
            ),
            "difficulty": "beginner",
            "quizzes": [
                {
                    "question": "On a chest X-ray, which finding confirms a pneumothorax?",
                    "option_a": "Blunting of costophrenic angle",
                    "option_b": "Visible visceral pleural line with absent lung markings",
                    "option_c": "Increased opacity in the hemithorax",
                    "option_d": "Widened mediastinum",
                    "correct_option": "b",
                },
                {
                    "question": "A tension pneumothorax is suggested by which additional finding?",
                    "option_a": "Mediastinal shift toward the affected side",
                    "option_b": "Mediastinal shift away from the affected side",
                    "option_c": "Bilateral hyperlucency",
                    "option_d": "Normal mediastinum",
                    "correct_option": "b",
                },
            ],
        },
    ]

    for c_data in cases_data:
        specialty = specialties.get(c_data["specialty"])
        quizzes_data = c_data.pop("quizzes")
        specialty_name = c_data.pop("specialty")

        case, created = CaseStudy.objects.get_or_create(
            title=c_data["title"],
            defaults={
                "specialty": specialty,
                "description": c_data["description"],
                "anonymized_content": c_data["anonymized_content"],
                "difficulty": c_data["difficulty"],
                "is_active": True,
            },
        )
        print(f"  {'Created' if created else 'Exists'}: Case '{case.title}'")

        for q_data in quizzes_data:
            q, q_created = Quiz.objects.get_or_create(
                case_study=case,
                question=q_data["question"],
                defaults={
                    "option_a": q_data["option_a"],
                    "option_b": q_data["option_b"],
                    "option_c": q_data["option_c"],
                    "option_d": q_data["option_d"],
                    "correct_option": q_data["correct_option"],
                },
            )
            print(f"    {'Created' if q_created else 'Exists'}: Quiz Q: {q.question[:60]}…")

    print("\n✅ Seed complete.")


if __name__ == "__main__":
    print("Seeding education data…")
    seed()
