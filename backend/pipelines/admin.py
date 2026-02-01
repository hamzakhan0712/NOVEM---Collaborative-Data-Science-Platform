from django.contrib import admin
from .models import Pipeline, PipelineVersion, PipelineExecution, PipelineStep

class PipelineStepInline(admin.TabularInline):
    model = PipelineStep
    extra = 0
    fields = ['step_order', 'step_type', 'step_config', 'is_enabled']

class PipelineVersionInline(admin.TabularInline):
    model = PipelineVersion
    extra = 0
    fields = ['version_number', 'created_by', 'created_at', 'change_description']
    readonly_fields = ['created_at']

@admin.register(Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'project', 'state', 'execution_mode', 
        'last_run_at', 'last_run_status', 'created_at'
    ]
    list_filter = ['state', 'execution_mode', 'created_at', 'is_deleted']
    search_fields = ['name', 'description', 'project__name']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'last_run_at', 
        'current_version', 'deleted_at'
    ]
    inlines = [PipelineVersionInline]
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['id', 'name', 'description', 'project']
        }),
        ('Source & Target', {
            'fields': ['data_source', 'target_dataset_name']
        }),
        ('Execution Configuration', {
            'fields': [
                'execution_mode', 'schedule_expression',
                'next_scheduled_run'
            ]
        }),
        ('Pipeline Configuration', {
            'fields': ['config']
        }),
        ('Resource Estimates', {
            'fields': [
                'estimated_memory_mb', 'estimated_cpu_percent',
                'estimated_duration_seconds', 'estimated_row_count'
            ]
        }),
        ('State & Execution', {
            'fields': [
                'state', 'last_run_at', 'last_run_status', 'current_version'
            ]
        }),
        ('Metadata', {
            'fields': ['created_at', 'updated_at', 'created_by']
        }),
        ('Deletion', {
            'fields': ['is_deleted', 'deleted_at']
        }),
    ]

@admin.register(PipelineVersion)
class PipelineVersionAdmin(admin.ModelAdmin):
    list_display = ['pipeline', 'version_number', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['pipeline__name', 'change_description']
    readonly_fields = ['created_at']
    inlines = [PipelineStepInline]

@admin.register(PipelineExecution)
class PipelineExecutionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'pipeline', 'state', 'trigger_type',
        'queued_at', 'started_at', 'completed_at', 'rows_processed'
    ]
    list_filter = ['state', 'trigger_type', 'queued_at']
    search_fields = ['pipeline__name', 'error_message']
    readonly_fields = [
        'id', 'queued_at', 'started_at', 'completed_at',
        'duration_seconds'
    ]
    
    fieldsets = [
        ('Execution Info', {
            'fields': [
                'id', 'pipeline', 'pipeline_version',
                'state', 'trigger_type', 'triggered_by'
            ]
        }),
        ('Timing', {
            'fields': ['queued_at', 'started_at', 'completed_at', 'duration_seconds']
        }),
        ('Results', {
            'fields': [
                'rows_processed', 'rows_failed', 'bytes_processed',
                'created_dataset_version'
            ]
        }),
        ('Resource Usage', {
            'fields': ['peak_memory_mb', 'peak_cpu_percent']
        }),
        ('Logs & Errors', {
            'fields': ['execution_log', 'error_message', 'error_traceback']
        }),
    ]
    
    def duration_seconds(self, obj):
        return obj.duration_seconds
    duration_seconds.short_description = 'Duration (seconds)'

@admin.register(PipelineStep)
class PipelineStepAdmin(admin.ModelAdmin):
    list_display = ['pipeline_version', 'step_order', 'step_type', 'is_enabled']
    list_filter = ['step_type', 'is_enabled']
    search_fields = ['pipeline_version__pipeline__name']