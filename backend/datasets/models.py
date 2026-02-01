from django.db import models
from django.conf import settings
import uuid
import hashlib
import json

class Dataset(models.Model):
    """
    Logical dataset container.
    Contains metadata and versioning for project datasets.
    """
    
    VISIBILITY_LEVELS = [
        ('private', 'Private'),
        ('project', 'Project Members'),
        ('workspace', 'Workspace Members'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Project association
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='datasets'
    )
    
    # Visibility
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_LEVELS,
        default='private'
    )
    
    # Tags for organization
    tags = models.JSONField(default=list, blank=True)
    
    # Current/latest version
    current_version = models.IntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_datasets'
    )
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['project', 'name']
        indexes = [
            models.Index(fields=['project', '-created_at']),
            models.Index(fields=['visibility']),
        ]
    
    def __str__(self):
        return f"{self.name} (v{self.current_version})"
    
    def get_latest_version(self):
        """Get the latest dataset version"""
        return self.versions.order_by('-version_number').first()


class DatasetVersion(models.Model):
    """
    Immutable version snapshot of a dataset.
    Represents the actual data at a point in time.
    """
    
    STATES = [
        ('creating', 'Creating'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    
    version_number = models.IntegerField()
    
    # State
    state = models.CharField(max_length=20, choices=STATES, default='creating')
    
    # Schema and structure
    schema = models.JSONField()
    # Example: {
    #   "columns": [
    #     {"name": "id", "type": "INTEGER", "nullable": false},
    #     {"name": "name", "type": "VARCHAR", "nullable": true}
    #   ]
    # }
    
    schema_hash = models.CharField(max_length=64)
    # SHA-256 hash of schema for change detection
    
    # Data metrics
    row_count = models.BigIntegerField(default=0)
    column_count = models.IntegerField(default=0)
    storage_size_bytes = models.BigIntegerField(default=0)
    
    # Storage location (DuckDB table reference)
    storage_table_name = models.CharField(max_length=255)
    # Format: datasets_{project_id}_{dataset_name}_v{version}
    
    # Data quality metrics
    quality_score = models.FloatField(null=True, blank=True)
    # Score 0-100 based on nulls, duplicates, outliers
    
    null_percentage = models.FloatField(default=0.0)
    duplicate_count = models.BigIntegerField(default=0)
    outlier_count = models.BigIntegerField(default=0)
    
    # Profiling data
    column_profiles = models.JSONField(default=dict, blank=True)
    # Per-column statistics: {
    #   "age": {
    #     "min": 18, "max": 65, "mean": 35.2,
    #     "null_count": 5, "unique_count": 120
    #   }
    # }
    
    # Creation metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_dataset_versions'
    )
    
    # Pipeline that created this version (if applicable)
    created_by_pipeline = models.ForeignKey(
        'pipelines.Pipeline',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_dataset_versions'
    )
    
    # Version notes
    change_description = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['dataset', 'version_number']
        ordering = ['-version_number']
        indexes = [
            models.Index(fields=['dataset', '-version_number']),
            models.Index(fields=['state']),
        ]
    
    def __str__(self):
        return f"{self.dataset.name} v{self.version_number}"
    
    def calculate_schema_hash(self):
        """Calculate SHA-256 hash of schema for change detection"""
        schema_str = json.dumps(self.schema, sort_keys=True)
        return hashlib.sha256(schema_str.encode()).hexdigest()
    
    def save(self, *args, **kwargs):
        # Auto-calculate schema hash if schema is present
        if self.schema and not self.schema_hash:
            self.schema_hash = self.calculate_schema_hash()
        
        # Auto-calculate column count
        if self.schema and 'columns' in self.schema:
            self.column_count = len(self.schema['columns'])
        
        super().save(*args, **kwargs)


class DatasetLineage(models.Model):
    """
    Tracks lineage from data sources to datasets.
    Enables full traceability of data transformations.
    """
    
    LINEAGE_TYPES = [
        ('source', 'Data Source'),
        ('pipeline', 'Pipeline'),
        ('dataset', 'Dataset'),
    ]
    
    dataset_version = models.ForeignKey(
        DatasetVersion,
        on_delete=models.CASCADE,
        related_name='lineage'
    )
    
    # Parent entities (source of this dataset)
    source_type = models.CharField(max_length=20, choices=LINEAGE_TYPES)
    
    # Foreign keys to possible sources
    source_data_source = models.ForeignKey(
        'datasources.DataSource',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='downstream_datasets'
    )
    
    source_pipeline = models.ForeignKey(
        'pipelines.Pipeline',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='downstream_datasets'
    )
    
    source_dataset_version = models.ForeignKey(
        DatasetVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='downstream_datasets'
    )
    
    # Transformation metadata
    transformation_details = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.dataset_version} ← {self.source_type}"


class DatasetQuery(models.Model):
    """
    Track queries executed against datasets for audit and optimization.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    dataset_version = models.ForeignKey(
        DatasetVersion,
        on_delete=models.CASCADE,
        related_name='queries'
    )
    
    # Query details
    query_sql = models.TextField()
    query_hash = models.CharField(max_length=64)
    
    # Execution details
    executed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='dataset_queries'
    )
    executed_at = models.DateTimeField(auto_now_add=True)
    
    # Performance metrics
    execution_time_ms = models.IntegerField(null=True, blank=True)
    rows_returned = models.IntegerField(null=True, blank=True)
    
    # Result status
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-executed_at']
        indexes = [
            models.Index(fields=['dataset_version', '-executed_at']),
            models.Index(fields=['executed_by']),
        ]
    
    def __str__(self):
        return f"Query on {self.dataset_version} at {self.executed_at}"
    
    def save(self, *args, **kwargs):
        # Calculate query hash
        if self.query_sql and not self.query_hash:
            self.query_hash = hashlib.sha256(
                self.query_sql.encode()
            ).hexdigest()
        super().save(*args, **kwargs)