from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Dataset, DatasetVersion, DatasetLineage, DatasetQuery
from .serializers import (
    DatasetSerializer,
    DatasetListSerializer,
    DatasetVersionSerializer,
    DatasetVersionListSerializer,
    DatasetLineageSerializer,
    DatasetQuerySerializer,
    DatasetQueryResultSerializer
)

class DatasetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing datasets.
    Provides CRUD operations, versioning, and querying.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Return datasets from projects user is member of.
        """
        user = self.request.user
        user_projects = user.project_memberships.values_list('project_id', flat=True)
        
        queryset = Dataset.objects.filter(
            project_id__in=user_projects,
            is_deleted=False
        ).select_related(
            'project', 'created_by'
        ).prefetch_related('versions')
        
        # Filter by project if specified
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by visibility
        visibility = self.request.query_params.get('visibility')
        if visibility:
            queryset = queryset.filter(visibility=visibility)
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DatasetListSerializer
        return DatasetSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """
        List all versions of this dataset.
        """
        dataset = self.get_object()
        versions = dataset.versions.all()
        
        # Pagination
        page = self.paginate_queryset(versions)
        if page is not None:
            serializer = DatasetVersionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = DatasetVersionListSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='versions/(?P<version_number>[0-9]+)')
    def version_detail(self, request, pk=None, version_number=None):
        """
        Get details of a specific version.
        """
        dataset = self.get_object()
        version = get_object_or_404(
            DatasetVersion,
            dataset=dataset,
            version_number=version_number
        )
        serializer = DatasetVersionSerializer(version)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def schema(self, request, pk=None):
        """
        Get schema of the latest version.
        """
        dataset = self.get_object()
        version = dataset.get_latest_version()
        
        if not version:
            return Response({
                'error': 'No versions available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'version': version.version_number,
            'schema': version.schema,
            'schema_hash': version.schema_hash
        })
    
    @action(detail=True, methods=['post'])
    def query(self, request, pk=None):
        """
        Execute a query against the dataset.
        Proxies to compute engine and logs the query.
        """
        dataset = self.get_object()
        version_number = request.data.get('version', dataset.current_version)
        query_sql = request.data.get('query')
        limit = request.data.get('limit', 100)
        
        if not query_sql:
            return Response({
                'error': 'Query SQL is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the dataset version
        try:
            version = dataset.versions.get(version_number=version_number)
        except DatasetVersion.DoesNotExist:
            return Response({
                'error': f'Version {version_number} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if version.state != 'ready':
            return Response({
                'error': f'Dataset version is not ready (state: {version.state})'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Call compute engine to execute query
        # result = compute_engine.execute_query(
        #     table_name=version.storage_table_name,
        #     query=query_sql,
        #     limit=limit
        # )
        
        # Mock response for now
        result = {
            'columns': ['id', 'name', 'age'],
            'rows': [
                [1, 'Alice', 30],
                [2, 'Bob', 25],
            ],
            'row_count': 2,
            'execution_time_ms': 45
        }
        
        # Log the query
        query_log = DatasetQuery.objects.create(
            dataset_version=version,
            query_sql=query_sql,
            executed_by=request.user,
            execution_time_ms=result['execution_time_ms'],
            rows_returned=result['row_count'],
            success=True
        )
        
        serializer = DatasetQueryResultSerializer(result)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """
        Preview first N rows of the dataset.
        """
        dataset = self.get_object()
        version_number = request.query_params.get('version', dataset.current_version)
        limit = int(request.query_params.get('limit', 100))
        
        try:
            version = dataset.versions.get(version_number=version_number)
        except DatasetVersion.DoesNotExist:
            return Response({
                'error': f'Version {version_number} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # TODO: Call compute engine to get preview
        # result = compute_engine.preview_dataset(
        #     table_name=version.storage_table_name,
        #     limit=limit
        # )
        
        # Mock response
        result = {
            'columns': ['id', 'name', 'age'],
            'rows': [[1, 'Alice', 30], [2, 'Bob', 25]],
            'row_count': 2,
            'execution_time_ms': 12
        }
        
        serializer = DatasetQueryResultSerializer(result)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def lineage(self, request, pk=None):
        """
        Get full lineage graph for the dataset.
        """
        dataset = self.get_object()
        version_number = request.query_params.get('version', dataset.current_version)
        
        try:
            version = dataset.versions.get(version_number=version_number)
        except DatasetVersion.DoesNotExist:
            return Response({
                'error': f'Version {version_number} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        lineage = version.lineage.all()
        serializer = DatasetLineageSerializer(lineage, many=True)
        
        return Response({
            'dataset': dataset.name,
            'version': version.version_number,
            'lineage': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def quality_report(self, request, pk=None):
        """
        Get data quality report for the latest version.
        """
        dataset = self.get_object()
        version = dataset.get_latest_version()
        
        if not version:
            return Response({
                'error': 'No versions available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'version': version.version_number,
            'quality_score': version.quality_score,
            'metrics': {
                'total_rows': version.row_count,
                'total_columns': version.column_count,
                'null_percentage': version.null_percentage,
                'duplicate_count': version.duplicate_count,
                'outlier_count': version.outlier_count,
            },
            'column_profiles': version.column_profiles
        })
    
    @action(detail=True, methods=['get'])
    def query_history(self, request, pk=None):
        """
        Get query history for this dataset.
        """
        dataset = self.get_object()
        
        # Get all queries across all versions
        queries = DatasetQuery.objects.filter(
            dataset_version__dataset=dataset
        ).select_related('dataset_version', 'executed_by')
        
        # Filter by success status
        success = request.query_params.get('success')
        if success is not None:
            queries = queries.filter(success=success.lower() == 'true')
        
        # Pagination
        page = self.paginate_queryset(queries)
        if page is not None:
            serializer = DatasetQuerySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = DatasetQuerySerializer(queries, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='versions/(?P<version_number>[0-9]+)')
    def delete_version(self, request, pk=None, version_number=None):
        """
        Delete a specific version (soft delete).
        Cannot delete if it's the only version or current version.
        """
        dataset = self.get_object()
        
        try:
            version = dataset.versions.get(version_number=version_number)
        except DatasetVersion.DoesNotExist:
            return Response({
                'error': f'Version {version_number} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if it's the only version
        if dataset.versions.count() == 1:
            return Response({
                'error': 'Cannot delete the only version'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if it's the current version
        if version.version_number == dataset.current_version:
            return Response({
                'error': 'Cannot delete the current version. Set a different version as current first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Delete from DuckDB
        # compute_engine.delete_table(version.storage_table_name)
        
        # Delete the version
        version.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """
        Export dataset to a file format (CSV, Parquet, etc.)
        """
        dataset = self.get_object()
        version_number = request.data.get('version', dataset.current_version)
        format_type = request.data.get('format', 'csv')  # csv, parquet, json
        
        try:
            version = dataset.versions.get(version_number=version_number)
        except DatasetVersion.DoesNotExist:
            return Response({
                'error': f'Version {version_number} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # TODO: Call compute engine to export
        # file_path = compute_engine.export_dataset(
        #     table_name=version.storage_table_name,
        #     format=format_type
        # )
        
        return Response({
            'status': 'export_started',
            'message': f'Exporting dataset to {format_type} format',
            'version': version.version_number
        })