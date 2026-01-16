import api from './api';

const authService = {
  // Login with optional tenantId for multi-tenant support
  login: async (phone, password, tenantId = null) => {
    try {
      // If tenantId provided, temporarily set it for the login request
      if (tenantId) {
        localStorage.setItem('tenantId', tenantId);
      }

      const response = await api.post('/auth/login', { phone, password });
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Store tenantId from response if available
        if (response.user.tenantId) {
          localStorage.setItem('tenantId', response.user.tenantId);
        }
      }
      return response;
    } catch (error) {
      // Clear tenantId on failed login if it was set
      if (tenantId) {
        localStorage.removeItem('tenantId');
      }
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenantId');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.success && response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await api.put('/auth/updatepassword', {
        currentPassword: oldPassword,
        newPassword,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get stored token
  getStoredToken: () => {
    return localStorage.getItem('token');
  },

  // Get stored tenant ID
  getStoredTenantId: () => {
    return localStorage.getItem('tenantId');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Check if user is super admin
  isSuperAdmin: () => {
    const user = authService.getStoredUser();
    return user?.platformRole === 'superadmin';
  },

  // Check if user is tenant admin
  isTenantAdmin: () => {
    const user = authService.getStoredUser();
    return user?.platformRole === 'tenant_user' && (user?.tenantRole === 'admin' || user?.role === 'admin');
  },
};

export default authService;
