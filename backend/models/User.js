const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  // Multi-tenant fields
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null, // null for super admin
    index: true
  },
  platformRole: {
    type: String,
    enum: ['superadmin', 'tenant_user'],
    default: 'tenant_user'
  },
  tenantRole: {
    type: String,
    enum: ['admin', 'member', null],
    default: 'member'
  },
  // Keep 'role' for backward compatibility during migration
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    trim: true,
    match: [
      /^[0-9]{10}$/,
      'Please add a valid 10-digit phone number'
    ]
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  language: {
    type: String,
    enum: ['en', 'ta'],
    default: 'en'
  },
  profilePhoto: {
    type: String,
    default: null
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
  permissions: {
    canViewAuctions: {
      type: Boolean,
      default: true
    },
    canViewStatements: {
      type: Boolean,
      default: true
    },
    canLogin: {
      type: Boolean,
      default: true
    }
  },
  chitGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compound index for phone uniqueness within tenant
// Phone must be unique within a tenant, but same phone can exist in different tenants
UserSchema.index({ tenantId: 1, phone: 1 }, {
  unique: true,
  partialFilterExpression: { tenantId: { $ne: null } }
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      tenantRole: this.tenantRole,
      tenantId: this.tenantId,
      platformRole: this.platformRole
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

// Virtual for checking if user is super admin
UserSchema.virtual('isSuperAdmin').get(function() {
  return this.platformRole === 'superadmin';
});

// Virtual for checking if user is tenant admin
UserSchema.virtual('isTenantAdmin').get(function() {
  return this.platformRole === 'tenant_user' && this.tenantRole === 'admin';
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login timestamp
UserSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  await this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', UserSchema);
