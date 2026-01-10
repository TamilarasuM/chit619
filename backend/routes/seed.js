const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ChitGroup = require('../models/ChitGroup');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');

// @desc    Seed database with initial data (ONE-TIME USE)
// @route   GET /api/seed
// @access  Public (should be disabled after first use)
router.get('/', async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ phone: '9876543210' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Database already seeded. Admin user exists.'
      });
    }

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany();
    await ChitGroup.deleteMany();
    await Auction.deleteMany();
    await Payment.deleteMany();

    // Create Admin User
    console.log('Creating admin user...');
    const admin = await User.create({
      name: 'Admin User',
      phone: '9876543210',
      email: 'admin@chitfund.com',
      password: 'admin123',
      role: 'admin',
      language: 'en',
      status: 'active'
    });

    // Create sample members
    console.log('Creating sample members...');
    const members = [];
    for (let i = 1; i <= 20; i++) {
      const member = await User.create({
        name: `Member ${i}`,
        phone: `98765432${i.toString().padStart(2, '0')}`,
        email: `member${i}@example.com`,
        password: 'member123',
        role: 'member',
        language: 'en',
        status: 'active'
      });
      members.push(member);
    }

    // Create sample chit groups
    console.log('Creating sample chit groups...');
    const chitGroups = [];

    const chitGroup1 = await ChitGroup.create({
      name: 'Monthly Chit - 50K',
      totalAmount: 50000,
      monthlyContribution: 5000,
      duration: 10,
      startDate: new Date('2024-01-01'),
      status: 'active',
      members: members.slice(0, 10).map(m => m._id),
      commissionRate: 5
    });
    chitGroups.push(chitGroup1);

    const chitGroup2 = await ChitGroup.create({
      name: 'Quarterly Chit - 100K',
      totalAmount: 100000,
      monthlyContribution: 10000,
      duration: 10,
      startDate: new Date('2024-02-01'),
      status: 'active',
      members: members.slice(5, 15).map(m => m._id),
      commissionRate: 5
    });
    chitGroups.push(chitGroup2);

    const chitGroup3 = await ChitGroup.create({
      name: 'Annual Chit - 200K',
      totalAmount: 200000,
      monthlyContribution: 20000,
      duration: 10,
      startDate: new Date('2024-03-01'),
      status: 'pending',
      members: members.slice(10, 20).map(m => m._id),
      commissionRate: 5
    });
    chitGroups.push(chitGroup3);

    res.status(200).json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        admin: {
          name: admin.name,
          phone: admin.phone,
          email: admin.email
        },
        membersCreated: members.length,
        chitGroupsCreated: chitGroups.length,
        loginCredentials: {
          phone: '9876543210',
          password: 'admin123'
        }
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding database',
      error: error.message
    });
  }
});

module.exports = router;
