from audit.models import AuditLog
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Q
from datetime import timedelta
import json
import csv
import logging

from .serializers import (
    RegisterSerializer, LoginSerializer, 
    UserSerializer, ProfileSerializer, UpdateProfileSerializer,
    ProfileDetailSerializer, OnboardingSerializer,
    ChangePasswordSerializer, UserSessionSerializer,
    NotificationSerializer, SecuritySettingsSerializer
)
from .models import User, Profile, UserSession, Notification
from projects.models import Project, ProjectMembership
from workspaces.models import Workspace, WorkspaceMembership

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    """User registration - Creates user account with REGISTERED state"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        logger.info(f"User registered: {user.email} (state: {user.account_state})")
        
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    """User login with enhanced error handling"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        user = authenticate(email=email, password=password)
        
        if user is None:
            logger.warning(f"Failed login attempt for: {email}")
            return Response(
                {'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if user.account_state == User.AccountState.SUSPENDED:
            logger.warning(f"Suspended account login attempt: {email}")
            return Response(
                {'detail': 'Your account has been suspended. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.last_sync = timezone.now()
        user.save(update_fields=['last_sync'])
        
        # Create session record
        UserSession.objects.create(
            user=user,
            session_key=str(RefreshToken.for_user(user)),
            device_info=request.META.get('HTTP_USER_AGENT', 'Unknown'),
            ip_address=self.get_client_ip(request)
        )
        
        refresh = RefreshToken.for_user(user)
        
        logger.info(f"User logged in: {email} (state: {user.account_state})")
        
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class LogoutView(APIView):
    """User logout with token blacklisting"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                
                # Mark session as inactive
                UserSession.objects.filter(
                    user=request.user,
                    session_key=str(token)
                ).update(is_active=False)
                
                logger.info(f"User logged out: {request.user.email}")
            return Response({'message': 'Logout successful'})
        except TokenError as e:
            logger.error(f"Token blacklist error: {str(e)}")
            return Response(
                {'error': 'Invalid token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return Response(
                {'error': 'Logout failed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class ProfileView(generics.RetrieveAPIView):
    """Get detailed user profile"""
    serializer_class = ProfileDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user.profile
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class UpdateProfileView(generics.UpdateAPIView):
    """Update user profile"""
    serializer_class = UpdateProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user.profile
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        logger.info(f"Profile updated: {request.user.email}")
        
        return Response({
            'user': UserSerializer(request.user, context={'request': request}).data,
            'profile': ProfileSerializer(instance).data
        })

class PasswordResetRequestView(APIView):
    """Request password reset"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            reset_url = f"{settings.FRONTEND_URL}/password-reset/confirm?uid={uid}&token={token}"
            
            print("\n" + "="*80)
            print("PASSWORD RESET EMAIL")
            print("="*80)
            print(f"To: {email}")
            print(f"Subject: Reset Your NOVEM Password")
            print("-"*80)
            print(f"Hello {user.first_name or user.username},")
            print()
            print("You requested to reset your password for your NOVEM account.")
            print()
            print("Click the link below to reset your password:")
            print(reset_url)
            print()
            print("This link will expire in 1 hour.")
            print()
            print("If you didn't request this, please ignore this email.")
            print()
            print("Best regards,")
            print("The NOVEM Team")
            print("="*80 + "\n")
            
            logger.info(f"Password reset requested for: {email}")
            
            return Response({
                'message': 'Password reset email sent',
                'uid': uid,
                'token': token,
                'reset_url': reset_url
            })
            
        except User.DoesNotExist:
            logger.warning(f"Password reset attempted for non-existent email: {email}")
            return Response({
                'message': 'If the email exists, a reset link has been sent'
            })

class PasswordResetConfirmView(APIView):
    """Confirm password reset"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not all([uid, token, new_password]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                
                logger.info(f"Password reset completed for: {user.email}")
                return Response({'message': 'Password reset successful'})
            else:
                logger.warning(f"Invalid/expired token for password reset: {user.email}")
                return Response(
                    {'error': 'Invalid or expired token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except (User.DoesNotExist, ValueError, TypeError) as e:
            logger.error(f"Password reset error: {str(e)}")
            return Response(
                {'error': 'Invalid reset link'},
                status=status.HTTP_400_BAD_REQUEST
            )

class CompleteOnboardingView(APIView):
    """Complete user onboarding - Updates profile and sets account state to ACTIVE"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if user.account_state == User.AccountState.ACTIVE:
            logger.info(f"User already onboarded: {user.email}")
            return Response({
                'message': 'Onboarding already completed',
                'user': UserSerializer(user, context={'request': request}).data,
                'profile': ProfileSerializer(user.profile).data
            })
        
        if user.account_state == User.AccountState.SUSPENDED:
            logger.warning(f"Suspended user attempted onboarding: {user.email}")
            return Response(
                {'error': 'Account is suspended'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = OnboardingSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Onboarding validation failed for {user.email}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        user.first_name = data['first_name']
        user.last_name = data['last_name']
        user.account_state = User.AccountState.ACTIVE
        user.save()
        
        profile, created = Profile.objects.get_or_create(user=user)
        profile.bio = data.get('bio', '')
        profile.organization = data['organization']
        profile.job_title = data['job_title']
        profile.location = data['location']
        profile.save()
        
        try:
            AuditLog.objects.create(
                user=user,
                action='onboarding_completed',
                resource_type='user',
                resource_id=user.id,
                details={
                    'organization': profile.organization,
                    'job_title': profile.job_title,
                    'location': profile.location,
                }
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
        
        user.refresh_from_db()
        
        logger.info(f"Onboarding completed: {user.email}")
        
        return Response({
            'message': 'Onboarding completed successfully',
            'user': UserSerializer(user, context={'request': request}).data,
            'profile': ProfileSerializer(profile).data
        })

class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        
        # Check current password
        if not user.check_password(serializer.validated_data['current_password']):
            return Response(
                {'current_password': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Invalidate all sessions except current
        UserSession.objects.filter(user=user).exclude(
            session_key=request.auth.token if hasattr(request, 'auth') else None
        ).update(is_active=False)
        
        logger.info(f"Password changed for: {user.email}")
        
        # Create audit log
        try:
            AuditLog.objects.create(
                user=user,
                action='password_changed',
                resource_type='user',
                resource_id=user.id,
                details={'timestamp': timezone.now().isoformat()}
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
        
        return Response({
            'message': 'Password changed successfully'
        })

class SecuritySettingsView(APIView):
    """Update security settings"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'profile_visibility': user.profile_visibility,
            'show_active_status': user.show_active_status
        })
    
    def patch(self, request):
        serializer = SecuritySettingsSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        
        if 'profile_visibility' in serializer.validated_data:
            user.profile_visibility = serializer.validated_data['profile_visibility']
        
        if 'show_active_status' in serializer.validated_data:
            user.show_active_status = serializer.validated_data['show_active_status']
        
        user.save()
        
        logger.info(f"Security settings updated for: {user.email}")
        
        return Response({
            'message': 'Security settings updated',
            'profile_visibility': user.profile_visibility,
            'show_active_status': user.show_active_status
        })

# ...existing code...

class AccountStatsView(APIView):
    """Get account statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Calculate statistics
        projects_count = ProjectMembership.objects.filter(user=user).count()
        workspaces_count = WorkspaceMembership.objects.filter(user=user).count()
        
        # Activity in last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_activity = AuditLog.objects.filter(
            user=user,
            timestamp__gte=thirty_days_ago  # Changed from created_at to timestamp
        ).count()
        
        # Account age
        account_age_days = (timezone.now() - user.created_at).days
        
        return Response({
            'projects_count': projects_count,
            'workspaces_count': workspaces_count,
            'recent_activity_count': recent_activity,
            'account_age_days': account_age_days,
            'member_since': user.created_at,
            'last_login': user.last_sync
        })

# ...existing code...

class ExportAccountDataView(APIView):
    """Export user account data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Collect all user data
        data = {
            'user_info': {
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'account_state': user.account_state,
                'created_at': user.created_at.isoformat(),
            },
            'profile': {
                'bio': user.profile.bio,
                'organization': user.profile.organization,
                'job_title': user.profile.job_title,
                'location': user.profile.location,
                'website': user.profile.website,
            },
            'projects': list(ProjectMembership.objects.filter(user=user).values(
                'project__name', 'role', 'joined_at'
            )),
            'workspaces': list(WorkspaceMembership.objects.filter(user=user).values(
                'workspace__name', 'role', 'joined_at'
            )),
            'activity_logs': list(AuditLog.objects.filter(user=user).values(
                'action', 'resource_type', 'timestamp'  # Changed from created_at to timestamp
            )[:100]),  # Last 100 activities
        }
        
        # Create JSON response
        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="novem_account_data_{user.username}.json"'
        
        logger.info(f"Account data exported for: {user.email}")
        
        return response

# ...existing code...

class ActiveSessionsView(APIView):
    """Get active user sessions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        sessions = UserSession.objects.filter(
            user=request.user,
            is_active=True
        ).order_by('-last_activity')
        
        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    def delete(self, request):
        """Terminate specific session or all sessions"""
        session_id = request.data.get('session_id')
        
        if session_id == 'all':
            # Terminate all sessions except current
            UserSession.objects.filter(user=request.user).exclude(
                session_key=str(request.auth) if hasattr(request, 'auth') else None
            ).update(is_active=False)
            
            logger.info(f"All sessions terminated for: {request.user.email}")
            return Response({'message': 'All other sessions terminated'})
        
        elif session_id:
            # Terminate specific session
            UserSession.objects.filter(
                user=request.user,
                id=session_id
            ).update(is_active=False)
            
            logger.info(f"Session {session_id} terminated for: {request.user.email}")
            return Response({'message': 'Session terminated'})
        
        return Response(
            {'error': 'session_id required'},
            status=status.HTTP_400_BAD_REQUEST
        )

class ClearLocalCacheView(APIView):
    """Clear user's local cache"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # This is primarily handled on the frontend
        # Backend just logs the action
        logger.info(f"Cache clear requested by: {request.user.email}")
        
        try:
            AuditLog.objects.create(
                user=request.user,
                action='cache_cleared',
                resource_type='user',
                resource_id=request.user.id,
                details={'timestamp': timezone.now().isoformat()}
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
        
        return Response({'message': 'Cache clear signal sent'})

class DeleteAccountView(APIView):
    """Delete user account"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        password = request.data.get('password')
        confirmation = request.data.get('confirmation')
        
        if not password or confirmation != 'DELETE':
            return Response(
                {'error': 'Password and DELETE confirmation required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        # Verify password
        if not user.check_password(password):
            return Response(
                {'error': 'Incorrect password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log deletion
        logger.warning(f"Account deletion requested by: {user.email}")
        
        try:
            AuditLog.objects.create(
                user=user,
                action='account_deleted',
                resource_type='user',
                resource_id=user.id,
                details={
                    'timestamp': timezone.now().isoformat(),
                    'email': user.email
                }
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
        
        # Delete user (cascade will handle related objects)
        user.delete()
        
        return Response({'message': 'Account deleted successfully'})

# Notification views
class NotificationsView(APIView):
    """Get user notifications"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)
        
        # Filter by read status if specified
        read_status = request.query_params.get('read')
        if read_status is not None:
            notifications = notifications.filter(read=(read_status.lower() == 'true'))
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

class MarkNotificationReadView(APIView):
    """Mark notification as read"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=request.user
            )
            notification.read = True
            notification.read_at = timezone.now()
            notification.save()
            
            return Response({'message': 'Notification marked as read'})
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class MarkAllNotificationsReadView(APIView):
    """Mark all notifications as read"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        Notification.objects.filter(
            user=request.user,
            read=False
        ).update(read=True, read_at=timezone.now())
        
        return Response({'message': 'All notifications marked as read'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get current user profile"""
    return Response(UserSerializer(request.user, context={'request': request}).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Simple health check endpoint for connectivity testing"""
    return Response({
        'status': 'ok',
        'timestamp': timezone.now().isoformat(),
        'service': 'NOVEM Backend API'
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user"""
    return Response(UserSerializer(request.user, context={'request': request}).data)