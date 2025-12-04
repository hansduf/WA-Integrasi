// API client for backend communication
export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

if (typeof window !== 'undefined') {
  // Log API base URL for local development
  console.log('🌐 API Base URL:', API_BASE_URL);
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '', // Add API key for public endpoints
        ...options.headers,
      },
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, finalOptions);
      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - session expired or invalid
        if (response.status === 401 && typeof window !== 'undefined') {
          // Check if backend cleared the auth cookie (indicated by header or shouldLogout flag)
          const authCleared = response.headers.get('X-Auth-Cleared') === 'true' || data.shouldLogout === true;
          
          if (authCleared) {
            // Backend explicitly cleared authentication - force logout
            console.warn('🔒 Authentication invalidated by server, forcing logout...');
            
            // Clear any local auth state
            localStorage.removeItem('user');
            sessionStorage.clear();
            
            // Show user-friendly message
            const message = data.message || 'Your session has expired. Please login again.';
            
            // Redirect to login with message
            if (!window.location.pathname.includes('/login')) {
              // Store message for login page to display
              sessionStorage.setItem('auth_message', message);
              
              // Force immediate redirect
              window.location.href = '/login';
            }
          } else if (!window.location.pathname.includes('/login') && 
                     (endpoint.includes('/api/auth/me') || endpoint.includes('/api/auth/check'))) {
            // Auth check endpoints failed - redirect to login
            console.warn('Auth check failed, redirecting to login...');
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          } else {
            // Other 401s - just log warning
            console.warn('401 Unauthorized on endpoint:', endpoint);
          }
        }

        return {
          success: false,
          error: data.error || 'request_failed',
          message: data.message || 'Request failed',
        };
      }

      // Return backend response as-is (backend already has success/data/error structure)
      return data;
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: 'network_error',
        message: 'Network error occurred',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  login: (username: string, password: string, rememberMe: boolean = false) =>
    api.post('/api/auth/login', { username, password, rememberMe }),
  
  logout: () =>
    api.post('/api/auth/logout'),
  
  getCurrentUser: () =>
    api.get('/api/auth/me'),
  
  checkAuth: () =>
    api.get('/api/auth/check'),
  
  validateSession: () =>
    api.get('/api/auth/validate-session'),

  changePassword: (userId: string, newPassword: string) =>
    api.put(`/api/users/${userId}/password`, { newPassword }),
};

// User API
export const userApi = {
  getAll: (page: number = 1, limit: number = 50) =>
    api.get(`/api/users?page=${page}&limit=${limit}`),
  
  getStats: () =>
    api.get('/api/users/stats'),
  
  getById: (id: string) =>
    api.get(`/api/users/${id}`),
  
  create: (userData: {
    username: string;
    password: string;
    full_name: string;
    email?: string;
  }) =>
    api.post('/api/users', userData),
  
  update: (id: string, updates: {
    full_name?: string;
    email?: string;
    is_active?: boolean;
  }) =>
    api.put(`/api/users/${id}`, updates),
  
  delete: (id: string) =>
    api.delete(`/api/users/${id}`),
  
  changePassword: (id: string, currentPassword: string, newPassword: string) =>
    api.put(`/api/users/${id}/password`, { currentPassword, newPassword }),
  
  toggleStatus: (id: string, is_active: boolean) =>
    api.put(`/api/users/${id}/status`, { is_active }),
};

// Security API
export const securityApi = {
  getOverview: () =>
    api.get('/api/security/overview'),
  
  getFailedLogins: (minutes: number = 60) =>
    api.get(`/api/security/failed-logins?minutes=${minutes}`),
  
  getActiveSessions: () =>
    api.get('/api/security/sessions'),
  
  terminateSession: (sessionId: string, reason?: string) =>
    api.delete(`/api/security/sessions/${sessionId}`),
  
  getLockedAccounts: () =>
    api.get('/api/security/locked-accounts'),
  
  unlockAccount: (userId: string) =>
    api.post(`/api/security/unlock/${userId}`),
  
  getAuditLogs: (filters: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    return api.get(`/api/security/audit-logs?${params.toString()}`);
  },
  
  cleanupSessions: () =>
    api.post('/api/security/cleanup-sessions'),
};
