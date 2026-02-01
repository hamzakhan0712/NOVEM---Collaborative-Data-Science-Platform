from django.db import models
from django.conf import settings
import uuid

class Pipeline(models.Model):
    """
    Defines an ETL/ELT pipeline configuration.
    Pipelines extract data from sources, transform it, and load into datasets.
    """
    
    EXECUTION_MODES = [
        ('manual', 'Manual'),
        ('scheduled', 'Scheduled'),
        ('on_demand', 'On Demand'),
    ]
    
    STATES = [
        ('draft', 'Draft'),
        ('validating', 'Validating'),
        ('ready', 'Ready'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Project association (pipelines are always project-scoped)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='pipelines'
    )
    
    # Source configuration
    data_source = models.ForeignKey(
        'datasources.DataSource',
        on_delete=models.PROTECT,
        related_name='pipelines'
    )
    
    # Target dataset name
    target_dataset_name = models.CharField(max_length=255)
    
    # Execution configuration
    execution_mode = models.CharField(max_length=20, choices=EXECUTION_MODES, default='manual')
    schedule_expression = models.CharField(
        max_length=255,
        blank=True,
        help_text='Cron expression for scheduled pipelines'
    )
    
    # Pipeline configuration (stored as JSON)
    config = models.JSONField(default=dict)
    # Example: {
    #   "selected_tables": ["customers", "orders"],
    #   "selected_columns": {"customers": ["id", "name", "email"]},
    #   "filters": {"orders": "created_at > '2024-01-01'"},
    #   "transformations": [
    #       {"type": "rename_column", "table": "customers", "from": "name", "to": "customer_name"},
    #       {"type": "cast_type", "table": "orders", "column": "amount", "to_type": "DECIMAL"}
    #   ]
    # }
    
    # Resource estimates
    estimated_memory_mb = models.IntegerField(null=True, blank=True)
    estimated_cpu_percent = models.IntegerField(null=True, blank=True)
    estimated_duration_seconds = models.IntegerField(null=True, blank=True)
    estimated_row_count = models.IntegerField(null=True, blank=True)
    
    # State management
    state = models.CharField(max_length=20, choices=STATES, default='draft')
    
    # Execution tracking
    last_run_at = models.DateTimeField(null=True, blank=True)
    last_run_status = models.CharField(max_length=20, blank=True)
    next_scheduled_run = models.DateTimeField(null=True, blank=True)
    
    # Version tracking
    current_version = models.IntegerField(default=1)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_pipelines'
    )
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', '-created_at']),
            models.Index(fields=['state']),
            models.Index(fields=['execution_mode']),
            models.Index(fields=['next_scheduled_run']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.project.name})"


class PipelineVersion(models.Model):
    """
    Tracks versions of pipeline configurations.
    Every configuration change creates a new version.
    """
    
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    
    version_number = models.IntegerField()
    
    # Snapshot of config at this version
    config_snapshot = models.JSONField()
    
    # Who made this version
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Change description
    change_description = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['pipeline', 'version_number']
        ordering = ['-version_number']
    
    def __str__(self):
        return f"{self.pipeline.name} v{self.version_number}"


class PipelineExecution(models.Model):
    """
    Tracks individual pipeline execution runs.
    Each execution creates one or more dataset versions.
    """
    
    STATES = [
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    TRIGGER_TYPES = [
        ('manual', 'Manual'),
        ('scheduled', 'Scheduled'),
        ('api', 'API'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='executions'
    )
    
    pipeline_version = models.ForeignKey(
        PipelineVersion,
        on_delete=models.SET_NULL,
        null=True,
        related_name='executions'
    )
    
    # Execution details
    state = models.CharField(max_length=20, choices=STATES, default='queued')
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_TYPES)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='triggered_executions'
    )
    
    # Timing
    queued_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Results
    rows_processed = models.IntegerField(null=True, blank=True)
    rows_failed = models.IntegerField(default=0)
    bytes_processed = models.BigIntegerField(null=True, blank=True)
    
    # Resource usage
    peak_memory_mb = models.IntegerField(null=True, blank=True)
    peak_cpu_percent = models.IntegerField(null=True, blank=True)
    
    # Logs and errors
    execution_log = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    error_traceback = models.TextField(blank=True)
    
    # Output dataset version created (if successful)
    created_dataset_version = models.ForeignKey(
        'datasets.DatasetVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_by_executions'
    )
    
    class Meta:
        ordering = ['-queued_at']
        indexes = [
            models.Index(fields=['pipeline', '-queued_at']),
            models.Index(fields=['state']),
            models.Index(fields=['triggered_by']),
        ]
    
    def __str__(self):
        return f"{self.pipeline.name} - {self.state} ({self.queued_at})"
    
    @property
    def duration_seconds(self):
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


class PipelineStep(models.Model):
    """
    Individual transformation steps within a pipeline.
    Steps are executed in order.
    """
    
    STEP_TYPES = [
        ('filter_rows', 'Filter Rows'),
        ('select_columns', 'Select Columns'),
        ('rename_column', 'Rename Column'),
        ('cast_type', 'Cast Type'),
        ('drop_nulls', 'Drop Nulls'),
        ('fill_nulls', 'Fill Nulls'),
        ('drop_duplicates', 'Drop Duplicates'),
        ('join', 'Join Tables'),
        ('aggregate', 'Aggregate'),
        ('custom_sql', 'Custom SQL'),
    ]
    
    pipeline_version = models.ForeignKey(
        PipelineVersion,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    
    step_order = models.IntegerField()
    step_type = models.CharField(max_length=50, choices=STEP_TYPES)
    step_config = models.JSONField(default=dict)
    # Example for filter_rows: {"condition": "age > 18"}
    # Example for rename_column: {"from": "customer_name", "to": "name"}
    
    is_enabled = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['step_order']
        unique_together = ['pipeline_version', 'step_order']
    
    def __str__(self):
        return f"Step {self.step_order}: {self.get_step_type_display()}"