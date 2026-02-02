import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { offlineManager } from './offline';

interface QueueItem {
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}

class BackendAPIService {
  public client: AxiosInstance;
  private baseURL: string = 'http://localhost:8000/api';
  private isRefreshing: boolean = false;
  private failedQueue: QueueItem[] = [];
  private tokenRefreshTimer: number | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.startTokenRefreshTimer();
  }

  async healthCheck() {
    const response = await this.client.get('/auth/health/');
    return response.data;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with offline handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // **OFFLINE DETECTION** - Network error (no response from server)
        if (!error.response) {
          console.warn('🔌 Network error detected - backend may be offline');
          
          // Notify offline manager
          offlineManager.handleNetworkError();
          
          // Check if we're within grace period
          if (offlineManager.isWithinGracePeriod()) {
            console.log('⏳ Within grace period - allowing offline operation');
            
            // Queue this operation for later sync (if it's a mutation)
            if (originalRequest.method && ['post', 'put', 'patch', 'delete'].includes(originalRequest.method.toLowerCase())) {
              offlineManager.queueOperation({
                type: 'api_call',
                endpoint: originalRequest.url || '',
                method: originalRequest.method,
                data: originalRequest.data,
                timestamp: new Date(),
              });
              
              console.log('📋 Operation queued for sync when online');
            }
            
            // Return a graceful error for the UI to handle
            return Promise.reject({
              offline: true,
              gracePeriod: true,
              message: 'Operating in offline mode. Changes will sync when online.',
              originalError: error,
            });
          } else {
            // Grace period expired
            console.error('❌ Offline grace period expired');
            return Promise.reject({
              offline: true,
              gracePeriod: false,
              expired: true,
              message: 'Your offline access has expired. Please reconnect to continue.',
              originalError: error,
            });
          }
        }

        // **401 UNAUTHORIZED** - Token refresh logic
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          // Don't retry if we're offline
          if (!navigator.onLine) {
            console.warn('📴 Offline - cannot refresh token');
            return Promise.reject({
              offline: true,
              message: 'Cannot refresh authentication while offline',
              originalError: error,
            });
          }

          if (this.isRefreshing) {
            // Queue this request while refresh is in progress
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.performTokenRefresh();
            this.processQueue(null, newToken);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // **403 FORBIDDEN** - Permissions error
        if (error.response?.status === 403) {
          console.error('🚫 Access forbidden:', error.response.data);
        }

        // **500 SERVER ERROR** - Backend issue
        if (error.response?.status >= 500) {
          console.error('🔥 Server error:', error.response.status);
          
          // If server is down, treat similar to offline
          if (error.response.status === 503 || error.response.status === 502) {
            offlineManager.handleNetworkError();
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  public async performTokenRefresh(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Check if we're online before attempting refresh
    if (!navigator.onLine) {
      console.warn('📴 Cannot refresh token while offline');
      throw new Error('Cannot refresh token while offline');
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/token/refresh/`, {
        refresh: refreshToken,
      });

      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      
      // Update refresh token if rotated
      if (refresh) {
        localStorage.setItem('refresh_token', refresh);
      }

      console.log('✅ Token refreshed successfully');
      
      // Update offline manager that we're back online
      offlineManager.markAsOnline();
      
      return access;
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      
      // If network error, handle offline mode
      if (!error.response) {
        offlineManager.handleNetworkError();
      }
      
      throw error;
    }
  }

  private handleAuthFailure() {
    console.log('🔒 Authentication failed - clearing session');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_cache');
    
    // Clear offline state on auth failure
    offlineManager.clearState();
    
    // Dispatch custom event for React to handle
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // Proactive token refresh - refresh 5 minutes before expiry
  private startTokenRefreshTimer() {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Check every minute if token needs refresh
    this.tokenRefreshTimer = setInterval(async () => {
      // Don't refresh if offline
      if (!navigator.onLine) {
        console.log('📴 Skipping token refresh - offline');
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const payload = this.decodeToken(token);
        const expiresAt = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        // Refresh if token expires in less than 5 minutes
        if (expiresAt - now < fiveMinutes) {
          console.log('⏰ Proactively refreshing token...');
          await this.performTokenRefresh();
        }
      } catch (error) {
        console.error('❌ Token refresh timer error:', error);
      }
    }, 60000); // Check every minute
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  // Validate token without making API call
  public isTokenValid(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) return false;

      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login/', { email, password });
    const { access, refresh, user } = response.data;
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_cache', JSON.stringify(user));
    
    // Mark as online after successful login
    offlineManager.markAsOnline();
    
    return response.data;
  }

  async register(userData: any) {
    const response = await this.client.post('/auth/register/', userData);
    const { access, refresh, user } = response.data;
    
    if (access && refresh) {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_cache', JSON.stringify(user));
      
      // Mark as online after successful registration
      offlineManager.markAsOnline();
    }
    
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile/');
    const user = response.data;
    localStorage.setItem('user_cache', JSON.stringify(user));
    return user;
  }

  async updateProfile(profileData: any) {
    const response = await this.client.put('/auth/profile/update/', profileData);
    return response.data;
  }

  async logout() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && navigator.onLine) {
        await this.client.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_cache');
      
      // Clear offline state
      offlineManager.clearState();
      
      if (this.tokenRefreshTimer) {
        clearInterval(this.tokenRefreshTimer);
        this.tokenRefreshTimer = null;
      }
    }
  }

  async requestPasswordReset(email: string) {
    const response = await this.client.post('/auth/password-reset/', { email });
    return response.data;
  }

  async resetPassword(uid: string, token: string, newPassword: string) {
    const response = await this.client.post('/auth/password-reset/confirm/', {
      uid,
      token,
      new_password: newPassword,
    });
    return response.data;
  }
  

  // ==================== SECURITY & PASSWORD ====================

async changePassword(currentPassword: string, newPassword: string, newPasswordConfirm: string) {
  const response = await this.client.post('/auth/password/change/', {
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirm: newPasswordConfirm
  });
  return response.data;
}

async updateSecuritySettings(settings: {
  profile_visibility?: string;
  show_active_status?: boolean;
}) {
  const response = await this.client.patch('/auth/security/settings/', settings);
  return response.data;
}

async getSecuritySettings() {
  const response = await this.client.get('/auth/security/settings/');
  return response.data;
}

// ==================== ACCOUNT MANAGEMENT ====================

async getAccountStats() {
  const response = await this.client.get('/auth/account/stats/');
  return response.data;
}

async exportAccountData() {
  const response = await this.client.get('/auth/account/export/', {
    responseType: 'blob'
  });
  return response.data;
}

async getActiveSessions() {
  const response = await this.client.get('/auth/account/sessions/');
  return response.data;
}

async terminateSession(sessionId: number | 'all') {
  const response = await this.client.delete('/auth/account/sessions/', {
    data: { session_id: sessionId }
  });
  return response.data;
}

async clearLocalCache() {
  const response = await this.client.post('/auth/account/cache/clear/');
  return response.data;
}

async deleteAccount(password: string, confirmation: string) {
  const response = await this.client.post('/auth/account/delete/', {
    password,
    confirmation
  });
  return response.data;
}

// ==================== NOTIFICATIONS ====================

async getNotifications(read?: boolean) {
  const params = read !== undefined ? { read } : {};
  const response = await this.client.get('/auth/notifications/', { params });
  return response.data;
}

async markNotificationRead(notificationId: number) {
  const response = await this.client.post(`/auth/notifications/${notificationId}/read/`);
  return response.data;
}

async markAllNotificationsRead() {
  const response = await this.client.post('/auth/notifications/read-all/');
  return response.data;
}

// ==================== PROFILE PHOTO ====================

async uploadProfilePhoto(file: File) {
  const formData = new FormData();
  formData.append('profile_picture', file);
  
  const response = await this.client.patch('/auth/profile/update/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

async deleteProfilePhoto() {
  const response = await this.client.patch('/auth/profile/update/', {
    profile_picture: null
  });
  return response.data;
}

  async completeOnboarding(profileData: {
    first_name: string;
    last_name: string;
    bio?: string;
    organization: string;
    job_title: string;
    location: string;
  }) {
    console.log('🔄 API: completeOnboarding called');
    console.log('📤 API: Sending profile data:', JSON.stringify(profileData, null, 2));
    
    try {
      const response = await this.client.post('/auth/onboarding/complete/', profileData);
      
      console.log('📥 API: Response status:', response.status);
      console.log('📥 API: Response data:', JSON.stringify(response.data, null, 2));
      
      // Update cached user with new data from response
      if (response.data.user) {
        console.log('💾 API: Updating localStorage with user:', response.data.user);
        localStorage.setItem('user_cache', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ API: completeOnboarding failed');
      console.error('❌ API: Error response:', error.response?.data);
      console.error('❌ API: Error status:', error.response?.status);
      throw error;
    }
  }

  // Workspace endpoints
    async getWorkspaces() {
      const response = await this.client.get('/workspaces/workspaces/');
      return response.data;
    }

    async getWorkspace(id: number) {
      const response = await this.client.get(`/workspaces/workspaces/${id}/`);
      return response.data;
    }

    async createWorkspace(data: any) {
      const response = await this.client.post('/workspaces/workspaces/', data);
      return response.data;
    }

    async getMyWorkspaceInvitations() {
      const response = await this.client.get('/workspaces/workspaces/my-invitations/');  // ✅ Changed from my_invitations
      return response.data;
    }

    async acceptWorkspaceInvitation(workspaceId: number, invitationId: number) {
      const response = await this.client.post(
        `/workspaces/workspaces/${workspaceId}/invitations/${invitationId}/accept/`  // ✅ No underscores
      );
      return response.data;
    }

    async declineWorkspaceInvitation(workspaceId: number, invitationId: number) {
      const response = await this.client.post(
        `/workspaces/workspaces/${workspaceId}/invitations/${invitationId}/decline/`  // ✅ No underscores
      );
      return response.data;
    }

    async inviteWorkspaceMember(workspaceId: number, data: { email: string; role: string; message?: string }) {
      const response = await this.client.post(
        `/workspaces/workspaces/${workspaceId}/invite-member/`,  // ✅ Changed from invite_member
        data
      );
      return response.data;
    }

    async removeWorkspaceMember(workspaceId: number, userId: number) {
      const response = await this.client.delete(
        `/workspaces/workspaces/${workspaceId}/remove-member/`,  // ✅ Changed from remove_member
        { data: { user_id: userId } }
      );
      return response.data;
    }

  async requestJoinProject(projectId: number, message?: string) {
    const response = await this.client.post(
      `/projects/projects/${projectId}/request_join/`,
      { message }
    );
    return response.data;
  }

  async getProjectJoinRequests(projectId: number) {
    const response = await this.client.get(`/projects/projects/${projectId}/join_requests/`);
    return response.data;
  }

  async approveJoinRequest(projectId: number, requestId: number, role: string) {
    const response = await this.client.post(
      `/projects/projects/${projectId}/join_requests/${requestId}/approve/`,
      { role }
    );
    return response.data;
  }

  async rejectJoinRequest(projectId: number, requestId: number) {
    const response = await this.client.post(
      `/projects/projects/${projectId}/join_requests/${requestId}/reject/`
    );
    return response.data;
  }

  async getMyJoinRequests() {
    const response = await this.client.get('/projects/projects/my_join_requests/');
    return response.data;
  }

  async getMyInvitations() {
    const response = await this.client.get('/projects/projects/my_invitations/');
    return response.data;
  }

  async getProjectInvitations(projectId: number) {
    const response = await this.client.get(`/projects/projects/${projectId}/invitations/`);
    return response.data;
  }

  async acceptInvitation(projectId: number, invitationId: number) {
    const response = await this.client.post(
      `/projects/projects/${projectId}/invitations/${invitationId}/accept/`
    );
    return response.data;
  }

  async declineInvitation(projectId: number, invitationId: number) {
    const response = await this.client.post(
      `/projects/projects/${projectId}/invitations/${invitationId}/decline/`
    );
    return response.data;
  }

  // Project methods
  async getProjects(params?: any) {
    const response = await this.client.get('/projects/projects/', { params });
    return response.data;
  }

  async getProject(id: number) {
    const response = await this.client.get(`/projects/projects/${id}/`);
    return response.data;
  }

  async createProject(projectData: any) {
    const response = await this.client.post('/projects/projects/', projectData);
    return response.data;
  }

  async updateProject(id: number, projectData: any) {
    const response = await this.client.put(`/projects/projects/${id}/`, projectData);
    return response.data;
  }

  async deleteProject(id: number) {
    await this.client.delete(`/projects/projects/${id}/`);
  }

  async getProjectMembers(projectId: number) {
    const response = await this.client.get(`/projects/projects/${projectId}/members/`);
    return response.data;
  }

  async inviteProjectMember(projectId: number, data: { email: string; role: string; message?: string }) {
    const response = await this.client.post(
      `/projects/projects/${projectId}/invite/`,
      data
    );
    return response.data;
  }

  async updateProjectMemberRole(projectId: number, data: { user_id: number; role: string }) {
    const response = await this.client.put(
      `/projects/projects/${projectId}/update_member_role/`,
      data
    );
    return response.data;
  }

  async removeProjectMember(projectId: number, userId: number) {
    const response = await this.client.delete(
      `/projects/projects/${projectId}/remove_member/`,
      { data: { user_id: userId } }
    );
    return response.data;
  }

  async getProjectStats(projectId: number) {
    const response = await this.client.get(`/projects/projects/${projectId}/stats/`);
    return response.data;
  }

  async getProjectDatasets(projectId: number) {
    const response = await this.client.get(`/projects/projects/${projectId}/datasets/`);
    return response.data;
  }

  // Workspace Join Requests - FIXED: Use hyphens not underscores
  async requestJoinWorkspace(workspaceId: number, message?: string): Promise<any> {
    const response = await this.client.post(
      `/workspaces/workspaces/${workspaceId}/request-join/`,  // ✅ Changed from request_join
      { message }
    );
    return response.data;
  }

  async getWorkspaceJoinRequests(workspaceId: number): Promise<any[]> {
    const response = await this.client.get(
      `/workspaces/workspaces/${workspaceId}/join-requests/`  // ✅ Changed from join_requests
    );
    return response.data;
  }

  async approveWorkspaceJoinRequest(workspaceId: number, requestId: number, role: string = 'member'): Promise<any> {
    const response = await this.client.post(
      `/workspaces/workspaces/${workspaceId}/join-requests/${requestId}/approve/`,  // ✅ Changed from join_requests
      { role }
    );
    return response.data;
  }

  async rejectWorkspaceJoinRequest(workspaceId: number, requestId: number): Promise<any> {
    const response = await this.client.post(
      `/workspaces/workspaces/${workspaceId}/join-requests/${requestId}/reject/`  // ✅ Changed from join_requests
    );
    return response.data;
  }

  async getWorkspaceInvitations(workspaceId: number): Promise<any[]> {
    const response = await this.client.get(
      `/workspaces/workspaces/${workspaceId}/invitations/`
    );
    return response.data;
  }

  async cancelWorkspaceInvitation(workspaceId: number, invitationId: number): Promise<any> {
    const response = await this.client.post(
      `/workspaces/workspaces/${workspaceId}/invitations/${invitationId}/cancel/`
    );
    return response.data;
  }
  // Add these methods to BackendAPIService class

  async browseProjects(params?: {
    search?: string;
    visibility?: string;
    workspace?: number;
  }) {
    const response = await this.client.get('/projects/projects/browse/', { params });
    return response.data;
  }

  async browseWorkspaces(params?: {
    search?: string;
    type?: string;
  }) {
    const response = await this.client.get('/workspaces/workspaces/browse/', { params });
    return response.data;
  }

  // Cleanup on app unmount
  public cleanup() {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  // ========================================
  // DATA SOURCES
  // ========================================

  async getDataSources(params?: any) {
    const response = await this.client.get('/datasources/', { params });
    return response.data;
  }

  async getDataSource(id: number) {
    const response = await this.client.get(`/datasources/${id}/`);
    return response.data;
  }

  async createDataSource(data: any) {
    const response = await this.client.post('/datasources/', data);
    return response.data;
  }

  async updateDataSource(id: number, data: any) {
    const response = await this.client.patch(`/datasources/${id}/`, data);
    return response.data;
  }

  async deleteDataSource(id: number) {
    await this.client.delete(`/datasources/${id}/`);
  }

  async testDataSourceConnection(id: number, credentials?: any) {
    const response = await this.client.post(`/datasources/${id}/test-connection/`, { credentials });
    return response.data;
  }

  async getDataSourceConnectionLogs(id: number) {
    const response = await this.client.get(`/datasources/${id}/connection-logs/`);
    return response.data;
  }

  // ========================================
  // PIPELINES
  // ========================================

  async getPipelines(params?: any) {
    const response = await this.client.get('/pipelines/', { params });
    return response.data;
  }

  async getPipeline(id: number) {
    const response = await this.client.get(`/pipelines/${id}/`);
    return response.data;
  }

  async createPipeline(data: any) {
    const response = await this.client.post('/pipelines/', data);
    return response.data;
  }

  async updatePipeline(id: number, data: any) {
    const response = await this.client.patch(`/pipelines/${id}/`, data);
    return response.data;
  }

  async deletePipeline(id: number) {
    await this.client.delete(`/pipelines/${id}/`);
  }

  async executePipeline(id: number, overrideConfig?: any) {
    const response = await this.client.post(`/pipelines/${id}/execute/`, { override_config: overrideConfig });
    return response.data;
  }

  async cancelPipeline(id: number) {
    const response = await this.client.post(`/pipelines/${id}/cancel/`);
    return response.data;
  }

  async validatePipelineConfig(id: number, config: any) {
    const response = await this.client.post(`/pipelines/${id}/validate/`, { config });
    return response.data;
  }

  async getPipelineExecutions(pipelineId: number) {
    const response = await this.client.get(`/pipelines/${pipelineId}/executions/`);
    return response.data;
  }

  async getExecutionLogs(executionId: number) {
    const response = await this.client.get(`/pipelines/executions/${executionId}/logs/`);
    return response.data;
  }

  async retryExecution(executionId: number) {
    const response = await this.client.post(`/pipelines/executions/${executionId}/retry/`);
    return response.data;
  }

  async getPipelineStats(pipelineId: number) {
    const response = await this.client.get(`/pipelines/${pipelineId}/stats/`);
    return response.data;
  }

  async estimatePipelineResources(config: any, dataSourceId: number) {
    const response = await this.client.post('/pipelines/estimate-resources/', { 
      config, 
      data_source_id: dataSourceId 
    });
    return response.data;
  }

  // ========================================
  // DATASETS
  // ========================================

  async getDatasets(params?: any) {
    const response = await this.client.get('/datasets/', { params });
    return response.data;
  }

  async getDataset(id: number) {
    const response = await this.client.get(`/datasets/${id}/`);
    return response.data;
  }

  async createDataset(data: any) {
    const response = await this.client.post('/datasets/', data);
    return response.data;
  }

  async updateDataset(id: number, data: any) {
    const response = await this.client.patch(`/datasets/${id}/`, data);
    return response.data;
  }

  async deleteDataset(id: number) {
    await this.client.delete(`/datasets/${id}/`);
  }

  async getDatasetVersions(datasetId: number) {
    const response = await this.client.get(`/datasets/${datasetId}/versions/`);
    return response.data;
  }

  async getDatasetLineage(datasetId: number) {
    const response = await this.client.get(`/datasets/${datasetId}/lineage/`);
    return response.data;
  }

  async compareDatasetVersions(version1Id: number, version2Id: number) {
    const response = await this.client.post('/datasets/versions/compare/', {
      version1_id: version1Id,
      version2_id: version2Id
    });
    return response.data;
  }


}

export const backendAPI = new BackendAPIService();

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    backendAPI.cleanup();
  });
}