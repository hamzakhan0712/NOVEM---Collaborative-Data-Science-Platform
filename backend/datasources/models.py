from django.db import models
from django.conf import settings
from django.core.validators import URLValidator
from cryptography.fernet import Fernet
import json

class DataSource(models.Model):
    """
    Defines a data source configuration (not the actual data).
    Sources can be owned at different scopes and have encrypted credentials.
    """
    
    SOURCE_TYPES = [
        ('local_file', 'Local File (CSV/Excel)'),
        ('postgres', 'PostgreSQL Database'),
        ('mysql', 'MySQL Database'),
        ('api', 'REST API'),
        ('google_sheets', 'Google Sheets'),
        ('stripe', 'Stripe'),
        ('salesforce', 'Salesforce'),
        ('shopify', 'Shopify'),
    ]
    
    OWNERSHIP_SCOPES = [
        ('personal', 'Personal'),
        ('project', 'Project'),
        ('workspace', 'Workspace'),
    ]
    
    STATES = [
        ('draft', 'Draft'),
        ('validating', 'Validating'),
        ('active', 'Active'),
        ('failed', 'Failed'),
        ('archived', 'Archived'),
    ]
    
    # Core fields
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_type = models.CharField(max_length=50, choices=SOURCE_TYPES)
    
    # Ownership
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_data_sources'
    )
    ownership_scope = models.CharField(max_length=20, choices=OWNERSHIP_SCOPES)
    
    # Scope relationships (only one should be set based on ownership_scope)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='data_sources'
    )
    workspace = models.ForeignKey(
        'workspaces.Workspace',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='data_sources'
    )
    
    # State management
    state = models.CharField(max_length=20, choices=STATES, default='draft')
    
    # Connection configuration (non-sensitive)
    config = models.JSONField(default=dict, blank=True)
    # Example config for postgres: {"host": "localhost", "port": 5432, "database": "mydb"}
    # Example config for api: {"base_url": "https://api.example.com", "version": "v1"}
    
    # Schema cache (populated after validation)
    cached_schema = models.JSONField(null=True, blank=True)
    schema_last_updated = models.DateTimeField(null=True, blank=True)
    
    # Validation
    last_validated = models.DateTimeField(null=True, blank=True)
    validation_error = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_data_sources'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'ownership_scope']),
            models.Index(fields=['project']),
            models.Index(fields=['workspace']),
            models.Index(fields=['state']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_source_type_display()})"
    
    def get_credentials(self):
        """Retrieve decrypted credentials"""
        try:
            credential = self.credentials.first()
            if credential:
                return credential.decrypt()
            return None
        except Exception as e:
            return None
    
    def can_access(self, user):
        """Check if user can access this data source"""
        if self.ownership_scope == 'personal':
            return self.owner == user
        elif self.ownership_scope == 'project':
            return self.project and self.project.members.filter(id=user.id).exists()
        elif self.ownership_scope == 'workspace':
            return self.workspace and self.workspace.members.filter(id=user.id).exists()
        return False


class DataSourceCredential(models.Model):
    """
    Encrypted credentials for data sources.
    Separate model for security - credentials are encrypted at rest.
    """
    
    data_source = models.ForeignKey(
        DataSource,
        on_delete=models.CASCADE,
        related_name='credentials'
    )
    
    # Encrypted credential data
    encrypted_data = models.BinaryField()
    # Will store encrypted JSON: {"username": "...", "password": "...", "api_key": "..."}
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def encrypt(self, credential_dict):
        """Encrypt and store credentials"""
        # Use the encryption key from settings
        key = settings.ENCRYPTION_KEY.encode()
        fernet = Fernet(key)
        
        # Convert dict to JSON and encrypt
        credential_json = json.dumps(credential_dict)
        self.encrypted_data = fernet.encrypt(credential_json.encode())
    
    def decrypt(self):
        """Decrypt and return credentials as dict"""
        try:
            key = settings.ENCRYPTION_KEY.encode()
            fernet = Fernet(key)
            
            # Decrypt and parse JSON
            decrypted_bytes = fernet.decrypt(bytes(self.encrypted_data))
            credential_json = decrypted_bytes.decode()
            return json.loads(credential_json)
        except Exception as e:
            raise ValueError(f"Failed to decrypt credentials: {str(e)}")
    
    def __str__(self):
        return f"Credentials for {self.data_source.name}"


class DataSourcePermission(models.Model):
    """
    Explicit permissions for data sources.
    Controls who can use a data source in their pipelines.
    """
    
    PERMISSION_LEVELS = [
        ('view', 'View Only'),
        ('use', 'Use in Pipelines'),
        ('admin', 'Full Admin'),
    ]
    
    data_source = models.ForeignKey(
        DataSource,
        on_delete=models.CASCADE,
        related_name='permissions'
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='data_source_permissions'
    )
    
    permission_level = models.CharField(max_length=20, choices=PERMISSION_LEVELS)
    
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='granted_data_source_permissions'
    )
    
    class Meta:
        unique_together = ['data_source', 'user']
        ordering = ['-granted_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.permission_level} on {self.data_source.name}"