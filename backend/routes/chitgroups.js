const express = require('express');
const router = express.Router();
const ChitGroup = require('../models/ChitGroup');
const User = require('../models/User');
const { protect, authorize, isTenantAdmin, requireTenant, authorizeRoles } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenantResolver');
const AuditLog = require('../models/AuditLog');

// Helper to get tenant filter for queries
const getFilter = (req) => {
  if (req.user.platformRole === 'superadmin' && !req.tenantId) {
    return {};
  }
  const tenantId = req.tenantId || req.user.tenantId;
  return tenantId ? { tenantId } : {};
};

// @desc    Create new chit group
// @route   POST /api/chitgroups
// @access  Private/Admin
router.post('/', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    console.log('📥 CREATE CHIT GROUP REQUEST RECEIVED');
    console.log('User:', req.user?.name, 'Role:', req.user?.role || req.user?.tenantRole);
    console.log('Tenant:', req.tenantId);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const {
      name,
      chitAmount,
      totalMembers,
      duration,
      commissionAmount,
      winnerPaymentModel,
      gracePeriodDays,
      monthlyContribution,
      startDate,
      members,
      notes
    } = req.body;

    // Validation
    if (!name || !chitAmount || !totalMembers || !duration || !commissionAmount || !winnerPaymentModel || !monthlyContribution) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Validate payment model
    if (!['A', 'B'].includes(winnerPaymentModel)) {
      return res.status(400).json({
        success: false,
        error: 'Winner payment model must be either A or B'
      });
    }

    // Validate members if provided
    let membersList = [];
    if (members && members.length > 0) {
      if (members.length > totalMembers) {
        return res.status(400).json({
          success: false,
          error: `Cannot add more than ${totalMembers} members to this chit group`
        });
      }

      // Verify all members exist and are active (within same tenant)
      const tenantId = req.tenantId || req.user.tenantId;
      const membersData = await User.find({
        _id: { $in: members },
        tenantId: tenantId,
        tenantRole: 'member',
        status: 'active'
      });

      if (membersData.length !== members.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more members are invalid or inactive'
        });
      }

      membersList = membersData.map(member => ({
        memberId: member._id,
        memberName: member.name,
        joinedDate: new Date(),
        hasWon: false,
        wonInAuction: null
      }));
    }

    // Create chit group with tenant
    const tenantId = req.tenantId || req.user.tenantId;
    const chitGroup = await ChitGroup.create({
      tenantId,
      name,
      chitAmount,
      totalMembers,
      duration,
      commissionAmount,
      winnerPaymentModel,
      gracePeriodDays: gracePeriodDays || 3,
      monthlyContribution,
      status: membersList.length === totalMembers ? 'InProgress' : 'InProgress',
      startDate: startDate || new Date(),
      members: membersList,
      createdBy: req.user.id,
      notes
    });

    // Update users' chitGroups array
    if (membersList.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { $addToSet: { chitGroups: chitGroup._id } }
      );
    }

    // Log audit
    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userRole: req.user.tenantRole || req.user.role,
      userName: req.user.name,
      action: 'CREATE_CHIT_GROUP',
      entity: 'ChitGroup',
      entityId: chitGroup._id,
      changes: {
        after: {
          name: chitGroup.name,
          chitAmount: chitGroup.chitAmount,
          totalMembers: chitGroup.totalMembers,
          duration: chitGroup.duration,
          winnerPaymentModel: chitGroup.winnerPaymentModel
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true
    });

    res.status(201).json({
      success: true,
      data: chitGroup
    });
  } catch (error) {
    console.error('Create chit group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating chit group'
    });
  }
});

// @desc    Get all chit groups
// @route   GET /api/chitgroups
// @access  Private/Admin
router.get('/', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const tenantFilter = getFilter(req);

    const query = { ...tenantFilter };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Search by name if provided
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const chitGroups = await ChitGroup.find(query)
      .populate('createdBy', 'name phone')
      .populate('members.memberId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChitGroup.countDocuments(query);

    res.status(200).json({
      success: true,
      count: chitGroups.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: chitGroups
    });
  } catch (error) {
    console.error('Get chit groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching chit groups'
    });
  }
});

// @desc    Get single chit group
// @route   GET /api/chitgroups/:id
// @access  Private
router.get('/:id', protect, resolveTenant, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const chitGroup = await ChitGroup.findOne({ _id: req.params.id, ...tenantFilter })
      .populate('createdBy', 'name phone email')
      .populate('members.memberId', 'name phone email status')
      .populate('closedBy', 'name phone');

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // If member, verify they are part of this chit
    if (req.user.role === 'member') {
      const isMember = chitGroup.members.some(
        m => m.memberId._id.toString() === req.user.id
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this chit group'
        });
      }
    }

    // Get auctions for this chit
    const Auction = require('../models/Auction');
    const auctions = await Auction.find({ chitGroupId: chitGroup._id })
      .select('auctionNumber scheduledDate status winningBid winnerId winnerName')
      .populate('winnerId', 'name phone')
      .sort({ auctionNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        chitGroup,
        auctions,
        progress: {
          percentage: chitGroup.progressPercentage,
          completedAuctions: chitGroup.completedAuctions,
          remainingAuctions: chitGroup.duration - chitGroup.completedAuctions
        }
      }
    });
  } catch (error) {
    console.error('Get chit group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching chit group'
    });
  }
});

