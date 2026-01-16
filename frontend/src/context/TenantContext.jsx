import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const TenantContext = createContext();

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get tenantId from localStorage
  const getStoredTenantId = () => {
    return localStorage.getItem('tenantId');
  };

  // Set tenantId in localStorage and state
  const setTenantId = (tenantId) => {
    if (tenantId) {
      localStorage.setItem('tenantId', tenantId);
    } else {
      localStorage.removeItem('tenantId');
    }
  };

  // Load tenant config
  const loadTenantConfig = async (tenantId) => {
    if (!tenantId) {
      setTenant(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/tenant/${tenantId}`);
      if (response.success) {
        setTenant(response.data);
        setTenantId(tenantId);
        return response.data;
      }
      throw new Error('Failed to load tenant');
    } catch (err) {
      console.error('Failed to load tenant config:', err);
      setError(err.message || 'Failed to load organization');
      setTenant(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load tenant config by slug (for login page)
  const loadTenantBySlug = async (slug) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/tenant/config/${slug}`);
      if (response.success) {
        setTenant(response.data);
        setTenantId(response.data.id);
        return response.data;
      }
      throw new Error('Organization not found');
    } catch (err) {
      console.error('Failed to load tenant by slug:', err);
      setError(err.message || 'Organization not found');
      setTenant(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Clear tenant context (on logout)
  const clearTenant = () => {
    localStorage.removeItem('tenantId');
    setTenant(null);
    setError(null);
  };

  // Get branding defaults
  const getBranding = () => {
    if (!tenant || !tenant.branding) {
      return {
        appName: 'Chit Fund Manager',
        logo: null,
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e'
      };
    }
    return tenant.branding;
  };

  // Initialize on mount
  useEffect(() => {
    const storedTenantId = getStoredTenantId();
    if (storedTenantId) {
      loadTenantConfig(storedTenantId);
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    tenant,
    tenantId: tenant?.id || getStoredTenantId(),
    loading,
    error,
    loadTenantConfig,
    loadTenantBySlug,
    clearTenant,
    setTenantId,
    getBranding,
    isMultiTenant: true
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;
