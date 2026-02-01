from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """Extended User model"""
    
    class AccountState(models.TextChoices):
        INVITED = 'invited', _('Invited but not registered')
        REGISTERED = 'registered', _('Registered but not onboarded')
        ACTIVE = 'active', _('Active')
        SUSPENDED = 'suspended', _('Suspended')
    
    class ProfileVisibility(models.TextChoices):
        PUBLIC = 'public', _('Public')
        WORKSPACE = 'workspace', _('Workspace Members Only')
        PRIVATE = 'private', _('Private')
    
    email = models.EmailField(_('email address'), unique=True)
    account_state = models.CharField(
        max_length=20,
        choices=AccountState.choices,
        default=AccountState.REGISTERED
    )
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True
    )
    profile_visibility = models.CharField(
        max_length=20,
        choices=ProfileVisibility.choices,
        default=ProfileVisibility.WORKSPACE
    )
    show_active_status = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    offline_grace_expires = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email

class Profile(models.Model):
    """User profile with additional information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    organization = models.CharField(max_length=255, blank=True)
    job_title = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    
    # Preferences
    theme = models.CharField(max_length=20, default='light')
    
    # Email notification preferences
    email_notifications_enabled = models.BooleanField(default=True)
    email_project_invitations = models.BooleanField(default=True)
    email_project_updates = models.BooleanField(default=True)
    email_project_comments = models.BooleanField(default=True)
    email_workspace_invitations = models.BooleanField(default=True)
    email_workspace_activity = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile of {self.user.email}"

class UserSession(models.Model):
    """Track active user sessions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=255, unique=True)
    device_info = models.CharField(max_length=500, blank=True)
    ip_address = models.GenericIPAddressField(null=True)
    location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-last_activity']
    
    def __str__(self):
        return f"{self.user.email} - {self.device_info}"

class Notification(models.Model):
    """User notifications"""
    class NotificationType(models.TextChoices):
        PROJECT_INVITATION = 'project_invitation', _('Project Invitation')
        PROJECT_UPDATE = 'project_update', _('Project Update')
        PROJECT_COMMENT = 'project_comment', _('Project Comment')
        WORKSPACE_INVITATION = 'workspace_invitation', _('Workspace Invitation')
        WORKSPACE_ACTIVITY = 'workspace_activity', _('Workspace Activity')
        SYSTEM = 'system', _('System Notification')
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    
    read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"