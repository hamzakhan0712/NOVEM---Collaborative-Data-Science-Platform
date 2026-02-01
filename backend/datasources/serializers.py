from rest_framework import serializers
from .models import DataSource, DataSourceCredential, DataSourcePermission
from accounts.serializers import UserSerializer

class DataSourceCredentialSerializer(serializers.ModelSerializer):
    """Serializer for credential input (never outputs decrypted credentials)"""
    
    credentials = serializers.JSONField(write_only=True)
    
    class Meta:
        model = DataSourceCredential
        fields = ['credentials']
    
    def create(self, validated_data):
        credential = DataSourceCredential()
        credential.data_source = validated_data.get('data_source')
        credential.encrypt(validated_data.get('credentials'))
        credential.save()
        return credential


class DataSourcePermissionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    granted_by_user = UserSerializer(source='granted_by', read_only=True)
    
    class Meta:
        model = DataSourcePermission
        fields = [
            'id', 'user', 'permission_level', 
            'granted_at', 'granted_by_user'
        ]
        read_only_fields = ['granted_at', 'granted_by']


class DataSourceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    created_by_user = UserSerializer(source='created_by', read_only=True)
    permissions = DataSourcePermissionSerializer(many=True, read_only=True)
    has_credentials = serializers.SerializerMethodField()
    
    # For creating data sources with credentials
    credentials = serializers.JSONField(write_only=True, required=False)
    
    class Meta:
        model = DataSource
        fields = [
            'id', 'name', 'description', 'source_type', 'ownership_scope',
            'owner', 'project', 'workspace', 'state', 'config',
            'cached_schema', 'schema_last_updated', 'last_validated',
            'validation_error', 'created_at', 'updated_at',
            'created_by_user', 'permissions', 'has_credentials', 'credentials'
        ]
        read_only_fields = [
            'state', 'cached_schema', 'schema_last_updated',
            'last_validated', 'validation_error', 'created_at', 'updated_at'
        ]
    
    def get_has_credentials(self, obj):
        return obj.credentials.exists()
    
    def validate(self, data):
        # Validate ownership scope consistency
        ownership_scope = data.get('ownership_scope')
        
        if ownership_scope == 'project' and not data.get('project'):
            raise serializers.ValidationError({
                'project': 'Project is required for project-scoped data sources'
            })
        
        if ownership_scope == 'workspace' and not data.get('workspace'):
            raise serializers.ValidationError({
                'workspace': 'Workspace is required for workspace-scoped data sources'
            })
        
        if ownership_scope == 'personal':
            data['project'] = None
            data['workspace'] = None
        
        return data
    
    def create(self, validated_data):
        credentials_data = validated_data.pop('credentials', None)
        
        # Create data source
        data_source = DataSource.objects.create(**validated_data)
        
        # Create credentials if provided
        if credentials_data:
            credential = DataSourceCredential()
            credential.data_source = data_source
            credential.encrypt(credentials_data)
            credential.save()
        
        return data_source
    
    def update(self, instance, validated_data):
        credentials_data = validated_data.pop('credentials', None)
        
        # Update data source
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update credentials if provided
        if credentials_data:
            # Delete old credentials
            instance.credentials.all().delete()
            
            # Create new credentials
            credential = DataSourceCredential()
            credential.data_source = instance
            credential.encrypt(credentials_data)
            credential.save()
        
        return instance


class DataSourceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing data sources"""
    
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    has_credentials = serializers.SerializerMethodField()
    
    class Meta:
        model = DataSource
        fields = [
            'id', 'name', 'source_type', 'ownership_scope',
            'state', 'owner_name', 'last_validated',
            'created_at', 'has_credentials'
        ]
    
    def get_has_credentials(self, obj):
        return obj.credentials.exists()