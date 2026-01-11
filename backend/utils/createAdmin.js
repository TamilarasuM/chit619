const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');

// Load env vars from root directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Load User model
const User = require('../models/User');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
});

// Create or update admin user
const createOrUpdateAdmin = async () => {
  try {
    const adminPhone = '9942891022';
    const adminData = {
      name: 'Admin User',
      phone: adminPhone,
      email: 'admin@chitfund.com',
      password: 'admin123',
      role: 'admin',
      language: 'en',
      status: 'active'
    };

    console.log('Checking for existing admin user...'.cyan);

    // Check if admin with this phone already exists
    const existingAdmin = await User.findOne({ phone: adminPhone });

    if (existingAdmin) {
      console.log(`Admin user already exists with phone: ${adminPhone}`.yellow);
      console.log(`Current admin details:`.white);
      console.log(`  Name: ${existingAdmin.name}`.white);
      console.log(`  Phone: ${existingAdmin.phone}`.white);
      console.log(`  Email: ${existingAdmin.email}`.white);
      console.log(`  Role: ${existingAdmin.role}`.white);
      console.log(`  Status: ${existingAdmin.status}`.white);

      // Update to ensure admin role
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save({ validateBeforeSave: false });
        console.log(`✅ Updated role to admin`.green);
      } else {
        console.log(`✅ User is already an admin`.green);
      }
    } else {
      // Check if any other admin exists
      const otherAdmin = await User.findOne({ role: 'admin' });

      if (otherAdmin) {
        console.log(`\nFound existing admin with different phone: ${otherAdmin.phone}`.yellow);
        console.log(`Options:`.white);
        console.log(`  1. Keep existing admin: ${otherAdmin.phone}`.white);
        console.log(`  2. Create new admin: ${adminPhone}`.white);
        console.log(`\nCreating new admin user...`.cyan);
      }

      // Create new admin
      const admin = await User.create(adminData);
      console.log(`\n✅ Admin user created successfully!`.green.bold);
      console.log(`\nAdmin Details:`.white.bold);
      console.log(`  Name: ${admin.name}`.white);
      console.log(`  Phone: ${admin.phone}`.white);
      console.log(`  Email: ${admin.email}`.white);
      console.log(`  Role: ${admin.role}`.white);
      console.log(`  Status: ${admin.status}`.white);
    }

    console.log(`\n${'='.repeat(50)}`.green);
    console.log(`Login Credentials:`.yellow.bold);
    console.log(`  Phone: 9942891022`.white);
    console.log(`  Password: admin123`.white);
    console.log(`${'='.repeat(50)}\n`.green);

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    console.error(error);
    process.exit(1);
  }
};

// Update existing user to admin
const makeUserAdmin = async () => {
  try {
    const phone = process.argv[3];

    if (!phone) {
      console.log('Usage: node createAdmin.js -u <phone_number>'.yellow);
      console.log('Example: node createAdmin.js -u 9942891022'.white);
      process.exit(1);
    }

    console.log(`Looking for user with phone: ${phone}`.cyan);

    const user = await User.findOne({ phone });

    if (!user) {
      console.log(`User not found with phone: ${phone}`.red);
      console.log(`\nCreating new admin user with this phone number...`.cyan);

      const admin = await User.create({
        name: 'Admin User',
        phone: phone,
        email: `admin${phone}@chitfund.com`,
        password: 'admin123',
        role: 'admin',
        language: 'en',
        status: 'active'
      });

      console.log(`✅ Admin user created!`.green.bold);
      console.log(`Phone: ${admin.phone}`.white);
      console.log(`Password: admin123`.white);
    } else {
      console.log(`Found user: ${user.name}`.white);

      if (user.role === 'admin') {
        console.log(`User is already an admin`.yellow);
      } else {
        user.role = 'admin';
        await user.save({ validateBeforeSave: false });
        console.log(`✅ User ${user.name} is now an admin!`.green.bold);
      }

      console.log(`\nLogin Credentials:`.yellow.bold);
      console.log(`  Phone: ${user.phone}`.white);
      console.log(`  Password: (unchanged)`.white);
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    console.error(error);
    process.exit(1);
  }
};

// Show all admins
const listAdmins = async () => {
  try {
    console.log('Fetching all admin users...'.cyan);

    const admins = await User.find({ role: 'admin' });

    if (admins.length === 0) {
      console.log('No admin users found'.yellow);
    } else {
      console.log(`\nFound ${admins.length} admin user(s):\n`.green.bold);

      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name}`.white.bold);
        console.log(`   Phone: ${admin.phone}`.white);
        console.log(`   Email: ${admin.email}`.white);
        console.log(`   Status: ${admin.status}`.white);
        console.log(`   Created: ${admin.createdAt.toLocaleDateString()}`.white);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Run based on command line argument
const args = process.argv[2];

if (args === '-u' || args === '--update') {
  makeUserAdmin();
} else if (args === '-l' || args === '--list') {
  listAdmins();
} else if (args === '-h' || args === '--help') {
  console.log('\nAdmin User Management Script'.cyan.bold);
  console.log('\nUsage:'.yellow);
  console.log('  node createAdmin.js                    Create/verify admin user (9942891022)'.white);
  console.log('  node createAdmin.js -u <phone>         Make existing user admin by phone'.white);
  console.log('  node createAdmin.js -l                 List all admin users'.white);
  console.log('  node createAdmin.js -h                 Show this help'.white);
  console.log('\nExamples:'.yellow);
  console.log('  node createAdmin.js'.white);
  console.log('  node createAdmin.js -u 9942891022'.white);
  console.log('  node createAdmin.js -l'.white);
  console.log('');
  process.exit(0);
} else {
  createOrUpdateAdmin();
}
