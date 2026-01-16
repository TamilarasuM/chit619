const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// Protect routes - Verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please login.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }

    // Check if user is active
    if (req.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact administrator.'
      });
    }

    // Check if user can login (for suspended users with restricted permissions)
    if (req.user.status === 'suspended' && !req.user.permissions.canLogin) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact administrator.'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Invalid token.'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Check if user is member
exports.isMember = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }

  if (req.user.role !== 'member') {
    return res.status(403).json({
      success: false,
      message: 'Member access required'
    });
  }

  next();
};

// Check if user can view auctions (for suspended members)
exports.canViewAuctions = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (!req.user.permissions || !req.user.permissions.canViewAuctions) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view auctions'
    });
  }

  next();
};

// Check if user can view statements (for suspended members)
exports.canViewStatements = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (!req.user.permissions || !req.user.permissions.canViewStatements) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view statements'
    });
  }

  next();
};

// Optional auth - Set user if token is valid but don't require it
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    console.error('Optional auth error:', error);
  }

  next();
};

// Check if user is super admin (platform level)
exports.isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }

  if (req.user.platformRole !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Super Admin access required'
    });
  }

  next();
};

// Check if user is tenant admin (organization level)
exports.isTenantAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }

  // Super admin can access tenant admin routes
  if (req.user.platformRole === 'superadmin') {
    return next();
  }

  if (req.user.platformRole !== 'tenant_user' || req.user.tenantRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Tenant Admin access required'
    });
  }

  next();
};

// Require tenant context for the request
exports.requireTenant = async (req, res, next) => {
  // Super admin can operate without tenant context
  if (req.user && req.user.platformRole === 'superadmin') {
    return next();
  }

  // Check if tenant is resolved
  if (!req.tenant && !req.tenantId) {
    // Try to get tenant from user
    if (req.user && req.user.tenantId) {
      const tenant = await Tenant.findById(req.user.tenantId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'User tenant not found'
        });
      }
      if (tenant.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Tenant account is ${tenant.status}. Please contact support.`
        });
      }
      req.tenant = tenant;
      req.tenantId = tenant._id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required. Please provide X-Tenant-Id header.'
      });
    }
  }

  next();
};

// Validate user belongs to request tenant
exports.validateUserTenant = (req, res, next) => {
  // Super admin can access any tenant
  if (req.user && req.user.platformRole === 'superadmin') {
    return next();
  }

  // Tenant user must belong to the request tenant
  if (req.user && req.user.tenantId && req.tenant) {
    if (req.user.tenantId.toString() !== req.tenant._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User does not belong to this tenant.'
      });
    }
  }

  next();
};

// Authorize roles for multi-tenant system
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login.'
      });
    }

    // Super admin has all access
    if (req.user.platformRole === 'superadmin') {
      return next();
    }

    // Check tenant role for tenant users
    const userRole = req.user.tenantRole || req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role '${userRole}' is not authorized to access this route`
      });
    }

    next();
  };
};
