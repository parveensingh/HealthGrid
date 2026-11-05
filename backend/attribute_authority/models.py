from django.db import models


class Doctor(models.Model):
    name = models.CharField(max_length=120)
    specialty = models.CharField(max_length=120)
    attributes = models.JSONField(default=list)
    verified = models.BooleanField(default=True)

    def __str__(self):
        return self.name
