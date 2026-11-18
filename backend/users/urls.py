from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("login/", views.login_view, name="auth_login"),
    path("register/", views.register_view, name="auth_register"),
    path("me/", views.me_view, name="auth_me"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("demo-users/", views.demo_users_view, name="auth_demo_users"),
]
