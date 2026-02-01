from rest_framework import serializers
from .models import Dataset, DatasetVersion, DatasetLineage, DatasetQuery
from accounts.serializers import UserSerializer

class DatasetLineageSerializer(serializers.ModelSerializer):
    source_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DatasetLineage
        fields = [
            'id', 'source_type', 'source_name',
            'source_data_source', 'source_pipeline',
            'source_dataset_version', 'transformation_details',
            'created_at'
        ]
    
    def get_source_name(self, obj):
        if obj.source_type == 'source' and obj.source_data_source:
            return obj.source_data_source.name
        elif obj.source_type == 'pipeline' and obj.source_pipeline:
            return obj.source_pipeline.name
        elif obj.source_type == 'dataset' and obj.source_dataset_version:
            return str(obj.source_dataset_version)
        return None

class DatasetVersionSerializer(serializers.ModelSerializer):
    created_by_user = UserSerializer(source='created_by', read_only=True)
    pipeline_name = serializers.CharField(
        source='created_by_pipeline.name',
        read_only=True,
        allow_null=True
    )
    lineage = DatasetLineageSerializer(many=True, read_only=True)
    storage_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = DatasetVersion
        fields = [
            'id', 'dataset', 'version_number', 'state',
            'schema', 'schema_hash', 'row_count', 'column_count',
            'storage_size_bytes', 'storage_size_mb', 'storage_table_name',
            'quality_score', 'null_percentage', 'duplicate_count',
            'outlier_count', 'column_profiles',
            'created_at', 'created_by_user', 'created_by_pipeline',
            'pipeline_name', 'change_description', 'lineage'
        ]
        read_only_fields = [
            'schema_hash', 'row_count', 'column_count',
            'storage_size_bytes', 'quality_score', 'null_percentage',
            'duplicate_count', 'outlier_count', 'column_profiles',
            'created_at'
        ]
    
    def get_storage_size_mb(self, obj):
        return round(obj.storage_size_bytes / (1024 * 1024), 2)

class DatasetVersionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing versions"""
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    storage_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = DatasetVersion
        fields = [
            'id', 'version_number', 'state', 'row_count',
            'column_count', 'storage_size_mb', 'quality_score',
            'created_at', 'created_by_name'
        ]
    
    def get_storage_size_mb(self, obj):
        return round(obj.storage_size_bytes / (1024 * 1024), 2)

class DatasetSerializer(serializers.ModelSerializer):
    created_by_user = UserSerializer(source='created_by', read_only=True)
    latest_version = serializers.SerializerMethodField()
    versions_count = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = Dataset
        fields = [
            'id', 'name', 'description', 'project', 'project_name',
            'visibility', 'tags', 'current_version',
            'latest_version', 'versions_count',
            'created_at', 'updated_at', 'created_by_user',
            'is_deleted'
        ]
        read_only_fields = [
            'current_version', 'created_at', 'updated_at', 'is_deleted'
        ]
    
    def get_latest_version(self, obj):
        version = obj.get_latest_version()
        if version:
            return DatasetVersionListSerializer(version).data
        return None
    
    def get_versions_count(self, obj):
        return obj.versions.count()

class DatasetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing datasets"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    latest_version_number = serializers.SerializerMethodField()
    total_rows = serializers.SerializerMethodField()
    
    class Meta:
        model = Dataset
        fields = [
            'id', 'name', 'project_name', 'visibility',
            'current_version', 'latest_version_number',
            'total_rows', 'created_at'
        ]
    
    def get_latest_version_number(self, obj):
        version = obj.get_latest_version()
        return version.version_number if version else 0
    
    def get_total_rows(self, obj):
        version = obj.get_latest_version()
        return version.row_count if version else 0

class DatasetQuerySerializer(serializers.ModelSerializer):
    executed_by_user = UserSerializer(source='executed_by', read_only=True)
    dataset_name = serializers.CharField(
        source='dataset_version.dataset.name',
        read_only=True
    )
    
    class Meta:
        model = DatasetQuery
        fields = [
            'id', 'dataset_version', 'dataset_name',
            'query_sql', 'query_hash',
            'executed_by_user', 'executed_at',
            'execution_time_ms', 'rows_returned',
            'success', 'error_message'
        ]
        read_only_fields = [
            'query_hash', 'executed_at', 'execution_time_ms',
            'rows_returned', 'success', 'error_message'
        ]

class DatasetQueryResultSerializer(serializers.Serializer):
    """Serializer for query results returned from compute engine"""
    columns = serializers.ListField()
    rows = serializers.ListField()
    row_count = serializers.IntegerField()
    execution_time_ms = serializers.IntegerField()