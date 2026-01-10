const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { category } = req.query;

    const query = {};
    if (category) query.category = category;

    const settings = await Settings.find(query).sort({ category: 1, key: 1 });

    // Group by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: settings.length,
      data: settings,
      grouped: groupedSettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching settings'
    });
  }
});

// @desc    Get setting by key
// @route   GET /api/settings/:key
// @access  Private
router.get('/:key', protect, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    res.status(200).json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching setting'
    });
  }
});

// @desc    Create or update setting
// @route   PUT /api/settings/:key
// @access  Private/Admin
router.put('/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const { value, description, category, dataType } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Please provide value'
      });
    }

    let setting = await Settings.findOne({ key: req.params.key });

    if (setting) {
      // Update existing setting
      if (setting.isSystem) {
        return res.status(400).json({
          success: false,
          error: 'Cannot modify system setting'
        });
      }

      setting.value = value;
      if (description) setting.description = description;
      setting.lastModifiedBy = req.user.id;
      setting.lastModifiedAt = new Date();

      await setting.save();
    } else {
      // Create new setting
      setting = await Settings.create({
        key: req.params.key,
        value,
        description: description || '',
        category: category || 'general',
        dataType: dataType || typeof value,
        isSystem: false,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: setting ? 'Setting updated' : 'Setting created',
      data: setting
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating setting'
    });
  }
});

// @desc    Delete setting
// @route   DELETE /api/settings/:key
// @access  Private/Admin
router.delete('/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    if (setting.isSystem) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete system setting'
      });
    }

    await setting.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting setting'
    });
  }
});

// @desc    Initialize default settings
// @route   POST /api/settings/init
// @access  Private/Admin
router.post('/init', protect, authorize('admin'), async (req, res) => {
  try {
    const defaultSettings = [
      {
        key: 'app_name',
        value: 'Chit Fund Manager',
        category: 'general',
        description: 'Application name',
        dataType: 'string',
        isSystem: true
      },
      {
        key: 'default_language',
        value: 'en',
        category: 'general',
        description: 'Default language for new users',
        dataType: 'string',
        isSystem: false
      },
      {
        key: 'currency_symbol',
        value: '₹',
        category: 'general',
        description: 'Currency symbol',
        dataType: 'string',
        isSystem: true
      },
      {
        key: 'currency_code',
        value: 'INR',
        category: 'general',
        description: 'Currency code',
        dataType: 'string',
        isSystem: true
      },
      {
        key: 'date_format',
        value: 'DD/MM/YYYY',
        category: 'general',
        description: 'Date format',
        dataType: 'string',
        isSystem: false
      },
      {
        key: 'timezone',
        value: 'Asia/Kolkata',
        category: 'general',
        description: 'Default timezone',
        dataType: 'string',
        isSystem: false
      },
      {
        key: 'default_grace_period',
        value: 3,
        category: 'payments',
        description: 'Default grace period in days',
        dataType: 'number',
        isSystem: false
      },
      {
        key: 'enable_whatsapp_notifications',
        value: true,
        category: 'notifications',
        description: 'Enable WhatsApp notifications',
        dataType: 'boolean',
        isSystem: false
      },
      {
        key: 'whatsapp_notification_retry',
        value: 3,
        category: 'notifications',
        description: 'Number of retries for failed notifications',
        dataType: 'number',
        isSystem: false
      },
      {
        key: 'auction_reminder_hours',
        value: 1,
        category: 'notifications',
        description: 'Hours before auction to send reminder',
        dataType: 'number',
        isSystem: false
      },
      {
        key: 'payment_reminder_days',
        value: 1,
        category: 'notifications',
        description: 'Days before due date to send payment reminder',
        dataType: 'number',
        isSystem: false
      },
      {
        key: 'enable_audit_logging',
        value: true,
        category: 'security',
        description: 'Enable audit logging',
        dataType: 'boolean',
        isSystem: true
      },
      {
        key: 'max_login_attempts',
        value: 5,
        category: 'security',
        description: 'Maximum login attempts before lockout',
        dataType: 'number',
        isSystem: false
      },
      {
        key: 'session_timeout_minutes',
        value: 30,
        category: 'security',
        description: 'Session timeout in minutes',
        dataType: 'number',
        isSystem: false
      }
    ];

    const createdSettings = [];

    for (const settingData of defaultSettings) {
      const existing = await Settings.findOne({ key: settingData.key });

      if (!existing) {
        const setting = await Settings.create({
          ...settingData,
          lastModifiedBy: req.user.id,
          lastModifiedAt: new Date()
        });
        createdSettings.push(setting);
      }
    }

    res.status(200).json({
      success: true,
      message: `${createdSettings.length} default settings initialized`,
      data: createdSettings
    });
  } catch (error) {
    console.error('Initialize settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while initializing settings'
    });
  }
});

// @desc    Bulk update settings
// @route   PUT /api/settings/bulk
// @access  Private/Admin
router.put('/bulk/update', protect, authorize('admin'), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide settings array'
      });
    }

    const updated = [];
    const errors = [];

    for (const { key, value } of settings) {
      try {
        const setting = await Settings.findOne({ key });

        if (!setting) {
          errors.push({ key, error: 'Setting not found' });
          continue;
        }

        if (setting.isSystem) {
          errors.push({ key, error: 'Cannot modify system setting' });
          continue;
        }

        setting.value = value;
        setting.lastModifiedBy = req.user.id;
        setting.lastModifiedAt = new Date();

        await setting.save();
        updated.push(setting);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `${updated.length} settings updated`,
      updated: updated.length,
      errors: errors.length,
      data: updated,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while bulk updating settings'
    });
  }
});

module.exports = router;
