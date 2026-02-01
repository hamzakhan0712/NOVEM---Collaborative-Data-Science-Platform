from rest_framework import serializers
from .models import Workspace, WorkspaceMembership, WorkspaceInvitation, WorkspaceJoinRequest
from accounts.serializers import UserSerializer

class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    
    class Meta:
        model = WorkspaceMembership
        fields = [
            'id', 'workspace', 'workspace_name', 'user', 'role',
            'can_create_projects', 'can_invite_members', 'can_manage_settings',
            'joined_at', 'local_only'
        ]
        read_only_fields = ['id', 'joined_at']

class WorkspaceListSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()
    current_user_permissions = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'slug', 'description', 'workspace_type', 'visibility',
            'owner', 'member_count', 'project_count', 'current_user_role',
            'current_user_permissions',
            'avatar', 'created_at', 'updated_at', 'sync_version'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'sync_version']
    
    def get_member_count(self, obj):
        """Count all workspace members"""
        return obj.workspacemembership_set.count()
    
    def get_project_count(self, obj):
        """Count all projects in this workspace"""
        try:
            return obj.projects.count()
        except AttributeError:
            # If projects relationship doesn't exist yet
            return 0
    
    def get_current_user_role(self, obj):
        """Get current user's role in this workspace"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        # Check if owner
        if obj.owner_id == request.user.id:
            return 'owner'
        
        # Get membership
        try:
            membership = obj.workspacemembership_set.filter(user=request.user).first()
            return membership.role if membership else None
        except Exception as e:
            print(f"Error getting role: {e}")
            return None
    
    def get_current_user_permissions(self, obj):
        """Get user's permissions in this workspace"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return {
                'is_owner': False,
                'is_admin': False,
                'can_create_projects': False,
                'can_invite_members': False,
                'can_manage_settings': False,
                'can_delete_workspace': False,
            }
        
        is_owner = obj.owner_id == request.user.id
        
        # If owner, grant all permissions
        if is_owner:
            return {
                'is_owner': True,
                'is_admin': True,
                'can_create_projects': True,
                'can_invite_members': True,
                'can_manage_settings': True,
                'can_delete_workspace': True,
            }
        
        # Get membership permissions
        try:
            membership = obj.workspacemembership_set.filter(user=request.user).first()
            if membership:
                is_admin = membership.role in ['owner', 'admin']
                return {
                    'is_owner': False,
                    'is_admin': is_admin,
                    'can_create_projects': membership.can_create_projects,
                    'can_invite_members': membership.can_invite_members,
                    'can_manage_settings': membership.can_manage_settings,
                    'can_delete_workspace': False,
                }
        except Exception as e:
            print(f"Error getting permissions: {e}")
        
        # Default - no permissions
        return {
            'is_owner': False,
            'is_admin': False,
            'can_create_projects': False,
            'can_invite_members': False,
            'can_manage_settings': False,
            'can_delete_workspace': False,
        }
    
    def get_avatar(self, obj):
        """Get avatar URL"""
        return obj.get_avatar

class WorkspaceDetailSerializer(WorkspaceListSerializer):
    memberships = WorkspaceMembershipSerializer(
        source='workspacemembership_set',
        many=True,
        read_only=True
    )
    
    class Meta(WorkspaceListSerializer.Meta):
        fields = WorkspaceListSerializer.Meta.fields + [
            'memberships',
            'default_project_visibility', 'allow_member_project_creation',
            'require_join_approval', 'website'
        ]

class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = [
            'name', 'description', 'workspace_type', 'visibility',
            'default_project_visibility', 'allow_member_project_creation',
            'require_join_approval', 'website', 'avatar'
        ]
        extra_kwargs = {
            'name': {'required': True},
            'workspace_type': {'required': True},
            'visibility': {'required': True},
            'description': {'required': False, 'allow_blank': True},
            'allow_member_project_creation': {'required': False, 'default': True},
            'default_project_visibility': {'required': False, 'default': 'private'},
            'require_join_approval': {'required': False, 'default': True},
        }
    
    def validate_name(self, value):
        """Ensure workspace name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Workspace name cannot be empty")
        return value.strip()

class WorkspaceInvitationSerializer(serializers.ModelSerializer):
    inviter = UserSerializer(read_only=True)  # ✅ Add this
    invitee = UserSerializer(read_only=True)  # ✅ Add this if not already present
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    
    class Meta:
        model = WorkspaceInvitation
        fields = [
            'id', 'workspace', 'workspace_name', 'inviter', 'invitee',
            'invitee_email', 'role', 'message', 'status',
            'invited_at', 'responded_at', 'expires_at'
        ]
        read_only_fields = ['id', 'inviter', 'status', 'invited_at', 'responded_at']
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    
    # ...existing code...

class WorkspaceJoinRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = WorkspaceJoinRequest
        fields = [
            'id', 'workspace', 'workspace_name', 'user', 'message',
            'status', 'created_at', 'reviewed_at', 'reviewed_by'
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'reviewed_at', 'reviewed_by']