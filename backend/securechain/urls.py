from django.urls import include, path

urlpatterns = [
    path("api/", include("records.urls")),
    path("api/education/", include("education.urls")),
    path("api/admin/education/", include("education.admin_urls")),
    path("api/attribute-authority/", include("attribute_authority.urls")),
]
