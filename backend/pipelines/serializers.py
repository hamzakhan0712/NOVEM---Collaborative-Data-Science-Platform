from rest_framework import serializers
from .models import Pipeline, PipelineVersion, PipelineExecution, PipelineStep
from accounts.serializers import UserSerializer
from datasources.serializers import DataSourceListSerializer

class PipelineStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStep
        fields = [
            'id', 'step_order', 'step_type', 'step_config', 'is_enabled'
        ]

class PipelineVersionSerializer(serializers.ModelSerializer):
    created_by_user = UserSerializer(source='created_by', read_only=True)
    steps = PipelineStepSerializer(many=True, read_only=True)
    
    class Meta:
        model = PipelineVersion
        fields = [
            'id', 'version_number', 'config_snapshot',
            'created_by_user', 'created_at', 'change_description', 'steps'
        ]
        read_only_fields = ['created_at']

class PipelineExecutionSerializer(serializers.ModelSerializer):
    triggered_by_user = UserSerializer(source='triggered_by', read_only=True)
    pipeline_name = serializers.CharField(source='pipeline.name', read_only=True)
    duration_seconds = serializers.ReadOnlyField()
    
    class Meta:
        model = PipelineExecution
        fields = [
            'id', 'pipeline', 'pipeline_name', 'pipeline_version',
            'state', 'trigger_type', 'triggered_by_user',
            'queued_at', 'started_at', 'completed_at', 'duration_seconds',
            'rows_processed', 'rows_failed', 'bytes_processed',
            'peak_memory_mb', 'peak_cpu_percent',
            'execution_log', 'error_message', 'error_traceback',
            'created_dataset_version'
        ]
        read_only_fields = [
            'queued_at', 'started_at', 'completed_at',
            'rows_processed', 'rows_failed', 'bytes_processed',
            'peak_memory_mb', 'peak_cpu_percent',
            'execution_log', 'error_message', 'error_traceback',
            'created_dataset_version'
        ]

class PipelineExecutionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing executions"""
    pipeline_name = serializers.CharField(source='pipeline.name', read_only=True)
    triggered_by_name = serializers.CharField(
        source='triggered_by.get_full_name', 
        read_only=True
    )
    duration_seconds = serializers.ReadOnlyField()
    
    class Meta:
        model = PipelineExecution
        fields = [
            'id', 'pipeline_name', 'state', 'trigger_type',
            'triggered_by_name', 'queued_at', 'completed_at',
            'duration_seconds', 'rows_processed'
        ]

class PipelineSerializer(serializers.ModelSerializer):
    created_by_user = UserSerializer(source='created_by', read_only=True)
    data_source_detail = DataSourceListSerializer(source='data_source', read_only=True)
    current_version_detail = serializers.SerializerMethodField()
    latest_execution = serializers.SerializerMethodField()
    
    class Meta:
        model = Pipeline
        fields = [
            'id', 'name', 'description', 'project',
            'data_source', 'data_source_detail', 'target_dataset_name',
            'execution_mode', 'schedule_expression',
            'config', 'estimated_memory_mb', 'estimated_cpu_percent',
            'estimated_duration_seconds', 'estimated_row_count',
            'state', 'last_run_at', 'last_run_status', 'next_scheduled_run',
            'current_version', 'current_version_detail',
            'created_at', 'updated_at', 'created_by_user',
            'latest_execution', 'is_deleted'
        ]
        read_only_fields = [
            'state', 'last_run_at', 'last_run_status',
            'current_version', 'created_at', 'updated_at', 'is_deleted'
        ]
    
    def get_current_version_detail(self, obj):
        try:
            version = obj.versions.get(version_number=obj.current_version)
            return PipelineVersionSerializer(version).data
        except PipelineVersion.DoesNotExist:
            return None
    
    def get_latest_execution(self, obj):
        execution = obj.executions.first()
        if execution:
            return PipelineExecutionListSerializer(execution).data
        return None
    
    def validate(self, data):
        # Validate schedule expression if execution mode is scheduled
        if data.get('execution_mode') == 'scheduled':
            if not data.get('schedule_expression'):
                raise serializers.ValidationError({
                    'schedule_expression': 'Schedule expression is required for scheduled pipelines'
                })
            # TODO: Validate cron expression format
        
        return data
    
    def create(self, validated_data):
        # Create pipeline
        pipeline = Pipeline.objects.create(**validated_data)
        
        # Create initial version
        PipelineVersion.objects.create(
            pipeline=pipeline,
            version_number=1,
            config_snapshot=validated_data.get('config', {}),
            created_by=validated_data.get('created_by'),
            change_description='Initial version'
        )
        
        return pipeline
    
    def update(self, instance, validated_data):
        # Check if config changed
        config_changed = 'config' in validated_data and validated_data['config'] != instance.config
        
        # Update pipeline
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # If config changed, create new version
        if config_changed:
            instance.current_version += 1
            PipelineVersion.objects.create(
                pipeline=instance,
                version_number=instance.current_version,
                config_snapshot=validated_data.get('config', {}),
                created_by=self.context['request'].user,
                change_description=validated_data.get('change_description', 'Configuration updated')
            )
        
        instance.save()
        return instance

class PipelineListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing pipelines"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    data_source_name = serializers.CharField(source='data_source.name', read_only=True)
    
    class Meta:
        model = Pipeline
        fields = [
            'id', 'name', 'project_name', 'data_source_name',
            'execution_mode', 'state', 'last_run_at',
            'last_run_status', 'created_at'
        ]