from django.contrib import admin
from .models import DataSource, DataSourceCredential, DataSourcePermission

@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ['name', 'source_type', 'ownership_scope', 'state', 'owner', 'created_at']
    list_filter = ['source_type', 'ownership_scope', 'state', 'created_at']
    search_fields = ['name', 'description', 'owner__email']
    readonly_fields = ['created_at', 'updated_at', 'last_validated']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'description', 'source_type', 'state']
        }),
        ('Ownership', {
            'fields': ['owner', 'ownership_scope', 'project', 'workspace']
        }),
        ('Configuration', {
            'fields': ['config', 'cached_schema']
        }),
        ('Validation', {
            'fields': ['last_validated', 'validation_error', 'schema_last_updated']
        }),
        ('Metadata', {
            'fields': ['created_at', 'updated_at', 'created_by']
        }),
    ]

@admin.register(DataSourceCredential)
class DataSourceCredentialAdmin(admin.ModelAdmin):
    list_display = ['data_source', 'created_at', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(DataSourcePermission)
class DataSourcePermissionAdmin(admin.ModelAdmin):
    list_display = ['data_source', 'user', 'permission_level', 'granted_at']
    list_filter = ['permission_level', 'granted_at']
    search_fields = ['data_source__name', 'user__email']