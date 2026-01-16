const Tenant = require('../models/Tenant');
const { ErrorResponse } = require('./error');

/**
 * Tenant Resolver Middleware
 * Extracts X-Tenant-Id header from requests and loads the tenant
 */

// Resolve tenant from X-Tenant-Id header
const resolveTenant = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    // If no tenant ID header, skip (will be handled by requireTenant if needed)
    if (!tenantId) {
      req.tenant = null;
      return next();
    }

    // Validate tenant ID format
    if (!tenantId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorResponse('Invalid tenant ID format', 400));
    }

    // Load tenant from database
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return next(new ErrorResponse('Tenant not found', 404));
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      return next(new ErrorResponse(`Tenant account is ${tenant.status}. Please contact support.`, 403));
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant._id;

    next();
  } catch (error) {
    next(new ErrorResponse('Error resolving tenant', 500));
  }
};

// Require tenant to be present (use after resolveTenant)
const requireTenant = (req, res, next) => {
  // Skip for super admin
  if (req.user && req.user.platformRole === 'superadmin') {
    return next();
  }

  if (!req.tenant) {
    return next(new ErrorResponse('Tenant context required. Please provide X-Tenant-Id header.', 400));
  }

  next();
};

// Validate user belongs to request tenant
const validateUserTenant = (req, res, next) => {
  // Skip for super admin
  if (req.user && req.user.platformRole === 'superadmin') {
    return next();
  }

  // If user has a tenantId, it must match the request tenant
  if (req.user && req.user.tenantId && req.tenant) {
    if (req.user.tenantId.toString() !== req.tenant._id.toString()) {
      return next(new ErrorResponse('Access denied. User does not belong to this tenant.', 403));
    }
  }

  next();
};

// Middleware to skip tenant resolution for super admin routes
const skipTenantForSuperAdmin = (req, res, next) => {
  // Super admin routes don't need tenant context
  if (req.path.startsWith('/api/superadmin')) {
    return next();
  }

  // Continue with normal tenant resolution
  resolveTenant(req, res, next);
};

// Get tenant filter for queries
const getTenantFilter = (req) => {
  // Super admin can see all data when no tenant is specified
  if (req.user && req.user.platformRole === 'superadmin' && !req.tenant) {
    return {};
  }

  // Return tenant filter
  return req.tenantId ? { tenantId: req.tenantId } : {};
};

// Add tenant to new document
const addTenantToDocument = (req, data) => {
  if (req.tenantId) {
    return { ...data, tenantId: req.tenantId };
  }
  return data;
};

module.exports = {
  resolveTenant,
  requireTenant,
  validateUserTenant,
  skipTenantForSuperAdmin,
  getTenantFilter,
  addTenantToDocument
};
