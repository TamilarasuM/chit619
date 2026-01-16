const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  // Auto-generated unique tenant code (e.g., TN-000001)
  tenantCode: {
    type: String,
    unique: true
    // Note: unique: true automatically creates an index
  },
  name: {
    type: String,
    required: [true, 'Please add a tenant name'],
    trim: true,
    maxlength: [100, 'Tenant name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Please add a tenant slug'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[a-z0-9-]+$/,
      'Slug can only contain lowercase letters, numbers, and hyphens'
    ],
    maxlength: [50, 'Slug cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add a contact email'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    trim: true,
    match: [
      /^[0-9]{10}$/,
      'Please add a valid 10-digit phone number'
    ]
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  suspensionReason: {
    type: String,
    default: null
  },
  // Branding
  branding: {
    appName: {
      type: String,
      default: 'Chit Fund Manager',
      maxlength: [100, 'App name cannot be more than 100 characters']
    },
    logo: {
      type: String,
      default: null
    },
    primaryColor: {
      type: String,
      default: '#1976d2',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Please add a valid hex color']
    },
    secondaryColor: {
      type: String,
      default: '#dc004e',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Please add a valid hex color']
    }
  },
  // Limits
  limits: {
    maxChitGroups: {
      type: Number,
      default: 100,
      min: [1, 'Max chit groups must be at least 1']
    },
    maxMembers: {
      type: Number,
      default: 1000,
      min: [1, 'Max members must be at least 1']
    },
    maxAdmins: {
      type: Number,
      default: 10,
      min: [1, 'Max admins must be at least 1']
    }
  },
  // Address
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' }
  },
  // Stats (cached for performance)
  stats: {
    totalMembers: { type: Number, default: 0 },
    totalChitGroups: { type: Number, default: 0 },
    totalAdmins: { type: Number, default: 0 },
    activeChitGroups: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  suspendedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster lookups (slug already indexed via unique: true)
TenantSchema.index({ status: 1 });
TenantSchema.index({ createdAt: -1 });

// Generate slug from name if not provided
TenantSchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Auto-generate unique tenant code before saving
TenantSchema.pre('save', async function(next) {
  if (!this.tenantCode) {
    // Get the count of existing tenants to generate next code
    const count = await mongoose.model('Tenant').countDocuments();
    // Generate code like TN-000001, TN-000002, etc.
    this.tenantCode = `TN-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Static method to update stats
TenantSchema.statics.updateStats = async function(tenantId) {
  const User = mongoose.model('User');
  const ChitGroup = mongoose.model('ChitGroup');

  const [memberCount, adminCount, chitGroupCount, activeChitCount] = await Promise.all([
    User.countDocuments({ tenantId, platformRole: 'tenant_user', tenantRole: 'member' }),
    User.countDocuments({ tenantId, platformRole: 'tenant_user', tenantRole: 'admin' }),
    ChitGroup.countDocuments({ tenantId }),
    ChitGroup.countDocuments({ tenantId, status: 'Active' })
  ]);

  await this.findByIdAndUpdate(tenantId, {
    'stats.totalMembers': memberCount,
    'stats.totalAdmins': adminCount,
    'stats.totalChitGroups': chitGroupCount,
    'stats.activeChitGroups': activeChitCount
  });
};

// Method to suspend tenant
TenantSchema.methods.suspend = async function(userId, reason) {
  this.status = 'suspended';
  this.suspendedBy = userId;
  this.suspendedAt = new Date();
  this.suspensionReason = reason;
  await this.save();
};

// Method to activate tenant
TenantSchema.methods.activate = async function() {
  this.status = 'active';
  this.suspendedBy = null;
  this.suspendedAt = null;
  this.suspensionReason = null;
  await this.save();
};

// Virtual for checking if tenant is active
TenantSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Ensure virtuals are included in JSON
TenantSchema.set('toJSON', { virtuals: true });
TenantSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tenant', TenantSchema);
