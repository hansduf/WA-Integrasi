'use client';

import { authApi } from '@/lib/api';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (userId: string, newPassword: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Session polling - check session validity every 30 seconds
  useEffect(() => {
    if (!user) return; // Don't poll if not authenticated

    const interval = setInterval(async () => {
      try {
        const response = await authApi.validateSession();
        if (!response.success) {
          console.warn('Session validation failed, logging out...');
          logout();
          // Dispatch event for SessionExpiredModal
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sessionExpired', {
              detail: {
                message: 'Your session has expired. You have been logged out from another device.'
              }
            }));
          }
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          console.warn('Session invalidated from another device, logging out...');
          logout();
          // Dispatch event for SessionExpiredModal
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sessionExpired', {
              detail: {
                message: 'You have been logged out from another device.'
              }
            }));
          }
        } else {
          console.error('Session validation error:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user]); // Re-run when user changes

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.checkAuth();
      if (response.success && response.data) {
        const checkData = response.data as any;
        if (checkData.authenticated) {
          // Get full user info
          const userResponse = await authApi.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            const userData = userResponse.data as any;
            if (userData.user) {
              setUser(userData.user);
              setSession(userData.session || null);
            }
          }
        } else {
          setUser(null);
          setSession(null);
        }
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const response = await authApi.login(username, password, rememberMe);
      console.log('🔐 Login response:', response);
      
      if (response.success) {
        // Backend returns user directly in response, not nested in data
        const loginData = response as any;
        console.log('👤 Login data:', loginData);
        if (loginData.user) {
          console.log('✅ Setting user:', loginData.user);
          setUser(loginData.user);
          // Session will be set later when needed
          setSession(loginData.session || null);
        }
        return { success: true };
      } else {
        console.warn('❌ Login failed:', response);
        return {
          success: false,
          error: response.error,
          message: response.message,
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'network_error',
        message: 'Network error occurred',
      };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.success && response.data) {
        // TypeScript workaround: response.data is typed as {} but contains user and session
        const userData = response.data as any;
        if (userData.user) {
          setUser(userData.user);
          setSession(userData.session || null);
        }
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const changePassword = async (userId: string, newPassword: string) => {
    try {
      const response = await authApi.changePassword(userId, newPassword);
      return response;
    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'network_error',
        message: 'Gagal mengubah password'
      };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
