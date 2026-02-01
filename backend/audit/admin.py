from django.contrib import admin

from audit.models import AuditLog

# Register your models here.
admin.site.register([AuditLog])