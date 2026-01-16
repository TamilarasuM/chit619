import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isSuperAdmin, isTenantAdmin, isTenantMember } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle role-based access
  if (requiredRole) {
    // Super admin role check
    if (requiredRole === 'superadmin') {
      if (!isSuperAdmin) {
        // Redirect non-super admins to their appropriate dashboard
        if (isTenantAdmin) {
          return <Navigate to="/admin/dashboard" replace />;
        } else if (isTenantMember) {
          return <Navigate to="/member/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
      }
    }
    // Admin role check (tenant admin or super admin)
    else if (requiredRole === 'admin') {
      if (!isTenantAdmin && !isSuperAdmin) {
        if (isTenantMember) {
          return <Navigate to="/member/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
      }
    }
    // Member role check
    else if (requiredRole === 'member') {
      if (!isTenantMember && !isSuperAdmin) {
        if (isTenantAdmin) {
          return <Navigate to="/admin/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
      }
    }
    // Legacy role check for backward compatibility
    else {
      const userRole = user.tenantRole || user.role;
      if (userRole !== requiredRole && !isSuperAdmin) {
        if (userRole === 'admin' || isTenantAdmin) {
          return <Navigate to="/admin/dashboard" replace />;
        } else {
          return <Navigate to="/member/dashboard" replace />;
        }
      }
    }
  }

  return children;
};

export default ProtectedRoute;
