const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, isAdmin, isTenantAdmin, requireTenant } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantResolver');

// Helper to get tenant filter for queries
const getFilter = (req) => {
  if (req.user.platformRole === 'superadmin' && !req.tenantId) {
    return {};
  }
  const tenantId = req.tenantId || req.user.tenantId;
  return tenantId ? { tenantId } : {};
};

// @desc    Create a new member
// @route   POST /api/members
// @access  Private/Admin
router.post('/', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const { name, phone, email, password, language } = req.body;
    const tenantId = req.tenantId || req.user.tenantId;

    // Validate required fields
    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, phone, and password'
      });
    }

    // Check if phone already exists within this tenant
    const existingUser = await User.findOne({ phone, tenantId });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already registered in this organization'
      });
    }

    // Create member with tenant
    const member = await User.create({
      tenantId,
      platformRole: 'tenant_user',
      tenantRole: 'member',
      role: 'member', // backward compatibility
      name,
      phone,
      email: email || '',
      password,
      language: language || 'en',
      status: 'active',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: {
        _id: member._id,
        name: member.name,
        phone: member.phone,
        email: member.email,
        role: member.role,
        tenantRole: member.tenantRole,
        language: member.language,
        status: member.status,
        createdAt: member.createdAt
      }
    });
  } catch (error) {
    console.error('Create member error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already registered'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get all members
// @route   GET /api/members
// @access  Private/Admin
router.get('/', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const members = await User.find({ ...tenantFilter, platformRole: 'tenant_user', tenantRole: 'member' })
      .populate('chitGroups', 'name status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members.map(member => ({
        _id: member._id,
        name: member.name,
        phone: member.phone,
        email: member.email,
        language: member.language,
        status: member.status,
        chitGroups: member.chitGroups,
        totalChitGroups: member.chitGroups.length,
        lastLogin: member.lastLogin,
        createdAt: member.createdAt
      }))
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get single member
// @route   GET /api/members/:id
// @access  Private/Admin
router.get('/:id', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const member = await User.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('chitGroups', 'name status chitAmount');

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private/Admin
router.put('/:id', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const { name, phone, email, language, status, password } = req.body;
    const tenantFilter = getFilter(req);

    const member = await User.findOne({ _id: req.params.id, ...tenantFilter });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Update fields
    if (name) member.name = name;
    if (phone) member.phone = phone;
    if (email !== undefined) member.email = email;
    if (language) member.language = language;
    if (status) member.status = status;
    if (password) member.password = password;

    await member.save();

    res.status(200).json({
      success: true,
      data: {
        _id: member._id,
        name: member.name,
        phone: member.phone,
        email: member.email,
        language: member.language,
        status: member.status,
        updatedAt: member.updatedAt
      }
    });
  } catch (error) {
    console.error('Update member error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already registered'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private/Admin
router.delete('/:id', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const member = await User.findOne({ _id: req.params.id, ...tenantFilter });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Check if member is part of any active chit groups
    if (member.chitGroups && member.chitGroups.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete member who is part of chit groups. Remove from chit groups first.'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Suspend/Activate member
// @route   PUT /api/members/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const { status, suspensionReason } = req.body;
    const tenantFilter = getFilter(req);

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be active, suspended, or inactive'
      });
    }

    const member = await User.findOne({ _id: req.params.id, ...tenantFilter });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    member.status = status;
    if (status === 'suspended' && suspensionReason) {
      member.suspensionReason = suspensionReason;
    } else if (status === 'active') {
      member.suspensionReason = null;
    }

    await member.save();

    res.status(200).json({
      success: true,
      data: {
        _id: member._id,
        name: member.name,
        status: member.status,
        suspensionReason: member.suspensionReason
      }
    });
  } catch (error) {
    console.error('Update member status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;
