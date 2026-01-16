const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { protect } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantResolver');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', resolveTenant, async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate phone & password
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide phone number and password'
      });
    }

    let user;

    // If tenant context provided (X-Tenant-Id header), find tenant user
    if (req.tenantId) {
      user = await User.findOne({
        phone,
        tenantId: req.tenantId,
        platformRole: 'tenant_user'
      }).select('+password');
    } else {
      // No tenant context - could be super admin, tenant user, or legacy user
      // First try to find super admin
      user = await User.findOne({
        phone,
        platformRole: 'superadmin'
      }).select('+password');

      // If not super admin, try to find tenant user
      if (!user) {
        // Search for tenant users with this phone number
        const tenantUsers = await User.find({
          phone,
          platformRole: 'tenant_user',
          tenantId: { $ne: null }
        }).select('+password');

        if (tenantUsers.length === 1) {
          // Only one tenant user found, use it
          user = tenantUsers[0];
        } else if (tenantUsers.length > 1) {
          // Multiple tenant users with same phone (across different tenants)
          // Return error asking to specify tenant
          return res.status(400).json({
            success: false,
            error: 'Multiple accounts found with this phone number. Please contact support.',
            requiresTenant: true
          });
        }
      }

      // If still no user, try legacy user (users without tenantId)
      if (!user) {
        user = await User.findOne({
          phone,
          tenantId: null,
          platformRole: { $ne: 'superadmin' }
        }).select('+password');
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is not active. Please contact administrator.'
      });
    }

    // For tenant users, verify tenant is active
    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      if (!tenant || tenant.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Your organization account is not active. Please contact support.'
        });
      }
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Create token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        tenantRole: user.tenantRole,
        platformRole: user.platformRole,
        tenantId: user.tenantId,
        language: user.language,
        status: user.status,
        permissions: user.permissions,
        isSuperAdmin: user.platformRole === 'superadmin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('chitGroups', 'name status chitAmount');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
router.put('/updatedetails', protect, async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      language: req.body.language
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update details error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
router.put('/updatepassword', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;