// @desc    Update chit group
// @route   PUT /api/chitgroups/:id
// @access  Private/Admin
router.put('/:id', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    let chitGroup = await ChitGroup.findOne({ _id: req.params.id, ...tenantFilter });

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // Don't allow editing certain fields once chit is active
    if (chitGroup.status === 'Active' || chitGroup.status === 'Closed') {
      const restrictedFields = ['chitAmount', 'totalMembers', 'duration', 'monthlyContribution', 'winnerPaymentModel'];
      const attemptedChanges = Object.keys(req.body);
      const hasRestrictedChanges = attemptedChanges.some(field => restrictedFields.includes(field));

      if (hasRestrictedChanges) {
        return res.status(400).json({
          success: false,
          error: 'Cannot modify core configuration of an active or closed chit group'
        });
      }
    }

    // Store old values for audit
    const oldValues = {
      name: chitGroup.name,
      gracePeriodDays: chitGroup.gracePeriodDays,
      notes: chitGroup.notes
    };

    // Update allowed fields
    const allowedUpdates = ['name', 'gracePeriodDays', 'notes', 'startDate'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    chitGroup = await ChitGroup.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'UPDATE_CHIT_GROUP',
      entity: 'ChitGroup',
      entityId: chitGroup._id,
      changes: {
        before: oldValues,
        after: updates
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true
    });

    res.status(200).json({
      success: true,
      data: chitGroup
    });
  } catch (error) {
    console.error('Update chit group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating chit group'
    });
  }
});

// @desc    Close chit group
// @route   POST /api/chitgroups/:id/close
// @access  Private/Admin
router.post('/:id/close', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const chitGroup = await ChitGroup.findOne({ _id: req.params.id, ...tenantFilter });

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    if (chitGroup.status === 'Closed') {
      return res.status(400).json({
        success: false,
        error: 'Chit group is already closed'
      });
    }

    // Check if all auctions are completed
    if (chitGroup.completedAuctions < chitGroup.duration) {
      return res.status(400).json({
        success: false,
        error: `Cannot close chit group. ${chitGroup.duration - chitGroup.completedAuctions} auctions remaining.`,
        remainingAuctions: chitGroup.duration - chitGroup.completedAuctions
      });
    }

    chitGroup.status = 'Closed';
    chitGroup.closedBy = req.user.id;
    chitGroup.endDate = new Date();
    if (req.body.notes) {
      chitGroup.notes = req.body.notes;
    }

    await chitGroup.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'CLOSE_CHIT_GROUP',
      entity: 'ChitGroup',
      entityId: chitGroup._id,
      changes: {
        before: { status: 'Active' },
        after: { status: 'Closed', endDate: new Date() }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Chit group closed successfully',
      data: chitGroup
    });
  } catch (error) {
    console.error('Close chit group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while closing chit group'
    });
  }
});

// @desc    Add member to chit group
// @route   POST /api/chitgroups/:id/add-member
// @access  Private/Admin
router.post('/:id/add-member', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const { memberId } = req.body;
    const tenantFilter = getFilter(req);

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide member ID'
      });
    }

    const chitGroup = await ChitGroup.findOne({ _id: req.params.id, ...tenantFilter });

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // Check if chit is closed
    if (chitGroup.status === 'Closed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot add members to a closed chit group'
      });
    }

    // Check if already full
    if (chitGroup.members.length >= chitGroup.totalMembers) {
      return res.status(400).json({
        success: false,
        error: 'Chit group is already full'
      });
    }

    // Check if member already exists
    const exists = chitGroup.members.some(
      m => m.memberId.toString() === memberId
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'Member is already part of this chit group'
      });
    }

    // Verify member exists and is active (within same tenant)
    const tenantId = req.tenantId || req.user.tenantId;
    const member = await User.findOne({
      _id: memberId,
      tenantId: tenantId,
      tenantRole: 'member',
      status: 'active'
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found or inactive'
      });
    }

    // Add member to chit group
    chitGroup.members.push({
      memberId: member._id,
      memberName: member.name,
      joinedDate: new Date(),
      hasWon: false,
      wonInAuction: null
    });

    await chitGroup.save();

    // Update user's chitGroups array
    await User.findByIdAndUpdate(
      memberId,
      { $addToSet: { chitGroups: chitGroup._id } }
    );

    // Log audit
    await AuditLog.create({
      tenantId,
      userId: req.user.id,
      userRole: req.user.tenantRole || req.user.role,
      userName: req.user.name,
      action: 'ADD_MEMBER_TO_CHIT',
      entity: 'ChitGroup',
      entityId: chitGroup._id,
      changes: {
        after: {
          memberId: member._id,
          memberName: member.name
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: chitGroup
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while adding member'
    });
  }
});

