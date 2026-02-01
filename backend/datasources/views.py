from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import DataSource, DataSourcePermission
from .serializers import (
    DataSourceSerializer,
    DataSourceListSerializer,
    DataSourcePermissionSerializer
)

class DataSourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing data sources.
    Provides CRUD operations and additional actions for validation and schema retrieval.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Return data sources accessible to the current user.
        Includes personal, project-scoped, and workspace-scoped sources.
        """
        user = self.request.user
        
        # Personal data sources owned by user
        personal_sources = DataSource.objects.filter(
            ownership_scope='personal',
            owner=user
        )
        
        # Project-scoped sources from projects user is member of
        user_projects = user.project_memberships.values_list('project_id', flat=True)
        project_sources = DataSource.objects.filter(
            ownership_scope='project',
            project_id__in=user_projects
        )
        
        # Workspace-scoped sources from workspaces user is member of
        user_workspaces = user.workspace_memberships.values_list('workspace_id', flat=True)
        workspace_sources = DataSource.objects.filter(
            ownership_scope='workspace',
            workspace_id__in=user_workspaces
        )
        
        # Combine all querysets
        return (personal_sources | project_sources | workspace_sources).distinct()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DataSourceListSerializer
        return DataSourceSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            created_by=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def validate_connection(self, request, pk=None):
        """
        Trigger validation of data source connection.
        This will call the compute engine to test the connection.
        """
        data_source = self.get_object()
        
        # TODO: Call compute engine validation service
        # For now, just update state
        data_source.state = 'validating'
        data_source.save()
        
        return Response({
            'status': 'validation_started',
            'message': 'Connection validation has been initiated'
        })
    
    @action(detail=True, methods=['get'])
    def schema(self, request, pk=None):
        """
        Retrieve cached schema or fetch fresh schema from source.
        """
        data_source = self.get_object()
        
        if data_source.cached_schema:
            return Response({
                'schema': data_source.cached_schema,
                'last_updated': data_source.schema_last_updated
            })
        
        return Response({
            'message': 'No schema cached. Validate connection first.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def test_query(self, request, pk=None):
        """
        Execute a test query against the data source.
        """
        data_source = self.get_object()
        query = request.data.get('query')
        
        if not query:
            return Response({
                'error': 'Query is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Call compute engine to execute test query
        
        return Response({
            'status': 'query_executed',
            'message': 'Test query execution started'
        })
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """
        List permissions for this data source.
        """
        data_source = self.get_object()
        permissions = data_source.permissions.all()
        serializer = DataSourcePermissionSerializer(permissions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def grant_permission(self, request, pk=None):
        """
        Grant permission to a user for this data source.
        """
        data_source = self.get_object()
        
        # Check if requester is owner or admin
        if data_source.owner != request.user:
            return Response({
                'error': 'Only the owner can grant permissions'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        permission_level = request.data.get('permission_level', 'use')
        
        # TODO: Validate user_id exists
        
        permission, created = DataSourcePermission.objects.get_or_create(
            data_source=data_source,
            user_id=user_id,
            defaults={
                'permission_level': permission_level,
                'granted_by': request.user
            }
        )
        
        if not created:
            permission.permission_level = permission_level
            permission.save()
        
        serializer = DataSourcePermissionSerializer(permission)
        return Response(serializer.data, status=status.HTTP_201_CREATED)