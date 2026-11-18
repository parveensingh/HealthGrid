from rest_framework import permissions


class IsPatient(permissions.BasePermission):
    message = "Patient privileges required."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, "profile", None)
        return bool(profile and profile.role == "patient")


class IsDoctor(permissions.BasePermission):
    message = "Doctor privileges required."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, "profile", None)
        return bool(profile and profile.role == "doctor")


class IsVerifiedDoctor(permissions.BasePermission):
    message = "Verified doctor privileges required."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, "profile", None)
        if not (profile and profile.role == "doctor"):
            return False
        if not (profile.doctor and profile.doctor.verified):
            return False
        return True


class IsAdmin(permissions.BasePermission):
    message = "Administrator privileges required."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        return bool(profile and profile.role == "admin")


class IsDoctorOrAdmin(permissions.BasePermission):
    message = "Doctor or Administrator privileges required."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        return bool(profile and profile.role in ("doctor", "admin"))
