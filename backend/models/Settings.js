const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null, // null for global settings
    index: true
  },
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    trim: true,
    uppercase: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'general',
      'auction',
      'payment',
      'notification',
      'security',
      'system',
      'localization',
      'email',
      'whatsapp'
    ]
  },
  description: {
    type: String,
    maxlength: 500
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes - compound unique for tenantId + key
SettingsSchema.index({ tenantId: 1, key: 1 }, { unique: true });
SettingsSchema.index({ category: 1 });

// Method to update setting value
SettingsSchema.methods.updateValue = async function(newValue, userId) {
  if (this.isSystem) {
    throw new Error('Cannot modify system settings');
  }

  // Validate data type
  const valueType = Array.isArray(newValue) ? 'array' : typeof newValue;
  if (this.dataType !== valueType && this.dataType !== 'object') {
    throw new Error(`Value must be of type ${this.dataType}`);
  }

  this.value = newValue;
  this.lastModifiedBy = userId;
  this.lastModifiedAt = Date.now();

  await this.save();
  return this;
};

// Static method to get setting by key
SettingsSchema.statics.getByKey = async function(key) {
  const setting = await this.findOne({ key: key.toUpperCase() });
  return setting ? setting.value : null;
};

// Static method to get all settings by category
SettingsSchema.statics.getByCategory = async function(category) {
  return await this.find({ category }).sort({ key: 1 }).exec();
};

// Static method to set or update a setting
SettingsSchema.statics.setSetting = async function(key, value, category, description, dataType, userId, isSystem = false) {
  const setting = await this.findOne({ key: key.toUpperCase() });

  if (setting) {
    // Update existing setting
    if (setting.isSystem && !isSystem) {
      throw new Error('Cannot modify system settings');
    }

    setting.value = value;
    setting.lastModifiedBy = userId;
    setting.lastModifiedAt = Date.now();
    await setting.save();
    return setting;
  } else {
    // Create new setting
    return await this.create({
      key: key.toUpperCase(),
      value,
      category,
      description,
      dataType,
      isSystem,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now()
    });
  }
};

// Static method to initialize default settings
SettingsSchema.statics.initializeDefaults = async function() {
  const defaults = [
    // General Settings
    {
      key: 'APP_NAME',
      value: 'Chit Fund Manager',
      category: 'general',
      description: 'Application name',
      dataType: 'string',
      isSystem: false
    },
    {
      key: 'DEFAULT_LANGUAGE',
      value: 'en',
      category: 'localization',
      description: 'Default language for the application',
      dataType: 'string',
      isSystem: false
    },
    {
      key: 'CURRENCY_CODE',
      value: 'INR',
      category: 'general',
      description: 'Currency code',
      dataType: 'string',
      isSystem: false
    },
    {
      key: 'CURRENCY_SYMBOL',
      value: '₹',
      category: 'general',
      description: 'Currency symbol',
      dataType: 'string',
      isSystem: false
    },
    {
      key: 'DATE_FORMAT',
      value: 'DD/MM/YYYY',
      category: 'localization',
      description: 'Date format for display',
      dataType: 'string',
      isSystem: false
    },
    {
      key: 'TIME_ZONE',
      value: 'Asia/Kolkata',
      category: 'localization',
      description: 'Application timezone',
      dataType: 'string',
      isSystem: false
    },

    // Auction Settings
    {
      key: 'MIN_BID_INCREMENT',
      value: 1,
      category: 'auction',
      description: 'Minimum bid increment amount',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'AUCTION_REMINDER_HOURS',
      value: 1,
      category: 'auction',
      description: 'Hours before auction to send reminder',
      dataType: 'number',
      isSystem: false
    },

    // Payment Settings
    {
      key: 'DEFAULT_GRACE_PERIOD_DAYS',
      value: 3,
      category: 'payment',
      description: 'Default grace period in days',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'PAYMENT_METHODS',
      value: ['Cash', 'Bank Transfer', 'UPI', 'Cheque'],
      category: 'payment',
      description: 'Available payment methods',
      dataType: 'array',
      isSystem: false
    },

    // Notification Settings
    {
      key: 'ENABLE_WHATSAPP_NOTIFICATIONS',
      value: true,
      category: 'notification',
      description: 'Enable WhatsApp notifications',
      dataType: 'boolean',
      isSystem: false
    },
    {
      key: 'ENABLE_EMAIL_NOTIFICATIONS',
      value: false,
      category: 'notification',
      description: 'Enable email notifications',
      dataType: 'boolean',
      isSystem: false
    },
    {
      key: 'NOTIFICATION_RETRY_ATTEMPTS',
      value: 3,
      category: 'notification',
      description: 'Number of retry attempts for failed notifications',
      dataType: 'number',
      isSystem: false
    },

    // Security Settings
    {
      key: 'PASSWORD_MIN_LENGTH',
      value: 6,
      category: 'security',
      description: 'Minimum password length',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'JWT_EXPIRE_DAYS',
      value: 30,
      category: 'security',
      description: 'JWT token expiration in days',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'MAX_LOGIN_ATTEMPTS',
      value: 5,
      category: 'security',
      description: 'Maximum login attempts before lockout',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'LOCK_TIME_MINUTES',
      value: 15,
      category: 'security',
      description: 'Account lock time in minutes after max attempts',
      dataType: 'number',
      isSystem: false
    },

    // System Settings
    {
      key: 'PAGINATION_DEFAULT_LIMIT',
      value: 20,
      category: 'system',
      description: 'Default pagination limit',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'PAGINATION_MAX_LIMIT',
      value: 100,
      category: 'system',
      description: 'Maximum pagination limit',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'AUDIT_LOG_RETENTION_DAYS',
      value: 365,
      category: 'system',
      description: 'Audit log retention period in days',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'NOTIFICATION_CLEANUP_DAYS',
      value: 90,
      category: 'system',
      description: 'Notification cleanup period in days',
      dataType: 'number',
      isSystem: false
    },
    {
      key: 'ENABLE_MAINTENANCE_MODE',
      value: false,
      category: 'system',
      description: 'Enable maintenance mode',
      dataType: 'boolean',
      isSystem: false
    }
  ];

  const promises = defaults.map(async (setting) => {
    const exists = await this.findOne({ key: setting.key });
    if (!exists) {
      return await this.create(setting);
    }
    return exists;
  });

  return await Promise.all(promises);
};

// Static method to get all settings as key-value object
SettingsSchema.statics.getAllAsObject = async function() {
  const settings = await this.find().exec();
  const result = {};

  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });

  return result;
};

// Static method to bulk update settings
SettingsSchema.statics.bulkUpdate = async function(updates, userId) {
  const promises = Object.entries(updates).map(async ([key, value]) => {
    const setting = await this.findOne({ key: key.toUpperCase() });

    if (!setting) {
      throw new Error(`Setting with key ${key} not found`);
    }

    if (setting.isSystem) {
      throw new Error(`Cannot modify system setting ${key}`);
    }

    return await setting.updateValue(value, userId);
  });

  return await Promise.all(promises);
};

// Static method to reset to defaults
SettingsSchema.statics.resetToDefaults = async function() {
  await this.deleteMany({ isSystem: false });
  return await this.initializeDefaults();
};

// Virtual for formatted last modified
SettingsSchema.virtual('formattedLastModified').get(function() {
  if (!this.lastModifiedAt) return 'Never';

  return this.lastModifiedAt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Ensure virtuals are included in JSON
SettingsSchema.set('toJSON', { virtuals: true });
SettingsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Settings', SettingsSchema);
