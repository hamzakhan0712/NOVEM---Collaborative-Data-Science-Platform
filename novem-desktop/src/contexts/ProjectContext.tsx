import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { backendAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { message } from 'antd';

interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  workspace: number | null;
  workspace_name?: string;
  creator: any;
  visibility: 'private' | 'team' | 'public';
  tags: string[];
  member_count: number;
  dataset_count: number;
  created_at: string;
  updated_at: string;
  current_user_role?: string;
  role?: string; 
  current_user_permissions?: {
    can_view_data: boolean;
    can_run_analysis: boolean;
    can_publish_results: boolean;
    can_manage_connectors: boolean;
    can_invite_members: boolean;
  };
}

interface ProjectMember {
  id: number;
  user: any;
  role: string;
  can_view_data: boolean;
  can_run_analysis: boolean;
  can_publish_results: boolean;
  can_manage_connectors: boolean;
  can_invite_members: boolean;
  joined_at: string;
}

interface ProjectInvitation {
  id: number;
  project: number;
  project_name: string;
  inviter: any;
  invitee_email: string;
  invitee?: any;
  role: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_at: string;
  responded_at?: string;
  expires_at: string;
  is_expired: boolean;
}

interface ProjectJoinRequest {
  id: number;
  project: number;
  project_name: string;
  user: any;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: any;
}

interface ProjectContextType {
  // State
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  
  // Project operations
  setCurrentProject: (project: Project | null) => void;
  loadProjects: (workspaceId?: number) => Promise<void>;
  createProject: (data: any) => Promise<Project>;
  updateProject: (id: number, data: any) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
  refreshProject: (projectId: number) => Promise<void>;
  
  // Member operations
  getProjectMembers: (projectId: number) => Promise<ProjectMember[]>;
  inviteMember: (projectId: number, data: { email: string; role: string; message?: string }) => Promise<void>;
  removeMember: (projectId: number, userId: number) => Promise<void>;
  updateMemberRole: (projectId: number, userId: number, role: string) => Promise<void>;
  
  // Invitation operations
  getMyInvitations: () => Promise<ProjectInvitation[]>;
  acceptInvitation: (projectId: number, invitationId: number) => Promise<void>;
  declineInvitation: (projectId: number, invitationId: number) => Promise<void>;
  
  // Join request operations
  requestJoin: (projectId: number, message?: string) => Promise<void>;
  getMyJoinRequests: () => Promise<ProjectJoinRequest[]>;
  getProjectJoinRequests: (projectId: number) => Promise<ProjectJoinRequest[]>;
  approveJoinRequest: (projectId: number, requestId: number, role: string) => Promise<void>;
  rejectJoinRequest: (projectId: number, requestId: number) => Promise<void>;
  
  // Stats
  getProjectStats: (projectId: number) => Promise<any>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { offlineMode } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  // REMOVED: Auto-load on mount - let pages call loadProjects with workspace ID
  // This prevents loading ALL projects on initial mount

  // Restore current project from localStorage
  useEffect(() => {
    const savedProjectId = localStorage.getItem('current_project_id');
    if (savedProjectId && projects.length > 0 && !currentProject) {
      const project = projects.find(p => p.id === parseInt(savedProjectId));
      if (project) {
        console.log('✅ [ProjectContext] Restored project:', project.name);
        setCurrentProjectState(project);
      }
    }
  }, [projects, currentProject]);

  const loadProjects = useCallback(async (workspaceId?: number) => {
    // FIXED: Build cache key with workspace ID for better cache management
    const cacheKey = workspaceId !== undefined 
      ? `projects_cache_workspace_${workspaceId}`
      : 'projects_cache_all';

    if (offlineMode) {
      console.log('📴 [ProjectContext] Loading from cache (offline):', cacheKey);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedProjects = JSON.parse(cached);
          if (!Array.isArray(parsedProjects)) {
            console.error('❌ [ProjectContext] Cache is not an array');
            setProjects([]);
            return;
          }
          
          console.log('✅ [ProjectContext] Loaded', parsedProjects.length, 'from cache');
          setProjects(parsedProjects);
        } catch (error) {
          console.error('❌ [ProjectContext] Cache parse error:', error);
          setProjects([]);
        }
      } else {
        console.log('⚠️ [ProjectContext] No cache available');
        setProjects([]);
      }
      return;
    }

