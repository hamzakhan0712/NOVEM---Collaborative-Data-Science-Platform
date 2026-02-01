from audit.models import AuditLog

class AuditMiddleware:
    """Middleware to log important actions"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Log specific actions
        if request.user.is_authenticated and request.method in ['POST', 'PUT', 'DELETE']:
            self.log_action(request, response)
        
        return response
    
    def log_action(self, request, response):
        if response.status_code < 400:  # Only log successful actions
            path = request.path
            
            # Determine action from path
            action_map = {
                '/api/projects/': 'project_action',
            }
            
            for path_prefix, action in action_map.items():
                if path.startswith(path_prefix):
                    AuditLog.objects.create(
                        user=request.user,
                        action=f"{request.method.lower()}_{action}",
                        resource_type=path_prefix.split('/')[2],
                        ip_address=self.get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    )
                    break
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip