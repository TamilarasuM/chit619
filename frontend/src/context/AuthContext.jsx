import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = async () => {
      try {
        const token = authService.getStoredToken();
        if (token) {
          const storedUser = authService.getStoredUser();
          setUser(storedUser);

          // Optionally verify token with backend
          // const response = await authService.getCurrentUser();
          // setUser(response.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid token
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (phone, password, tenantId = null) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.login(phone, password, tenantId);
      setUser(response.user);

      // Store tenantId if user is a tenant user
      if (response.user.tenantId) {
        localStorage.setItem('tenantId', response.user.tenantId);
      }

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      // Clear tenant context on logout
      localStorage.removeItem('tenantId');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Check role - use tenantRole for tenant users, platformRole for super admin
  const getUserRole = () => {
    if (!user) return null;
    if (user.platformRole === 'superadmin') return 'superadmin';
    return user.tenantRole || user.role;
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    // Multi-tenant role checks
    isSuperAdmin: user?.platformRole === 'superadmin',
    isTenantAdmin: user?.platformRole === 'tenant_user' && (user?.tenantRole === 'admin' || user?.role === 'admin'),
    isTenantMember: user?.platformRole === 'tenant_user' && (user?.tenantRole === 'member' || user?.role === 'member'),
    // Legacy role checks for backward compatibility
    isAdmin: user?.role === 'admin' || user?.tenantRole === 'admin' || user?.platformRole === 'superadmin',
    isMember: user?.role === 'member' || user?.tenantRole === 'member',
    // Tenant info
    tenantId: user?.tenantId,
    platformRole: user?.platformRole,
    tenantRole: user?.tenantRole,
    getUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
