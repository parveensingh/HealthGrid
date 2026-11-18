from django.db import models


class EducationUser(models.Model):
    ROLES = [("student", "Student"), ("intern", "Intern"), ("researcher", "Researcher")]
    STATUS = [("pending", "Pending"), ("verified", "Verified"), ("rejected", "Rejected")]
    name = models.CharField(max_length=120)
    email = models.CharField(max_length=200, unique=True)
    role = models.CharField(max_length=20, choices=ROLES)
    institution = models.CharField(max_length=200, blank=True)
    academic_purpose = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.email})"


class MedicalSpecialty(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.name


class CaseStudy(models.Model):
    DIFFICULTY = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]
    title = models.CharField(max_length=200)
    specialty = models.ForeignKey(MedicalSpecialty, on_delete=models.SET_NULL, null=True)
    description = models.TextField()
    anonymized_content = models.TextField()
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class DatasetRequest(models.Model):
    STATUS = [("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    requester = models.ForeignKey(EducationUser, on_delete=models.CASCADE)
    specialty = models.ForeignKey(MedicalSpecialty, on_delete=models.SET_NULL, null=True)
    research_objective = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Request by {self.requester} [{self.status}]"


class Quiz(models.Model):
    case_study = models.ForeignKey(CaseStudy, on_delete=models.CASCADE, related_name="quizzes")
    question = models.TextField()
    option_a = models.CharField(max_length=200)
    option_b = models.CharField(max_length=200)
    option_c = models.CharField(max_length=200)
    option_d = models.CharField(max_length=200)
    correct_option = models.CharField(max_length=1)

    def __str__(self):
        return f"Quiz for {self.case_study.title}"


class QuizAttempt(models.Model):
    user = models.ForeignKey(EducationUser, on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    selected_option = models.CharField(max_length=1)
    is_correct = models.BooleanField()
    attempted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - Quiz {self.quiz_id} - {'Correct' if self.is_correct else 'Wrong'}"


class TrainingProgram(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    specialty = models.ForeignKey(MedicalSpecialty, on_delete=models.SET_NULL, null=True)
    supervising_doctor = models.ForeignKey(
        "attribute_authority.Doctor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class InternAssignment(models.Model):
    intern = models.ForeignKey(
        EducationUser,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "intern"},
    )
    program = models.ForeignKey(TrainingProgram, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    feedback = models.TextField(blank=True)

    def __str__(self):
        return f"{self.intern} → {self.program}"


class Notification(models.Model):
    user_email = models.CharField(max_length=200)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{'read' if self.is_read else 'unread'}] {self.title} → {self.user_email}"