// @desc    Remove member from chit group
// @route   DELETE /api/chitgroups/:id/remove-member/:memberId
// @access  Private/Admin
router.delete('/:id/remove-member/:memberId', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const chitGroup = await ChitGroup.findOne({ _id: req.params.id, ...tenantFilter });

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // Don't allow removal if chit is active or closed
    if (chitGroup.status !== 'InProgress') {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove members from an active or closed chit group'
      });
    }

    // Check if member exists in chit
    const memberIndex = chitGroup.members.findIndex(
      m => m.memberId.toString() === req.params.memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in this chit group'
      });
    }

    const removedMember = chitGroup.members[memberIndex];

    // Remove member
    chitGroup.members.splice(memberIndex, 1);
    await chitGroup.save();

    // Update user's chitGroups array
    await User.findByIdAndUpdate(
      req.params.memberId,
      { $pull: { chitGroups: chitGroup._id } }
    );

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'REMOVE_MEMBER_FROM_CHIT',
      entity: 'ChitGroup',
      entityId: chitGroup._id,
      changes: {
        before: {
          memberId: removedMember.memberId,
          memberName: removedMember.memberName
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: chitGroup
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while removing member'
    });
  }
});

// @desc    Activate chit group (change from InProgress to Active)
// @route   POST /api/chitgroups/:id/activate
// @access  Private/Admin
router.post('/:id/activate', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const chitGroup = await ChitGroup.findOne({ _id: req.params.id, ...tenantFilter });

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    if (chitGroup.status !== 'InProgress') {
      return res.status(400).json({
        success: false,
        error: `Cannot activate chit group with status: ${chitGroup.status}`
      });
    }

    // Verify chit group has all members
    if (chitGroup.members.length < chitGroup.totalMembers) {
      return res.status(400).json({
        success: false,
        error: `Chit group needs ${chitGroup.totalMembers - chitGroup.members.length} more members before activation`
      });
    }

    chitGroup.status = 'Active';
    await chitGroup.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'ACTIVATE_CHIT_GROUP',
      entity: 'ChitGroup',
      entityId: chitGroup._id,
      changes: {
        before: { status: 'InProgress' },
        after: { status: 'Active' }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Chit group activated successfully',
      data: chitGroup
    });
  } catch (error) {
    console.error('Activate chit group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while activating chit group'
    });
  }
});

// @desc    Delete chit group
// @route   DELETE /api/chitgroups/:id
// @access  Private/Admin
router.delete('/:id', protect, resolveTenant, requireTenant, isTenantAdmin, async (req, res) => {
  try {
    const tenantFilter = getFilter(req);
    const chitGroup = await ChitGroup.findOne({ _id: req.params.id, ...tenantFilter });

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // Warn if deleting Active or Closed chit group (but allow it)
    if (chitGroup.status === 'Active' || chitGroup.status === 'Closed') {
      console.log(`⚠️ WARNING: Deleting ${chitGroup.status} chit group "${chitGroup.name}". This will delete all associated data.`);
    }

    // Store data for audit log before deletion
    const chitGroupData = {
      name: chitGroup.name,
      chitAmount: chitGroup.chitAmount,
      totalMembers: chitGroup.totalMembers,
      memberCount: chitGroup.members.length,
      status: chitGroup.status
    };

    const chitGroupId = chitGroup._id;

    // Cascade delete related data
    const Auction = require('../models/Auction');
    const Payment = require('../models/Payment');

    // Delete all auctions for this chit group
    const auctionsResult = await Auction.deleteMany({ chitGroupId: chitGroupId });
    console.log(`Deleted ${auctionsResult.deletedCount} auctions for chit group ${chitGroupId}`);

    // Delete all payments for this chit group
    const paymentsResult = await Payment.deleteMany({ chitGroupId: chitGroupId });
    console.log(`Deleted ${paymentsResult.deletedCount} payments for chit group ${chitGroupId}`);

    // Remove chit group from all members' chitGroups array
    const memberIds = chitGroup.members.map(m => m.memberId);
    if (memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { $pull: { chitGroups: chitGroupId } }
      );
    }

    // Delete the chit group
    await ChitGroup.findByIdAndDelete(req.params.id);

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'DELETE_CHIT_GROUP',
      entity: 'ChitGroup',
      entityId: chitGroupId,
      changes: {
        before: {
          ...chitGroupData,
          auctionsDeleted: auctionsResult.deletedCount,
          paymentsDeleted: paymentsResult.deletedCount
        },
        after: null
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true
    });

    res.status(200).json({
      success: true,
      message: 'Chit group and all associated data deleted successfully',
      deletedData: {
        auctions: auctionsResult.deletedCount,
        payments: paymentsResult.deletedCount,
        members: memberIds.length
      }
    });
  } catch (error) {
    console.error('Delete chit group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting chit group'
    });
  }
});

module.exports = router;
