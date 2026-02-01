import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { backendAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { message } from 'antd';

interface Workspace {
  id: number;
  name: string;
  slug: string;
  description: string;
  workspace_type: string;
  visibility: string;
  owner: any;
  member_count: number;
  project_count: number;
  current_user_role: string | null;
  current_user_permissions?: {
    is_owner: boolean;
    is_admin: boolean;
    can_create_projects: boolean;
    can_invite_members: boolean;
    can_manage_settings: boolean;
    can_delete_workspace: boolean;
  };
  avatar?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  sync_version: number;
}


interface WorkspaceInvitation {
  id: number;
  workspace: number;
  workspace_name: string;
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

interface WorkspaceJoinRequest {
  id: number;
  workspace: number;
  workspace_name: string;
  user: any;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: any;
}

interface WorkspaceContextType {
  // State
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  
  // Workspace operations
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (data: any) => Promise<Workspace>;
  updateWorkspace: (id: number, data: any) => Promise<Workspace>;
  deleteWorkspace: (id: number) => Promise<void>;
  refreshCurrentWorkspace: () => Promise<void>;
  
  // Member operations
  inviteMember: (workspaceId: number, data: { email: string; role: string; message?: string }) => Promise<void>;
  removeMember: (workspaceId: number, userId: number) => Promise<void>;
  updateMemberRole: (workspaceId: number, userId: number, role: string) => Promise<void>;
  
  // Invitation operations
  getMyInvitations: () => Promise<WorkspaceInvitation[]>;
  acceptInvitation: (workspaceId: number, invitationId: number) => Promise<void>;
  declineInvitation: (workspaceId: number, invitationId: number) => Promise<void>;

  requestJoin: (workspaceId: number, message?: string) => Promise<void>;
  getMyJoinRequests: () => Promise<WorkspaceJoinRequest[]>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, offlineMode } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);

  // Load workspaces when user is authenticated and active
  useEffect(() => {
    if (isAuthenticated && user?.account_state === 'active') {
      console.log('🏢 [WorkspaceContext] Loading workspaces for:', user.email);
      loadWorkspaces();
    } else {
      console.log('⏸️ [WorkspaceContext] Not loading:', { isAuthenticated, accountState: user?.account_state });
    }
  }, [isAuthenticated, user?.account_state]);

  // Auto-select workspace from localStorage or first available
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspace) {
      console.log('🎯 [WorkspaceContext] Auto-selecting from', workspaces.length, 'workspaces');
      const storedWorkspaceId = localStorage.getItem('current_workspace_id');
      
      if (storedWorkspaceId) {
        const workspace = workspaces.find(w => w.id === parseInt(storedWorkspaceId));
        if (workspace) {
          console.log('✅ [WorkspaceContext] Restored workspace:', workspace.name);
          setCurrentWorkspaceState(workspace);
          return;
        }
      }
      
      console.log('✅ [WorkspaceContext] Selected first workspace:', workspaces[0].name);
      setCurrentWorkspaceState(workspaces[0]);
    }
  }, [workspaces, currentWorkspace]);

  const loadWorkspaces = useCallback(async () => {
    if (offlineMode) {
      console.log('📴 [WorkspaceContext] Loading from cache (offline)');
      const cached = localStorage.getItem('workspaces_cache');
      if (cached) {
        try {
          const parsedWorkspaces = JSON.parse(cached);
          console.log('✅ [WorkspaceContext] Loaded', parsedWorkspaces.length, 'from cache');
          setWorkspaces(parsedWorkspaces);
        } catch (error) {
          console.error('❌ [WorkspaceContext] Cache parse error:', error);
          setWorkspaces([]);
        }
      } else {
        console.log('⚠️ [WorkspaceContext] No cache available');
        setWorkspaces([]);
      }
      return;
    }

    setLoading(true);
    try {
      console.log('🌐 [WorkspaceContext] Fetching from API...');
      const data = await backendAPI.getWorkspaces();
      console.log('✅ [WorkspaceContext] Received', data.length, 'workspaces');
      
      // Ensure permissions exist
      const processedWorkspaces = data.map((w: Workspace) => ({
        ...w,
        current_user_permissions: w.current_user_permissions || {
          is_owner: false,
          is_admin: false,
          can_create_projects: false,
          can_invite_members: false,
          can_manage_settings: false,
          can_delete_workspace: false,
        }
      }));
      
      setWorkspaces(processedWorkspaces);
      localStorage.setItem('workspaces_cache', JSON.stringify(processedWorkspaces));
      console.log('✅ [WorkspaceContext] Cached successfully');
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Load failed:', error);
      
      // Fallback to cache
      const cached = localStorage.getItem('workspaces_cache');
      if (cached) {
        try {
          const parsedWorkspaces = JSON.parse(cached);
          console.log('⚠️ [WorkspaceContext] Using cache fallback');
          setWorkspaces(parsedWorkspaces);
        } catch (e) {
          setWorkspaces([]);
        }
      } else {
        setWorkspaces([]);
      }
      
      if (!error.offline) {
        message.error('Failed to load workspaces');
      }
    } finally {
      setLoading(false);
    }
  }, [offlineMode]);

  const createWorkspace = async (data: any): Promise<Workspace> => {
    try {
      console.log('🏗️ [WorkspaceContext] Creating:', data.name);
      const workspace = await backendAPI.createWorkspace(data);
      console.log('✅ [WorkspaceContext] Created:', workspace.name);
      
      // Reload to get fresh data
      await loadWorkspaces();
      
      // Set as current
      setCurrentWorkspaceState(workspace);
      message.success('Workspace created successfully');
      return workspace;
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Create failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create workspace';
      message.error(errorMsg);
      throw error;
    }
  };

  const updateWorkspace = async (id: number, data: any): Promise<Workspace> => {
    try {
      console.log('✏️ [WorkspaceContext] Updating workspace:', id);
      const response = await backendAPI.client.put(`/workspaces/workspaces/${id}/`, data);
      const updated = response.data;
      
      // Update in list
      setWorkspaces(prev => prev.map(w => w.id === id ? updated : w));
      
      // Update current if same
      if (currentWorkspace?.id === id) {
        setCurrentWorkspaceState(updated);
      }
      
      // Update cache
      const updatedList = workspaces.map(w => w.id === id ? updated : w);
      localStorage.setItem('workspaces_cache', JSON.stringify(updatedList));
      
      message.success('Workspace updated successfully');
      console.log('✅ [WorkspaceContext] Updated successfully');
      return updated;
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Update failed:', error);
      message.error('Failed to update workspace');
      throw error;
    }
  };

  const deleteWorkspace = async (id: number): Promise<void> => {
    try {
      console.log('🗑️ [WorkspaceContext] Deleting workspace:', id);
      await backendAPI.client.delete(`/workspaces/workspaces/${id}/`);
      
      // Remove from list
      setWorkspaces(prev => prev.filter(w => w.id !== id));
      
      // Clear current if deleted
      if (currentWorkspace?.id === id) {
        setCurrentWorkspaceState(null);
        localStorage.removeItem('current_workspace_id');
      }
      
      // Update cache
      const updatedList = workspaces.filter(w => w.id !== id);
      localStorage.setItem('workspaces_cache', JSON.stringify(updatedList));
      
      message.success('Workspace deleted successfully');
      console.log('✅ [WorkspaceContext] Deleted successfully');
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Delete failed:', error);
      message.error('Failed to delete workspace');
      throw error;
    }
  };

  const refreshCurrentWorkspace = async () => {
    if (!currentWorkspace || offlineMode) {
      console.log('⏸️ [WorkspaceContext] Skip refresh:', { hasWorkspace: !!currentWorkspace, offlineMode });
      return;
    }

    try {
      console.log('🔄 [WorkspaceContext] Refreshing:', currentWorkspace.name);
      const updated = await backendAPI.getWorkspace(currentWorkspace.id);
      console.log('✅ [WorkspaceContext] Refreshed');
      
      setCurrentWorkspaceState(updated);
      
      // Update in list
      setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w));
      
      // Update cache
      const updatedList = workspaces.map(w => w.id === updated.id ? updated : w);
      localStorage.setItem('workspaces_cache', JSON.stringify(updatedList));
    } catch (error) {
      console.error('❌ [WorkspaceContext] Refresh failed:', error);
    }
  };

  const inviteMember = async (workspaceId: number, data: { email: string; role: string; message?: string }) => {
    try {
      console.log('📨 [WorkspaceContext] Inviting member to workspace:', workspaceId);
      await backendAPI.inviteWorkspaceMember(workspaceId, data);
      message.success(`Invitation sent to ${data.email}`);
      
      // Refresh current workspace to update member count
      if (currentWorkspace?.id === workspaceId) {
        await refreshCurrentWorkspace();
      }
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Invite failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to send invitation';
      message.error(errorMsg);
      throw error;
    }
  };

  const removeMember = async (workspaceId: number, userId: number) => {
    try {
      console.log('🚫 [WorkspaceContext] Removing member:', userId);
      await backendAPI.removeWorkspaceMember(workspaceId, userId);
      message.success('Member removed successfully');
      
      // Refresh current workspace
      if (currentWorkspace?.id === workspaceId) {
        await refreshCurrentWorkspace();
      }
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Remove member failed:', error);
      message.error('Failed to remove member');
      throw error;
    }
  };

  const updateMemberRole = async (workspaceId: number, userId: number, role: string) => {
    try {
      console.log('✏️ [WorkspaceContext] Updating member role:', { userId, role });
      await backendAPI.client.put(`/workspaces/workspaces/${workspaceId}/update_member_role/`, {
        user_id: userId,
        role
      });
      message.success('Member role updated successfully');
      
      // Refresh current workspace
      if (currentWorkspace?.id === workspaceId) {
        await refreshCurrentWorkspace();
      }
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Update role failed:', error);
      message.error('Failed to update member role');
      throw error;
    }
  };

  const getMyInvitations = async (): Promise<WorkspaceInvitation[]> => {
    try {
      console.log('📬 [WorkspaceContext] Fetching my invitations');
      const invitations = await backendAPI.getMyWorkspaceInvitations();
      console.log('✅ [WorkspaceContext] Found', invitations.length, 'invitations');
      return invitations;
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Get invitations failed:', error);
      message.error('Failed to load invitations');
      return [];
    }
  };

  const acceptInvitation = async (workspaceId: number, invitationId: number) => {
    try {
      console.log('✅ [WorkspaceContext] Accepting invitation:', invitationId);
      await backendAPI.acceptWorkspaceInvitation(workspaceId, invitationId);
      message.success('Invitation accepted! Welcome to the workspace.');
      
      // Reload workspaces to include new one
      await loadWorkspaces();
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Accept invitation failed:', error);
      message.error('Failed to accept invitation');
      throw error;
    }
  };

  const declineInvitation = async (workspaceId: number, invitationId: number) => {
    try {
      console.log('❌ [WorkspaceContext] Declining invitation:', invitationId);
      await backendAPI.declineWorkspaceInvitation(workspaceId, invitationId);
      message.success('Invitation declined');
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Decline invitation failed:', error);
      message.error('Failed to decline invitation');
      throw error;
    }
  };

  const setCurrentWorkspace = (workspace: Workspace | null) => {
    console.log('🎯 [WorkspaceContext] Setting current:', workspace?.name || 'null');
    setCurrentWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem('current_workspace_id', workspace.id.toString());
    } else {
      localStorage.removeItem('current_workspace_id');
    }
  };

   const requestJoin = async (workspaceId: number, joinMessage?: string) => {
    try {
      console.log('🙋 [WorkspaceContext] Requesting to join workspace:', workspaceId);
      await backendAPI.requestJoinWorkspace(workspaceId, joinMessage);
      message.success('Join request sent successfully');
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Join request failed:', error);
      const errorMsg = error.response?.data?.error || 'Failed to send join request';
      message.error(errorMsg);
      throw error;
    }
  };

  const getMyJoinRequests = async (): Promise<WorkspaceJoinRequest[]> => {
    try {
      console.log('📋 [WorkspaceContext] Fetching my workspace join requests');
      const response = await backendAPI.client.get('/workspaces/workspaces/my-join-requests/');
      console.log('✅ [WorkspaceContext] Found', response.data.length, 'join requests');
      return response.data;
    } catch (error: any) {
      console.error('❌ [WorkspaceContext] Get join requests failed:', error);
      message.error('Failed to load join requests');
      return [];
    }
  };

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    loading,
    setCurrentWorkspace,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshCurrentWorkspace,
    inviteMember,
    removeMember,
    updateMemberRole,
    getMyInvitations,
    acceptInvitation,
    declineInvitation,
    requestJoin,
    getMyJoinRequests,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};