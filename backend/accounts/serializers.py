from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, UserSession, Notification
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class ProfileSerializer(serializers.ModelSerializer):
    """Profile serializer without user details to avoid circular reference"""
    
    class Meta:
        model = Profile
        fields = [
            'bio', 'organization', 'job_title', 'location', 
            'website', 'theme',
            'email_notifications_enabled',
            'email_project_invitations',
            'email_project_updates',
            'email_project_comments',
            'email_workspace_invitations',
            'email_workspace_activity'
        ]

class UserSerializer(serializers.ModelSerializer):
    is_onboarding_complete = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 
            'account_state', 'profile_picture', 'profile_picture_url',
            'profile_visibility', 'show_active_status',
            'is_onboarding_complete', 'created_at', 'profile'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_is_onboarding_complete(self, obj):
        """Check if user has completed onboarding"""
        return obj.account_state == User.AccountState.ACTIVE
    
    def get_profile(self, obj):
        """Include profile data in user serialization"""
        try:
            return ProfileSerializer(obj.profile).data
        except Profile.DoesNotExist:
            return None
    
    def get_profile_picture_url(self, obj):
        """Get full URL for profile picture"""
        if obj.profile_picture:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.profile_picture.url)
        return None

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info without profile for use in ProfileDetailSerializer"""
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 
            'account_state', 'profile_picture', 'profile_picture_url',
            'profile_visibility', 'show_active_status', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_profile_picture_url(self, obj):
        """Get full URL for profile picture"""
        if obj.profile_picture:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.profile_picture.url)
        return None

class ProfileDetailSerializer(serializers.ModelSerializer):
    """Detailed profile serializer with basic user info"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Profile
        fields = [
            'user', 'bio', 'organization', 'job_title', 'location', 
            'website', 'theme',
            'email_notifications_enabled',
            'email_project_invitations',
            'email_project_updates',
            'email_project_comments',
            'email_workspace_invitations',
            'email_workspace_activity'
        ]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 
                  'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            **validated_data,
            account_state=User.AccountState.REGISTERED
        )
        Profile.objects.create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating profile"""
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Profile
        fields = [
            'bio', 'organization', 'job_title', 'location', 
            'website', 'theme',
            'email_notifications_enabled',
            'email_project_invitations',
            'email_project_updates',
            'email_project_comments',
            'email_workspace_invitations',
            'email_workspace_activity',
            'first_name', 'last_name', 'profile_picture'
        ]
    
    def update(self, instance, validated_data):
        user = instance.user
        
        # Update user fields
        if 'first_name' in validated_data:
            user.first_name = validated_data.pop('first_name')
        if 'last_name' in validated_data:
            user.last_name = validated_data.pop('last_name')
        if 'profile_picture' in validated_data:
            user.profile_picture = validated_data.pop('profile_picture')
        
        user.save()
        
        return super().update(instance, validated_data)

class OnboardingSerializer(serializers.Serializer):
    """Serializer for onboarding completion"""
    first_name = serializers.CharField(required=True, min_length=2)
    last_name = serializers.CharField(required=True, min_length=2)
    bio = serializers.CharField(required=False, allow_blank=True)
    organization = serializers.CharField(required=True, min_length=2)
    job_title = serializers.CharField(required=True, min_length=2)
    location = serializers.CharField(required=True, min_length=2)
    
    def validate(self, data):
        if not data.get('first_name') or not data.get('last_name'):
            raise serializers.ValidationError({
                "detail": "First name and last name are required"
            })
        
        if not data.get('organization') or not data.get('job_title') or not data.get('location'):
            raise serializers.ValidationError({
                "detail": "Organization, job title, and location are required"
            })
        
        return data

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password": "New passwords do not match"
            })
        
        # Validate new password strength
        try:
            validate_password(data['new_password'])
        except Exception as e:
            raise serializers.ValidationError({
                "new_password": list(e.messages)
            })
        
        return data

class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for user sessions"""
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'session_key', 'device_info', 'ip_address',
            'location', 'created_at', 'last_activity', 'is_active'
        ]
        read_only_fields = fields

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'data',
            'read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']

class SecuritySettingsSerializer(serializers.Serializer):
    """Serializer for security settings"""
    profile_visibility = serializers.ChoiceField(
        choices=User.ProfileVisibility.choices,
        required=False
    )
    show_active_status = serializers.BooleanField(required=False)