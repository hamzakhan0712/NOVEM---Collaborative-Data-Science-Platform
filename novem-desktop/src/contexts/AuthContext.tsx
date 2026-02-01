import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { backendAPI } from '../services/api';
import { message } from 'antd';
import { offlineManager } from '../services/offline';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_onboarding_complete: boolean;
  account_state: string;
  profile_picture?: string;
  profile_picture_url?: string; // Add this
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  loading: boolean;
  isOnline: boolean;
  offlineMode: boolean;
  graceExpiry: Date | null;
  daysRemaining: number;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  completeOnboarding: (profileData: {
    first_name: string;
    last_name: string;
    bio?: string;
    organization: string;
    job_title: string;
    location: string;
  }) => Promise<void>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);
  const [graceExpiry, setGraceExpiry] = useState<Date | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(7);
  const isInitialized = useRef(false);
  const connectivityCheckInterval = useRef<number | null>(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const cachedUser = localStorage.getItem('user_cache');

      if (!accessToken || !refreshToken) {
        setLoading(false);
        return;
      }

      const isBackendReachable = await offlineManager.checkConnectivity();
      
      if (!isBackendReachable) {
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          
          if (offlineManager.isWithinGracePeriod()) {
            setUser(parsedUser);
            setOfflineMode(true);
            
            const state = offlineManager.getState();
            setGraceExpiry(state.graceExpiry);
            setDaysRemaining(offlineManager.getDaysRemaining());
            
            message.info(`Working offline. ${offlineManager.getDaysRemaining()} days remaining in grace period.`);
          } else {
            handleSessionExpired();
            message.error('Your offline access has expired. Please reconnect to continue.');
          }
        } else {
          handleSessionExpired();
        }
        
        setLoading(false);
        return;
      }

      if (!backendAPI.isTokenValid()) {
        try {
          await backendAPI.performTokenRefresh();
        } catch (error) {
          handleSessionExpired();
          setLoading(false);
          return;
        }
      }

      try {
        const userData = await backendAPI.getProfile();
        setUser(userData);
        setOfflineMode(false);
        setIsOnline(true);
      } catch (error: any) {
        if (cachedUser && offlineManager.isWithinGracePeriod()) {
          setUser(JSON.parse(cachedUser));
          setOfflineMode(true);
          const state = offlineManager.getState();
          setGraceExpiry(state.graceExpiry);
          setDaysRemaining(offlineManager.getDaysRemaining());
        } else {
          handleSessionExpired();
        }
      }

    } catch (error) {
      handleSessionExpired();
    } finally {
      setLoading(false);
    }
  };

  const handleSessionExpired = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_cache');
    offlineManager.clearState();
    setUser(null);
    setOfflineMode(false);
  };

  useEffect(() => {
    const checkOffline = async () => {
      const isBackendOnline = await offlineManager.checkConnectivity();
      const state = offlineManager.getState();
      
      setIsOnline(navigator.onLine && isBackendOnline);
      setOfflineMode(state.isOffline);
      setGraceExpiry(state.graceExpiry);
      setDaysRemaining(offlineManager.getDaysRemaining());
      
      if (offlineManager.shouldForceLogout() && user) {
        await logout();
        message.error('Your offline access has expired. Please reconnect to continue.');
      }
      
      if (isBackendOnline && user && state.isOffline) {
        try {
          await refreshSession();
          message.success('Connection restored - syncing data...');
        } catch (error) {
          // Silent fail
        }
      }
    };
    
    checkOffline();
    connectivityCheckInterval.current = setInterval(checkOffline, 30000);
    
    return () => {
      if (connectivityCheckInterval.current) {
        clearInterval(connectivityCheckInterval.current);
      }
    };
  }, [user]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setOfflineMode(false);
      message.warning('Session expired. Please login again.');
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      if (user) {
        offlineManager.checkConnectivity().then(async (isOnline) => {
          if (isOnline) {
            await refreshSession();
            message.success('Connection restored');
          }
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      
      if (user) {
        const state = offlineManager.getState();
        if (!state.isOffline) {
          offlineManager.handleNetworkError();
          const updatedState = offlineManager.getState();
          setOfflineMode(true);
          setGraceExpiry(updatedState.graceExpiry);
          setDaysRemaining(offlineManager.getDaysRemaining());
          message.warning(`Working offline. ${offlineManager.getDaysRemaining()} days remaining.`);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const refreshSession = useCallback(async () => {
    if (!user) return;
    
    try {
      const userData = await backendAPI.getProfile();
      setUser(userData);
      setOfflineMode(false);
      offlineManager.markAsOnline();
    } catch (error: any) {
      if (error.offline) {
        setOfflineMode(true);
      }
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      const response = await backendAPI.login(email, password);
      setUser(response.user);
      setOfflineMode(false);
      setIsOnline(true);
      message.success(`Welcome back, ${response.user.first_name}!`);
    } catch (error: any) {
      if (error.offline) {
        message.error('Cannot login while offline. Please check your connection.');
      } else {
        const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
        message.error(errorMessage);
      }
      
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await backendAPI.register(userData);
      
      if (response.user) {
        setUser(response.user);
        setOfflineMode(false);
        setIsOnline(true);
        message.success('Account created successfully!');
      }
    } catch (error: any) {
      if (error.offline) {
        message.error('Cannot register while offline. Please check your connection.');
      } else {
        const errorMessage = error.response?.data?.email?.[0] || 
                            error.response?.data?.username?.[0] || 
                            error.response?.data?.detail || 
                            'Registration failed. Please try again.';
        message.error(errorMessage);
      }
      
      throw error;
    }
  };

  const logout = async () => {
    try {
      await backendAPI.logout();
    } catch (error) {
      // Silent fail
    } finally {
      setUser(null);
      setOfflineMode(false);
      setGraceExpiry(null);
      setDaysRemaining(0);
      
      if (connectivityCheckInterval.current) {
        clearInterval(connectivityCheckInterval.current);
      }
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const completeOnboarding = async (profileData: {
    first_name: string;
    last_name: string;
    bio?: string;
    organization: string;
    job_title: string;
    location: string;
  }) => {
    try {
      const response = await backendAPI.completeOnboarding(profileData);
      
      if (response.user) {
        setUser(response.user);
        localStorage.setItem('user_cache', JSON.stringify(response.user));
      }
      
      message.success('Welcome to NOVEM!');
      
      return response;
    } catch (error: any) {
      if (error.offline) {
        message.error('Cannot complete onboarding while offline');
      } else {
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.first_name?.[0] ||
                            error.response?.data?.organization?.[0] ||
                            error.response?.data?.error ||
                            'Failed to complete onboarding';
        message.error(errorMessage);
      }
      
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    if (!navigator.onLine) {
      message.error('Cannot request password reset while offline');
      throw new Error('Offline - cannot reset password');
    }

    try {
      await backendAPI.requestPasswordReset(email);
      message.success('Password reset instructions sent to your email');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.email?.[0] || 
                          'Failed to send reset instructions. Please try again.';
      message.error(errorMessage);
      throw error;
    }
  };

  const isOnboardingComplete = user?.account_state === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        needsOnboarding: user ? !isOnboardingComplete : false,
        loading,
        isOnline,
        offlineMode,
        graceExpiry,
        daysRemaining,
        login,
        register,
        logout,
        updateUser,
        completeOnboarding,
        refreshSession,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};