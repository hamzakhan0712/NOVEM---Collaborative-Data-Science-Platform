from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
     
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    
    # JWT Token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile - Simple endpoint for session check
    path('profile/', views.get_profile, name='profile'),
    
    # Profile - Detailed endpoints
    path('profile/detail/', views.ProfileView.as_view(), name='profile_detail'),
    path('profile/update/', views.UpdateProfileView.as_view(), name='update_profile'),
    
    # Current user (alternative)
    path('me/', views.current_user, name='current_user'),
    
    # Password Management
    path('password-reset/', views.PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('password/change/', views.ChangePasswordView.as_view(), name='change_password'),
    
    # Security Settings
    path('security/settings/', views.SecuritySettingsView.as_view(), name='security_settings'),
    
    # Account Management
    path('account/stats/', views.AccountStatsView.as_view(), name='account_stats'),
    path('account/export/', views.ExportAccountDataView.as_view(), name='export_account_data'),
    path('account/sessions/', views.ActiveSessionsView.as_view(), name='active_sessions'),
    path('account/cache/clear/', views.ClearLocalCacheView.as_view(), name='clear_cache'),
    path('account/delete/', views.DeleteAccountView.as_view(), name='delete_account'),
    
    # Notifications
    path('notifications/', views.NotificationsView.as_view(), name='notifications'),
    path('notifications/<int:notification_id>/read/', views.MarkNotificationReadView.as_view(), name='mark_notification_read'),
    path('notifications/read-all/', views.MarkAllNotificationsReadView.as_view(), name='mark_all_notifications_read'),
    
    # Onboarding
    path('onboarding/complete/', views.CompleteOnboardingView.as_view(), name='complete_onboarding'),
]