from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Pipeline, PipelineVersion, PipelineExecution
from .serializers import (
    PipelineSerializer,
    PipelineListSerializer,
    PipelineVersionSerializer,
    PipelineExecutionSerializer,
    PipelineExecutionListSerializer
)
from projects.models import Project

class PipelineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pipelines.
    Provides CRUD operations and execution management.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Return pipelines from projects user is member of.
        """
        user = self.request.user
        user_projects = user.project_memberships.values_list('project_id', flat=True)
        
        queryset = Pipeline.objects.filter(
            project_id__in=user_projects,
            is_deleted=False
        ).select_related(
            'project', 'data_source', 'created_by'
        ).prefetch_related('versions', 'executions')
        
        # Filter by project if specified
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by state
        state = self.request.query_params.get('state')
        if state:
            queryset = queryset.filter(state=state)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PipelineListSerializer
        return PipelineSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """
        Execute the pipeline.
        Creates a new execution record and triggers the compute engine.
        """
        pipeline = self.get_object()
        
        # Check if pipeline is in a valid state
        if pipeline.state == 'running':
            return Response({
                'error': 'Pipeline is already running'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if pipeline.state not in ['ready', 'completed', 'failed']:
            return Response({
                'error': f'Pipeline cannot be executed in {pipeline.state} state'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get current version
        try:
            current_version = pipeline.versions.get(
                version_number=pipeline.current_version
            )
        except PipelineVersion.DoesNotExist:
            return Response({
                'error': 'Pipeline has no valid version'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create execution record
        execution = PipelineExecution.objects.create(
            pipeline=pipeline,
            pipeline_version=current_version,
            state='queued',
            trigger_type=request.data.get('trigger_type', 'manual'),
            triggered_by=request.user
        )
        
        # Update pipeline state
        pipeline.state = 'running'
        pipeline.save()
        
        # TODO: Send execution request to compute engine
        # compute_engine.execute_pipeline(execution.id)
        
        serializer = PipelineExecutionSerializer(execution)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def executions(self, request, pk=None):
        """
        List all executions for this pipeline.
        """
        pipeline = self.get_object()
        executions = pipeline.executions.all()
        
        # Pagination
        page = self.paginate_queryset(executions)
        if page is not None:
            serializer = PipelineExecutionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PipelineExecutionListSerializer(executions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """
        List all versions of this pipeline.
        """
        pipeline = self.get_object()
        versions = pipeline.versions.all()
        serializer = PipelineVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def estimate_resources(self, request, pk=None):
        """
        Estimate resource requirements for pipeline execution.
        Calls compute engine to analyze the pipeline configuration.
        """
        pipeline = self.get_object()
        
        # TODO: Call compute engine estimation service
        # estimates = compute_engine.estimate_resources(pipeline.id)
        
        # For now, return mock estimates
        estimates = {
            'estimated_memory_mb': 512,
            'estimated_cpu_percent': 40,
            'estimated_duration_seconds': 120,
            'estimated_row_count': 10000,
            'warnings': []
        }
        
        # Update pipeline with estimates
        pipeline.estimated_memory_mb = estimates['estimated_memory_mb']
        pipeline.estimated_cpu_percent = estimates['estimated_cpu_percent']
        pipeline.estimated_duration_seconds = estimates['estimated_duration_seconds']
        pipeline.estimated_row_count = estimates['estimated_row_count']
        pipeline.save()
        
        return Response(estimates)
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """
        Validate pipeline configuration.
        """
        pipeline = self.get_object()
        
        pipeline.state = 'validating'
        pipeline.save()
        
        # TODO: Call compute engine validation service
        
        return Response({
            'status': 'validation_started',
            'message': 'Pipeline validation has been initiated'
        })
    
    @action(detail=False, methods=['get'])
    def scheduled(self, request):
        """
        List all scheduled pipelines that are ready to run.
        """
        now = timezone.now()
        pipelines = self.get_queryset().filter(
            execution_mode='scheduled',
            state='ready',
            next_scheduled_run__lte=now
        )
        
        serializer = self.get_serializer(pipelines, many=True)
        return Response(serializer.data)