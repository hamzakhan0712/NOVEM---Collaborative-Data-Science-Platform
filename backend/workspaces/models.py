from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Workspace(models.Model):
    """
    Organization, team, or personal workspace
    Workspaces are ownership boundaries that don't automatically grant project access
    """
    
    class WorkspaceType(models.TextChoices):
        PERSONAL = 'personal', _('Personal')
        TEAM = 'team', _('Team')
        ORGANIZATION = 'organization', _('Organization')
        CLIENT = 'client', _('Client')
    
    class Visibility(models.TextChoices):
        PRIVATE = 'private', _('Private')
        INTERNAL = 'internal', _('Internal - Members Only')
        PUBLIC = 'public', _('Public - Discoverable')
    
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    workspace_type = models.CharField(
        max_length=20,
        choices=WorkspaceType.choices,
        default=WorkspaceType.PERSONAL
    )
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PRIVATE
    )
    
    # Ownership
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_workspaces'
    )
    
    # Members relationship - FIXED
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='WorkspaceMembership',
        through_fields=('workspace', 'user'),
        related_name='member_workspaces'  # Changed from 'workspaces' to avoid conflicts
    )
    
    # Settings
    default_project_visibility = models.CharField(
        max_length=20,
        default='private'
    )
    allow_member_project_creation = models.BooleanField(default=True)
    require_join_approval = models.BooleanField(default=True)
    
    # Metadata
    # Metadata - support both file upload and URL
    avatar = models.ImageField(
        upload_to='workspace_avatars/',
        blank=True,
        null=True,
        help_text='Workspace avatar image file'
    )
    avatar_url = models.URLField(
        blank=True,
        null=True,
        help_text='External avatar URL'
    )

    
    website = models.URLField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Offline sync tracking
    last_synced = models.DateTimeField(null=True, blank=True)
    sync_version = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['owner', '-updated_at']),
            models.Index(fields=['workspace_type', 'visibility']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_workspace_type_display()})"
    
    def increment_sync_version(self):
        """Increment version for offline sync tracking"""
        self.sync_version += 1
        self.save(update_fields=['sync_version'])
        
    @property
    def get_avatar(self):
        """Get avatar URL (prioritize uploaded file over URL)"""
        if self.avatar:
            try:
                return self.avatar.url
            except:
                pass
        return self.avatar_url

class WorkspaceMembership(models.Model):
    """
    Workspace membership with roles
    Being a workspace member does NOT automatically grant access to all projects
    """
    
    class Role(models.TextChoices):
        OWNER = 'owner', _('Owner')
        ADMIN = 'admin', _('Admin')
        MEMBER = 'member', _('Member')
        GUEST = 'guest', _('Guest')
    
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    
    # Permissions
    can_create_projects = models.BooleanField(default=True)
    can_invite_members = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
    
    # Metadata
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workspace_invitations_sent'
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    
    # Offline sync
    local_only = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['workspace', 'user']
        ordering = ['workspace', '-joined_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.workspace.name} ({self.role})"

class WorkspaceInvitation(models.Model):
    """Workspace invitations sent by owners/admins"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        ACCEPTED = 'accepted', _('Accepted')
        DECLINED = 'declined', _('Declined')
        EXPIRED = 'expired', _('Expired')
    
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='invitations')
    inviter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_workspace_invitations')
    invitee_email = models.EmailField()
    invitee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='received_workspace_invitations')
    role = models.CharField(max_length=20, choices=WorkspaceMembership.Role.choices, default=WorkspaceMembership.Role.MEMBER)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        ordering = ['-invited_at']
        indexes = [
            models.Index(fields=['workspace', 'invitee_email', 'status']),
            models.Index(fields=['invitee', 'status']),
        ]
    
    def __str__(self):
        return f"Invitation to {self.invitee_email} for {self.workspace.name} ({self.status})"
    
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at and self.status == self.Status.PENDING
    
    
    
class WorkspaceJoinRequest(models.Model):
    """
    Join requests from users wanting to join a workspace
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
    
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='join_requests'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_join_requests'
    )
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workspace_join_requests_reviewed'
    )
    
    class Meta:
        unique_together = ['workspace', 'user', 'status']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workspace', 'status']),
            models.Index(fields=['user', 'status']),
        ]
    
    def __str__(self):
        return f"{self.user.email} requesting to join {self.workspace.name} ({self.status})"
    