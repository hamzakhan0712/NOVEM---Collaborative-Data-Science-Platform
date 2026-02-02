from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import landing_page
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', landing_page, name='landing'),
    path('admin/', admin.site.urls),
    
    # API routes
    path('api/auth/', include('accounts.urls')),
    path('api/workspaces/', include('workspaces.urls')),
    path('api/projects/', include('projects.urls')),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)