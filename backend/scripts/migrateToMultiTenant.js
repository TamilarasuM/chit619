/**
 * Migration Script: Convert Single-Tenant to Multi-Tenant
 *
 * This script:
 * 1. Creates a default tenant for all existing data
 * 2. Updates all Users with tenantId and new role fields
 * 3. Updates all ChitGroups with tenantId
 * 4. Updates all Auctions with tenantId
 * 5. Updates all Payments with tenantId
 * 6. Updates all other models with tenantId
 * 7. Creates a super admin user
 * 8. Updates database indexes
 *
 * Usage: node scripts/migrateToMultiTenant.js
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Import models
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');
const MemberStatement = require('../models/MemberStatement');
const MemberRanking = require('../models/MemberRanking');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');

// Configuration
const config = {
  // Default tenant for existing data
  defaultTenant: {
    name: 'Default Organization',
    slug: 'default',
    email: 'admin@example.com',
    phone: '9999999999',
    branding: {
      appName: 'Chit Fund Manager',
      primaryColor: '#1976d2'
    }
  },
  // Super admin credentials
  superAdmin: {
    name: 'Super Admin',
    email: 'superadmin@chitfund.com',
    phone: '9999900000',
    password: 'SuperAdmin@123' // Change this in production!
  }
};

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
}

async function createSuperAdmin(createdById) {
  console.log('\n--- Creating Super Admin ---');

  // Check if super admin already exists
  const existingSuperAdmin = await User.findOne({ platformRole: 'superadmin' });
  if (existingSuperAdmin) {
    console.log('Super admin already exists:', existingSuperAdmin.phone);
    return existingSuperAdmin;
  }

  // Note: Don't pre-hash password - the User model's pre-save hook will hash it
  const superAdmin = await User.create({
    tenantId: null,
    platformRole: 'superadmin',
    tenantRole: null,
    role: 'admin',
    name: config.superAdmin.name,
    email: config.superAdmin.email,
    phone: config.superAdmin.phone,
    password: config.superAdmin.password,  // Plain text - pre-save hook will hash
    status: 'active'
  });

  console.log('Super admin created successfully!');
  console.log('  Phone:', config.superAdmin.phone);
  console.log('  Password:', config.superAdmin.password);
  console.log('  IMPORTANT: Change the password after first login!');

  return superAdmin;
}

async function createDefaultTenant(createdById) {
  console.log('\n--- Creating Default Tenant ---');

  // Check if default tenant already exists
  let tenant = await Tenant.findOne({ slug: config.defaultTenant.slug });
  if (tenant) {
    console.log('Default tenant already exists:', tenant.name);
    return tenant;
  }

  tenant = await Tenant.create({
    ...config.defaultTenant,
    createdBy: createdById,
    status: 'active'
  });

  console.log('Default tenant created:', tenant.name);
  return tenant;
}

async function migrateUsers(tenantId) {
  console.log('\n--- Migrating Users ---');

  // Find all users without tenantId (excluding super admin)
  const users = await User.find({
    tenantId: { $exists: false },
    platformRole: { $ne: 'superadmin' }
  });

  console.log(`Found ${users.length} users to migrate`);

  let migrated = 0;
  for (const user of users) {
    // Determine tenant role based on old role
    const tenantRole = user.role || 'member';

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          tenantId: tenantId,
          platformRole: 'tenant_user',
          tenantRole: tenantRole
        }
      }
    );
    migrated++;
  }

  // Also update users that have null tenantId but no platformRole
  const usersWithNull = await User.find({
    tenantId: null,
    platformRole: { $exists: false }
  });

  for (const user of usersWithNull) {
    const tenantRole = user.role || 'member';
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          tenantId: tenantId,
          platformRole: 'tenant_user',
          tenantRole: tenantRole
        }
      }
    );
    migrated++;
  }

  console.log(`Migrated ${migrated} users`);
  return migrated;
}

async function migrateChitGroups(tenantId) {
  console.log('\n--- Migrating Chit Groups ---');

  const result = await ChitGroup.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  // Also update documents with null tenantId
  const result2 = await ChitGroup.updateMany(
    { tenantId: null },
    { $set: { tenantId: tenantId } }
  );

  const total = result.modifiedCount + result2.modifiedCount;
  console.log(`Migrated ${total} chit groups`);
  return total;
}

async function migrateAuctions(tenantId) {
  console.log('\n--- Migrating Auctions ---');

  const result = await Auction.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  const result2 = await Auction.updateMany(
    { tenantId: null },
    { $set: { tenantId: tenantId } }
  );

  const total = result.modifiedCount + result2.modifiedCount;
  console.log(`Migrated ${total} auctions`);
  return total;
}

async function migratePayments(tenantId) {
  console.log('\n--- Migrating Payments ---');

  const result = await Payment.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  const result2 = await Payment.updateMany(
    { tenantId: null },
    { $set: { tenantId: tenantId } }
  );

  const total = result.modifiedCount + result2.modifiedCount;
  console.log(`Migrated ${total} payments`);
  return total;
}

async function migrateMemberStatements(tenantId) {
  console.log('\n--- Migrating Member Statements ---');

  const result = await MemberStatement.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  const result2 = await MemberStatement.updateMany(
    { tenantId: null },
    { $set: { tenantId: tenantId } }
  );

  const total = result.modifiedCount + result2.modifiedCount;
  console.log(`Migrated ${total} member statements`);
  return total;
}

async function migrateMemberRankings(tenantId) {
  console.log('\n--- Migrating Member Rankings ---');

  const result = await MemberRanking.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  const result2 = await MemberRanking.updateMany(
    { tenantId: null },
    { $set: { tenantId: tenantId } }
  );

  const total = result.modifiedCount + result2.modifiedCount;
  console.log(`Migrated ${total} member rankings`);
  return total;
}

async function migrateNotifications(tenantId) {
  console.log('\n--- Migrating Notifications ---');

  const result = await Notification.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  const result2 = await Notification.updateMany(
    { tenantId: null },
    { $set: { tenantId: tenantId } }
  );

  const total = result.modifiedCount + result2.modifiedCount;
  console.log(`Migrated ${total} notifications`);
  return total;
}

async function migrateAuditLogs(tenantId) {
  console.log('\n--- Migrating Audit Logs ---');

  const result = await AuditLog.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  // Keep null for audit logs as they could be platform-level
  console.log(`Migrated ${result.modifiedCount} audit logs`);
  return result.modifiedCount;
}

async function migrateSettings(tenantId) {
  console.log('\n--- Migrating Settings ---');

  const result = await Settings.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: tenantId } }
  );

  console.log(`Migrated ${result.modifiedCount} settings`);
  return result.modifiedCount;
}

async function updateTenantStats(tenantId) {
  console.log('\n--- Updating Tenant Stats ---');

  const [memberCount, adminCount, chitGroupCount, activeChitCount] = await Promise.all([
    User.countDocuments({ tenantId, platformRole: 'tenant_user', tenantRole: 'member' }),
    User.countDocuments({ tenantId, platformRole: 'tenant_user', tenantRole: 'admin' }),
    ChitGroup.countDocuments({ tenantId }),
    ChitGroup.countDocuments({ tenantId, status: 'Active' })
  ]);

  await Tenant.findByIdAndUpdate(tenantId, {
    'stats.totalMembers': memberCount,
    'stats.totalAdmins': adminCount,
    'stats.totalChitGroups': chitGroupCount,
    'stats.activeChitGroups': activeChitCount
  });

  console.log('Tenant stats updated:');
  console.log(`  Members: ${memberCount}`);
  console.log(`  Admins: ${adminCount}`);
  console.log(`  Chit Groups: ${chitGroupCount}`);
  console.log(`  Active Chit Groups: ${activeChitCount}`);
}

async function run() {
  console.log('='.repeat(60));
  console.log('Multi-Tenant Migration Script');
  console.log('='.repeat(60));

  try {
    // Connect to database
    await connectDB();

    // Create super admin first
    const superAdmin = await createSuperAdmin(null);

    // Create default tenant
    const defaultTenant = await createDefaultTenant(superAdmin._id);

    // Migrate all data
    const stats = {
      users: await migrateUsers(defaultTenant._id),
      chitGroups: await migrateChitGroups(defaultTenant._id),
      auctions: await migrateAuctions(defaultTenant._id),
      payments: await migratePayments(defaultTenant._id),
      memberStatements: await migrateMemberStatements(defaultTenant._id),
      memberRankings: await migrateMemberRankings(defaultTenant._id),
      notifications: await migrateNotifications(defaultTenant._id),
      auditLogs: await migrateAuditLogs(defaultTenant._id),
      settings: await migrateSettings(defaultTenant._id)
    };

    // Update tenant stats
    await updateTenantStats(defaultTenant._id);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Migration Complete!');
    console.log('='.repeat(60));
    console.log('\nMigration Summary:');
    console.log(`  Default Tenant: ${defaultTenant.name} (${defaultTenant._id})`);
    console.log(`  Users: ${stats.users}`);
    console.log(`  Chit Groups: ${stats.chitGroups}`);
    console.log(`  Auctions: ${stats.auctions}`);
    console.log(`  Payments: ${stats.payments}`);
    console.log(`  Member Statements: ${stats.memberStatements}`);
    console.log(`  Member Rankings: ${stats.memberRankings}`);
    console.log(`  Notifications: ${stats.notifications}`);
    console.log(`  Audit Logs: ${stats.auditLogs}`);
    console.log(`  Settings: ${stats.settings}`);

    console.log('\n--- Super Admin Credentials ---');
    console.log(`  Phone: ${config.superAdmin.phone}`);
    console.log(`  Password: ${config.superAdmin.password}`);
    console.log('  IMPORTANT: Change the password after first login!');

    console.log('\n--- Next Steps ---');
    console.log('1. Login as super admin to create new tenants');
    console.log('2. Update existing admin users to tenant admins if needed');
    console.log('3. Test the application with multi-tenant features');

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

// Run the migration
run();
