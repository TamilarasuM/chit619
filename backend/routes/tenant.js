const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { resolveTenant } = require('../middleware/tenantResolver');

// @desc    Get tenant config by slug (public route for login page)
// @route   GET /api/tenant/config/:slug
// @access  Public
router.get('/config/:slug', async (req, res, next) => {
  try {
    const tenant = await Tenant.findOne({
      slug: req.params.slug.toLowerCase(),
      status: 'active'
    }).select('name slug branding');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        branding: tenant.branding
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get current tenant config (from X-Tenant-Id header)
// @route   GET /api/tenant/config
// @access  Public (with tenant header)
router.get('/config', resolveTenant, async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID required. Please provide X-Tenant-Id header.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.tenant._id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        branding: req.tenant.branding,
        status: req.tenant.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get tenant by ID (public route)
// @route   GET /api/tenant/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    // Validate ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant ID format'
      });
    }

    const tenant = await Tenant.findById(req.params.id)
      .select('name slug branding status');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Tenant account is ${tenant.status}`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        branding: tenant.branding
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