    setLoading(true);
    try {
      console.log('🌐 [ProjectContext] Fetching from API...', { workspaceId });
      
      // FIXED: Pass workspace ID as query parameter
      const params = workspaceId !== undefined ? { workspace: workspaceId } : undefined;
      const data = await backendAPI.getProjects(params);
      
      const projectsArray = Array.isArray(data) ? data : [];
      console.log('✅ [ProjectContext] Received', projectsArray.length, 'projects', 
        workspaceId !== undefined ? `for workspace ${workspaceId}` : '(all workspaces)');
      
      setProjects(projectsArray);
      
      // FIXED: Cache with workspace-specific key
      localStorage.setItem(cacheKey, JSON.stringify(projectsArray));
      console.log('✅ [ProjectContext] Cached successfully:', cacheKey);
    } catch (error: any) {
      console.error('❌ [ProjectContext] Load failed:', error);
      
      // Fallback to cache
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedProjects = JSON.parse(cached);
          const projectsArray = Array.isArray(parsedProjects) ? parsedProjects : [];
          console.log('⚠️ [ProjectContext] Using cache fallback:', cacheKey);
          setProjects(projectsArray);
        } catch (e) {
          console.error('❌ [ProjectContext] Cache fallback failed');
          setProjects([]);
        }
      } else {
        setProjects([]);
      }
      
      if (!error.offline) {
        message.error('Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  }, [offlineMode]);

  const createProject = async (data: any): Promise<Project> => {
    try {
      console.log('🏗️ [ProjectContext] Creating:', data.name, 'in workspace:', data.workspace_id);
      const project = await backendAPI.createProject(data);
      console.log('✅ [ProjectContext] Created:', project.name, 'ID:', project.id);
      
      // Add to current list
      setProjects(prev => {
        const currentProjects = Array.isArray(prev) ? prev : [];
        return [...currentProjects, project];
      });
      
      // FIXED: Update workspace-specific cache
      if (project.workspace) {
        const cacheKey = `projects_cache_workspace_${project.workspace}`;
        const cached = localStorage.getItem(cacheKey);
        let cachedProjects: Project[] = [];
        
        if (cached) {
          try {
            cachedProjects = JSON.parse(cached);
            if (!Array.isArray(cachedProjects)) {
              cachedProjects = [];
            }
          } catch (e) {
            cachedProjects = [];
          }
        }
        
        cachedProjects.push(project);
        localStorage.setItem(cacheKey, JSON.stringify(cachedProjects));
        console.log('✅ [ProjectContext] Updated workspace cache:', cacheKey);
      }
      
      // Also update general cache
      const currentProjects = Array.isArray(projects) ? projects : [];
      const updatedList = [...currentProjects, project];
      localStorage.setItem('projects_cache_all', JSON.stringify(updatedList));
      
      message.success('Project created successfully');
      return project;
    } catch (error: any) {
      console.error('❌ [ProjectContext] Create failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create project';
      message.error(errorMsg);
      throw error;
    }
  };

  const updateProject = async (id: number, data: any): Promise<Project> => {
    try {
      console.log('✏️ [ProjectContext] Updating project:', id);
      const updated = await backendAPI.updateProject(id, data);
      
      // Update in list
      setProjects(prev => {
        const currentProjects = Array.isArray(prev) ? prev : [];
        return currentProjects.map(p => p.id === id ? updated : p);
      });
      
      // Update current if same
      if (currentProject?.id === id) {
        setCurrentProjectState(updated);
      }
      
      // FIXED: Update workspace-specific cache
      if (updated.workspace) {
        const cacheKey = `projects_cache_workspace_${updated.workspace}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            let cachedProjects = JSON.parse(cached);
            if (Array.isArray(cachedProjects)) {
              cachedProjects = cachedProjects.map((p: Project) => p.id === id ? updated : p);
              localStorage.setItem(cacheKey, JSON.stringify(cachedProjects));
            }
          } catch (e) {
            console.error('❌ [ProjectContext] Cache update error:', e);
          }
        }
      }
      
      // Update general cache
      const currentProjects = Array.isArray(projects) ? projects : [];
      const updatedList = currentProjects.map(p => p.id === id ? updated : p);
      localStorage.setItem('projects_cache_all', JSON.stringify(updatedList));
      
      message.success('Project updated successfully');
      console.log('✅ [ProjectContext] Updated successfully');
      return updated;
    } catch (error: any) {
      console.error('❌ [ProjectContext] Update failed:', error);
      message.error('Failed to update project');
      throw error;
    }
  };

  const deleteProject = async (id: number): Promise<void> => {
    try {
      console.log('🗑️ [ProjectContext] Deleting project:', id);
      const projectToDelete = projects.find(p => p.id === id);
      
      await backendAPI.deleteProject(id);
      
      // Remove from list
      setProjects(prev => {
        const currentProjects = Array.isArray(prev) ? prev : [];
        return currentProjects.filter(p => p.id !== id);
      });
      
      // Clear current if deleted
      if (currentProject?.id === id) {
        setCurrentProjectState(null);
        localStorage.removeItem('current_project_id');
      }
      
      // FIXED: Update workspace-specific cache
      if (projectToDelete?.workspace) {
        const cacheKey = `projects_cache_workspace_${projectToDelete.workspace}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            let cachedProjects = JSON.parse(cached);
            if (Array.isArray(cachedProjects)) {
              cachedProjects = cachedProjects.filter((p: Project) => p.id !== id);
              localStorage.setItem(cacheKey, JSON.stringify(cachedProjects));
            }
          } catch (e) {
            console.error('❌ [ProjectContext] Cache delete error:', e);
          }
        }
      }
      
      // Update general cache
      const currentProjects = Array.isArray(projects) ? projects : [];
      const updatedList = currentProjects.filter(p => p.id !== id);
      localStorage.setItem('projects_cache_all', JSON.stringify(updatedList));
      
      message.success('Project deleted successfully');
      console.log('✅ [ProjectContext] Deleted successfully');
    } catch (error: any) {
      console.error('❌ [ProjectContext] Delete failed:', error);
      message.error('Failed to delete project');
      throw error;
    }
  };

  const refreshProject = async (projectId: number) => {
    try {
      console.log('🔄 [ProjectContext] Refreshing project:', projectId);
      const project = await backendAPI.getProject(projectId);
      console.log('✅ [ProjectContext] Refreshed');
      
      // Update in list
      setProjects(prev => {
        const currentProjects = Array.isArray(prev) ? prev : [];
        return currentProjects.map(p => p.id === projectId ? project : p);
      });
      
      // Update current if same
      if (currentProject?.id === projectId) {
        setCurrentProjectState(project);
      }
      
      // FIXED: Update workspace-specific cache
      if (project.workspace) {
        const cacheKey = `projects_cache_workspace_${project.workspace}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            let cachedProjects = JSON.parse(cached);
            if (Array.isArray(cachedProjects)) {
              cachedProjects = cachedProjects.map((p: Project) => p.id === projectId ? project : p);
              localStorage.setItem(cacheKey, JSON.stringify(cachedProjects));
            }
          } catch (e) {
            console.error('❌ [ProjectContext] Cache refresh error:', e);
          }
        }
      }
      
      // Update general cache
      const currentProjects = Array.isArray(projects) ? projects : [];
      const updatedList = currentProjects.map(p => p.id === projectId ? project : p);
      localStorage.setItem('projects_cache_all', JSON.stringify(updatedList));
    } catch (error: any) {
      console.error('❌ [ProjectContext] Refresh failed:', error);
      if (!error.offline) {
        message.error('Failed to refresh project');
      }
    }
  };

  const getProjectMembers = async (projectId: number): Promise<ProjectMember[]> => {
    try {
      console.log('👥 [ProjectContext] Fetching members for:', projectId);
      const members = await backendAPI.getProjectMembers(projectId);
      console.log('✅ [ProjectContext] Found', members.length, 'members');
      return members;
    } catch (error: any) {
      console.error('❌ [ProjectContext] Get members failed:', error);
      message.error('Failed to load project members');
      return [];
    }
  };

  const inviteMember = async (projectId: number, data: { email: string; role: string; message?: string }) => {
    try {
      console.log('📨 [ProjectContext] Inviting member to project:', projectId);
      await backendAPI.inviteProjectMember(projectId, data);
      message.success(`Invitation sent to ${data.email}`);
      
      // Refresh current project
      if (currentProject?.id === projectId) {
        await refreshProject(projectId);
      }
    } catch (error: any) {
      console.error('❌ [ProjectContext] Invite failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to send invitation';
      message.error(errorMsg);
      throw error;
    }
  };

  const removeMember = async (projectId: number, userId: number) => {
    try {
      console.log('🚫 [ProjectContext] Removing member:', userId);
      await backendAPI.removeProjectMember(projectId, userId);
      message.success('Member removed successfully');
      
      // Refresh current project
      if (currentProject?.id === projectId) {
        await refreshProject(projectId);
      }
    } catch (error: any) {
      console.error('❌ [ProjectContext] Remove member failed:', error);
      message.error('Failed to remove member');
      throw error;
    }
  };

  const updateMemberRole = async (projectId: number, userId: number, role: string) => {
    try {
      console.log('✏️ [ProjectContext] Updating member role:', { userId, role });
      await backendAPI.updateProjectMemberRole(projectId, { user_id: userId, role });
      message.success('Member role updated successfully');
      
      // Refresh current project
      if (currentProject?.id === projectId) {
        await refreshProject(projectId);
      }
    } catch (error: any) {
      console.error('❌ [ProjectContext] Update role failed:', error);
      message.error('Failed to update member role');
      throw error;
    }
  };

  const getMyInvitations = async (): Promise<ProjectInvitation[]> => {
    try {
      console.log('📬 [ProjectContext] Fetching my invitations');
      const invitations = await backendAPI.getMyInvitations();
      console.log('✅ [ProjectContext] Found', invitations.length, 'invitations');
      return invitations;
    } catch (error: any) {
      console.error('❌ [ProjectContext] Get invitations failed:', error);
      message.error('Failed to load invitations');
      return [];
    }
  };

  const acceptInvitation = async (projectId: number, invitationId: number) => {
    try {
      console.log('✅ [ProjectContext] Accepting invitation:', invitationId);
      await backendAPI.acceptInvitation(projectId, invitationId);
      message.success('Invitation accepted! You are now a project member.');
      
      // FIXED: Reload projects without filtering to get the new project
      await loadProjects();
    } catch (error: any) {
      console.error('❌ [ProjectContext] Accept invitation failed:', error);
      message.error('Failed to accept invitation');
      throw error;
    }
  };

  const declineInvitation = async (projectId: number, invitationId: number) => {
    try {
      console.log('❌ [ProjectContext] Declining invitation:', invitationId);
      await backendAPI.declineInvitation(projectId, invitationId);
      message.success('Invitation declined');
    } catch (error: any) {
      console.error('❌ [ProjectContext] Decline invitation failed:', error);
      message.error('Failed to decline invitation');
      throw error;
    }
  };

  const requestJoin = async (projectId: number, joinMessage?: string) => {
    try {
      console.log('🙋 [ProjectContext] Requesting to join project:', projectId);
      await backendAPI.requestJoinProject(projectId, joinMessage);
      message.success('Join request sent successfully');
    } catch (error: any) {
      console.error('❌ [ProjectContext] Join request failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to send join request';
      message.error(errorMsg);
      throw error;
    }
  };

  const getMyJoinRequests = async (): Promise<ProjectJoinRequest[]> => {
    try {
      console.log('📋 [ProjectContext] Fetching my join requests');
      const requests = await backendAPI.getMyJoinRequests();
      console.log('✅ [ProjectContext] Found', requests.length, 'join requests');
      return requests;
    } catch (error: any) {
      console.error('❌ [ProjectContext] Get join requests failed:', error);
      message.error('Failed to load join requests');
      return [];
    }
  };

  const getProjectJoinRequests = async (projectId: number): Promise<ProjectJoinRequest[]> => {
    try {
      console.log('📋 [ProjectContext] Fetching join requests for project:', projectId);
      const requests = await backendAPI.getProjectJoinRequests(projectId);
      console.log('✅ [ProjectContext] Found', requests.length, 'join requests');
      return requests;
    } catch (error: any) {
      console.error('❌ [ProjectContext] Get project join requests failed:', error);
      message.error('Failed to load join requests');
      return [];
    }
  };

  const approveJoinRequest = async (projectId: number, requestId: number, role: string) => {
    try {
      console.log('✅ [ProjectContext] Approving join request:', requestId);
      await backendAPI.approveJoinRequest(projectId, requestId, role);
      message.success('Join request approved');
      
      // Refresh current project
      if (currentProject?.id === projectId) {
        await refreshProject(projectId);
      }
    } catch (error: any) {
      console.error('❌ [ProjectContext] Approve request failed:', error);
      message.error('Failed to approve join request');
      throw error;
    }
  };

  const rejectJoinRequest = async (projectId: number, requestId: number) => {
    try {
      console.log('❌ [ProjectContext] Rejecting join request:', requestId);
      await backendAPI.rejectJoinRequest(projectId, requestId);
      message.success('Join request rejected');
    } catch (error: any) {
      console.error('❌ [ProjectContext] Reject request failed:', error);
      message.error('Failed to reject join request');
      throw error;
    }
  };

  const getProjectStats = async (projectId: number): Promise<any> => {
    try {
      console.log('📊 [ProjectContext] Fetching stats for:', projectId);
      const stats = await backendAPI.getProjectStats(projectId);
      console.log('✅ [ProjectContext] Stats fetched');
      return stats;
    } catch (error: any) {
      console.error('❌ [ProjectContext] Get stats failed:', error);
      return {
        member_count: 0,
        dataset_count: 0,
        analysis_count: 0,
        model_count: 0,
      };
    }
  };

  const setCurrentProject = (project: Project | null) => {
    console.log('🎯 [ProjectContext] Setting current:', project?.name || 'null');
    setCurrentProjectState(project);
    if (project) {
      localStorage.setItem('current_project_id', project.id.toString());
    } else {
      localStorage.removeItem('current_project_id');
    }
  };

  const value: ProjectContextType = {
    projects,
    currentProject,
    loading,
    setCurrentProject,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    refreshProject,
    getProjectMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
    getMyInvitations,
    acceptInvitation,
    declineInvitation,
    requestJoin,
    getMyJoinRequests,
    getProjectJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    getProjectStats,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};