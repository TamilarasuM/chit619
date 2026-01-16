const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const { protect, isSuperAdmin } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// Apply protection to all super admin routes
router.use(protect);
router.use(isSuperAdmin);

// @desc    Get super admin dashboard stats
// @route   GET /api/superadmin/dashboard
// @access  Super Admin
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalChitGroups
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ status: 'suspended' }),
      User.countDocuments({ platformRole: 'tenant_user' }),
      ChitGroup.countDocuments()
    ]);

    // Recent tenants
    const recentTenants = await Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name slug email status createdAt stats');

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalTenants,
          activeTenants,
          suspendedTenants,
          totalUsers,
          totalChitGroups
        },
        recentTenants
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all tenants
// @route   GET /api/superadmin/tenants
// @access  Super Admin
router.get('/tenants', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Search by name or email
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { slug: new RegExp(req.query.search, 'i') }
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name'),
      Tenant.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: tenants.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: tenants
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single tenant
// @route   GET /api/superadmin/tenants/:id
// @access  Super Admin
router.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('suspendedBy', 'name email');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Get tenant admins
    const admins = await User.find({
      tenantId: tenant._id,
      platformRole: 'tenant_user',
      tenantRole: 'admin'
    }).select('name email phone status createdAt');

    // Get member count
    const memberCount = await User.countDocuments({
      tenantId: tenant._id,
      platformRole: 'tenant_user',
      tenantRole: 'member'
    });

    // Get chit group count
    const chitGroupCount = await ChitGroup.countDocuments({
      tenantId: tenant._id
    });

    res.status(200).json({
      success: true,
      data: {
        tenant,
        admins,
        memberCount,
        chitGroupCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new tenant with first admin
// @route   POST /api/superadmin/tenants
// @access  Super Admin
router.post('/tenants', async (req, res, next) => {
  try {
    const {
      name,
      slug,
      email,
      phone,
      branding,
      limits,
      address,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    if (!adminName || !adminPhone || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin name, phone, and password are required'
      });
    }

    // Check if tenant slug already exists
    const existingTenant = await Tenant.findOne({
      $or: [{ email }, { slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }]
    });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant with this email or slug already exists'
      });
    }

    // Create tenant
    const tenant = await Tenant.create({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      email,
      phone,
      branding: branding || {},
      limits: limits || {},
      address: address || {},
      createdBy: req.user._id,
      status: 'active'
    });

    // Create first admin user for the tenant
    const adminUser = await User.create({
      tenantId: tenant._id,
      platformRole: 'tenant_user',
      tenantRole: 'admin',
      role: 'admin', // backward compatibility
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
      status: 'active'
    });

    // Update tenant stats
    tenant.stats.totalAdmins = 1;
    await tenant.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user._id,
      userRole: 'superadmin',
      userName: req.user.name,
      action: 'Created new tenant',
      entity: 'System',
      entityId: tenant._id,
      after: { tenantName: tenant.name, tenantSlug: tenant.slug },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenant,
        admin: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update tenant
// @route   PUT /api/superadmin/tenants/:id
// @access  Super Admin
router.put('/tenants/:id', async (req, res, next) => {
  try {
    const { name, email, phone, branding, limits, address } = req.body;

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const before = { ...tenant.toObject() };

    // Update fields
    if (name) tenant.name = name;
    if (email) tenant.email = email;
    if (phone) tenant.phone = phone;
    if (branding) tenant.branding = { ...tenant.branding, ...branding };
    if (limits) tenant.limits = { ...tenant.limits, ...limits };
    if (address) tenant.address = { ...tenant.address, ...address };

    await tenant.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user._id,
      userRole: 'superadmin',
      userName: req.user.name,
      action: 'Updated tenant',
      entity: 'System',
      entityId: tenant._id,
      before,
      after: tenant.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Suspend tenant
// @route   PUT /api/superadmin/tenants/:id/suspend
// @access  Super Admin
router.put('/tenants/:id/suspend', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    if (tenant.status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'Tenant is already suspended'
      });
    }

    await tenant.suspend(req.user._id, reason || 'Suspended by super admin');

    // Log the action
    await AuditLog.logAction({
      userId: req.user._id,
      userRole: 'superadmin',
      userName: req.user.name,
      action: 'Suspended tenant',
      entity: 'System',
      entityId: tenant._id,
      after: { status: 'suspended', reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Tenant suspended successfully',
      data: tenant
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Activate tenant
// @route   PUT /api/superadmin/tenants/:id/activate
// @access  Super Admin
router.put('/tenants/:id/activate', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    if (tenant.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Tenant is already active'
      });
    }

    await tenant.activate();

    // Log the action
    await AuditLog.logAction({
      userId: req.user._id,
      userRole: 'superadmin',
      userName: req.user.name,
      action: 'Activated tenant',
      entity: 'System',
      entityId: tenant._id,
      after: { status: 'active' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Tenant activated successfully',
      data: tenant
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete tenant
// @route   DELETE /api/superadmin/tenants/:id
// @access  Super Admin
router.delete('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check if tenant has active chit groups
    const activeChitGroups = await ChitGroup.countDocuments({
      tenantId: tenant._id,
      status: 'Active'
    });

    if (activeChitGroups > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete tenant with ${activeChitGroups} active chit groups. Please close all chit groups first.`
      });
    }

    // Delete all tenant data (cascade delete)
    const tenantId = tenant._id;
    const tenantName = tenant.name;

    // Delete users
    await User.deleteMany({ tenantId });

    // Delete chit groups and related data
    const ChitGroupModel = require('../models/ChitGroup');
    const Auction = require('../models/Auction');
    const Payment = require('../models/Payment');
    const MemberStatement = require('../models/MemberStatement');
    const MemberRanking = require('../models/MemberRanking');
    const Notification = require('../models/Notification');
    const Settings = require('../models/Settings');

    await Promise.all([
      ChitGroupModel.deleteMany({ tenantId }),
      Auction.deleteMany({ tenantId }),
      Payment.deleteMany({ tenantId }),
      MemberStatement.deleteMany({ tenantId }),
      MemberRanking.deleteMany({ tenantId }),
      Notification.deleteMany({ tenantId }),
      Settings.deleteMany({ tenantId }),
      AuditLog.deleteMany({ tenantId })
    ]);

    // Delete tenant
    await tenant.deleteOne();

    // Log the action (global audit log)
    await AuditLog.logAction({
      tenantId: null, // Platform level action
      userId: req.user._id,
      userRole: 'superadmin',
      userName: req.user.name,
      action: 'Deleted tenant',
      entity: 'System',
      entityId: tenantId,
      after: { tenantName, deleted: true },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Tenant and all associated data deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// TENANT ADMIN MANAGEMENT ROUTES
// ===========================================

// @desc    Add new admin to tenant
// @route   POST /api/superadmin/tenants/:id/admins
// @access  Super Admin
router.post('/tenants/:id/admins', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and password are required'
      });
    }

    // Check if phone already exists in this tenant
    const existingUser = await User.findOne({ phone, tenantId: tenant._id });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone already exists in this tenant'
      });
    }

    const admin = await User.create({
      tenantId: tenant._id,
      platformRole: 'tenant_user',
      tenantRole: 'admin',
      role: 'admin',
      name,
      email,
      phone,
      password,
      status: 'active'
    });

    // Update tenant stats
    tenant.stats.totalAdmins = (tenant.stats.totalAdmins || 0) + 1;
    await tenant.save();

    res.status(201).json({
      success: true,
      message: 'Admin added successfully',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        status: admin.status,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update tenant admin
// @route   PUT /api/superadmin/tenants/:id/admins/:adminId
// @access  Super Admin
router.put('/tenants/:id/admins/:adminId', async (req, res, next) => {
  try {
    const { name, email, phone, status } = req.body;

    const admin = await User.findOne({
      _id: req.params.adminId,
      tenantId: req.params.id,
      tenantRole: 'admin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Update fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) {
      // Check if new phone already exists
      const existingUser = await User.findOne({
        phone,
        tenantId: req.params.id,
        _id: { $ne: admin._id }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Another user with this phone already exists'
        });
      }
      admin.phone = phone;
    }
    if (status) admin.status = status;

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        status: admin.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Reset tenant admin password
// @route   PUT /api/superadmin/tenants/:id/admins/:adminId/reset-password
// @access  Super Admin
router.put('/tenants/:id/admins/:adminId/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const admin = await User.findOne({
      _id: req.params.adminId,
      tenantId: req.params.id,
      tenantRole: 'admin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    admin.password = newPassword;
    await admin.save();

    // Log the action
    await AuditLog.logAction({
      tenantId: req.params.id,
      userId: req.user._id,
      userRole: 'superadmin',
      userName: req.user.name,
      action: 'Reset admin password',
      entity: 'User',
      entityId: admin._id,
      after: { adminName: admin.name, adminPhone: admin.phone },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete tenant admin
// @route   DELETE /api/superadmin/tenants/:id/admins/:adminId
// @access  Super Admin
router.delete('/tenants/:id/admins/:adminId', async (req, res, next) => {
  try {
    const admin = await User.findOne({
      _id: req.params.adminId,
      tenantId: req.params.id,
      tenantRole: 'admin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check if this is the last admin
    const adminCount = await User.countDocuments({
      tenantId: req.params.id,
      tenantRole: 'admin'
    });

    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last admin of a tenant'
      });
    }

    await admin.deleteOne();

    // Update tenant stats
    const tenant = await Tenant.findById(req.params.id);
    if (tenant) {
      tenant.stats.totalAdmins = Math.max(0, (tenant.stats.totalAdmins || 1) - 1);
      await tenant.save();
    }

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// SUPER ADMIN MANAGEMENT ROUTES
// ===========================================

// @desc    Get all super admins
// @route   GET /api/superadmin/admins
// @access  Super Admin
router.get('/admins', async (req, res, next) => {
  try {
    const admins = await User.find({ platformRole: 'superadmin' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create super admin
// @route   POST /api/superadmin/admins
// @access  Super Admin
router.post('/admins', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and password are required'
      });
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone, platformRole: 'superadmin' });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Super admin with this phone already exists'
      });
    }

    const admin = await User.create({
      tenantId: null,
      platformRole: 'superadmin',
      tenantRole: null,
      role: 'admin',
      name,
      email,
      phone,
      password,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
