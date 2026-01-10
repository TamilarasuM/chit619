const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const ChitGroup = require('../models/ChitGroup');
const User = require('../models/User');
const MemberRanking = require('../models/MemberRanking');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all payments (with filters)
// @route   GET /api/payments
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      chitId,
      memberId,
      status,
      auctionNumber,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (chitId) query.chitGroupId = chitId;
    if (memberId) query.memberId = memberId;
    if (status) query.paymentStatus = status;
    if (auctionNumber) query.auctionNumber = parseInt(auctionNumber);

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .populate('memberId', 'name phone email')
      .populate('chitGroupId', 'name chitAmount')
      .populate('recordedBy', 'name')
      .sort({ dueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    // Calculate summary
    const summary = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$dueAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$outstandingBalance' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: payments,
      summary: summary[0] || { totalDue: 0, totalPaid: 0, totalOutstanding: 0 }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching payments'
    });
  }
});

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('memberId', 'name phone email')
      .populate('chitGroupId', 'name chitAmount monthlyContribution')
      .populate('recordedBy', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // If member, verify it's their payment
    if (req.user.role === 'member' && payment.memberId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own payments'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching payment'
    });
  }
});

// @desc    Record payment (general - find or create payment record)
// @route   POST /api/payments/record
// @access  Private/Admin
router.post('/record', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      paymentId,
      chitGroupId,
      memberId,
      auctionNumber,
      amountPaid,
      paymentDate,
      paymentMethod,
      transactionRef,
      notes
    } = req.body;

    let payment;

    // If paymentId is provided, use existing payment record
    if (paymentId) {
      payment = await Payment.findById(paymentId).populate('chitGroupId');
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment record not found'
        });
      }
    } else {
      // Find existing payment record or create new one
      const query = {
        chitGroupId,
        memberId
      };

      if (auctionNumber) {
        query.auctionNumber = auctionNumber;
      }

      payment = await Payment.findOne(query).populate('chitGroupId');

      // If no payment record exists, create one
      if (!payment) {
        const chitGroup = await ChitGroup.findById(chitGroupId);
        if (!chitGroup) {
          return res.status(404).json({
            success: false,
            error: 'Chit group not found'
          });
        }

        const member = await User.findById(memberId);
        if (!member) {
          return res.status(404).json({
            success: false,
            error: 'Member not found'
          });
        }

        payment = await Payment.create({
          chitGroupId,
          memberId,
          memberName: member.name,
          auctionNumber: auctionNumber || 1,
          dueDate: paymentDate,
          baseAmount: parseFloat(amountPaid),
          dividendReceived: 0,
          dueAmount: parseFloat(amountPaid),
          paidAmount: 0,
          outstandingBalance: parseFloat(amountPaid),
          paymentStatus: 'Pending',
          gracePeriodDays: chitGroup.gracePeriodDays || 0,
          recordedBy: req.user.id
        });

        await payment.populate('chitGroupId');
      }
    }

    // Record the payment
    const amount = parseFloat(amountPaid);
    const date = paymentDate ? new Date(paymentDate) : new Date();

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than zero'
      });
    }

    // Allow overpayment or payment on already-paid records
    // This handles cases like:
    // - Winners who have 0 outstanding balance but need payment recorded
    // - Adjustments or corrections to already-paid records
    if (payment.outstandingBalance === 0 && payment.paymentStatus === 'Paid') {
      // Payment is already fully paid - allow updating payment details without adding to paidAmount
      payment.paidDate = date;
      payment.paymentMethod = paymentMethod || payment.paymentMethod;
      payment.transactionRef = transactionRef || payment.transactionRef;
      payment.notes = notes || payment.notes;
      payment.recordedBy = req.user.id;

      await payment.save();

      return res.status(200).json({
        success: true,
        message: 'Payment record updated (already fully paid)',
        data: payment
      });
    }

    if (amount > payment.outstandingBalance && payment.outstandingBalance > 0) {
      return res.status(400).json({
        success: false,
        error: `Payment amount (${amount}) exceeds outstanding balance (${payment.outstandingBalance}). Maximum allowed: ${payment.outstandingBalance}`
      });
    }

    // Update payment
    payment.paidAmount += amount;
    payment.outstandingBalance = Math.max(0, payment.dueAmount - payment.paidAmount);

    // Update status
    if (payment.paidAmount >= payment.dueAmount) {
      payment.paymentStatus = 'Paid';
      payment.paidDate = date;
      payment.paymentMethod = paymentMethod;
      payment.referenceNumber = transactionRef;

      // Check if on time
      const dueDate = new Date(payment.dueDate);
      payment.isOnTime = date <= dueDate;
    } else {
      payment.paymentStatus = 'Partial';
    }

    // Add to partial payments if not full payment
    if (amount < payment.dueAmount || payment.partialPayments.length > 0) {
      payment.partialPayments.push({
        amount,
        date,
        recordedBy: req.user.id,
        paymentMethod,
        referenceNumber: transactionRef,
        notes
      });
    }

    payment.recordedBy = req.user.id;
    if (notes) payment.notes = notes;

    await payment.save();

    // Update member ranking
    await updateMemberRanking(payment.memberId, payment.chitGroupId._id);

    // Send notification
    const member = await User.findById(payment.memberId);
    if (member) {
      await Notification.create({
        recipientId: member._id,
        recipientPhone: member.phone,
        recipientName: member.name,
        type: 'payment_received',
        priority: 'medium',
        language: member.language || 'en',
        templateId: 'payment_received',
        templateData: {
          name: member.name,
          chitGroup: payment.chitGroupId.name,
          amount: amount,
          receivedOn: date.toLocaleDateString('en-IN'),
          status: payment.paymentStatus,
          balance: payment.outstandingBalance
        },
        messageText: `Payment of ₹${amount} received for ${payment.chitGroupId.name}. Outstanding balance: ₹${payment.outstandingBalance}. Status: ${payment.paymentStatus}`,
        scheduledAt: new Date(),
        status: 'pending',
        chitGroupId: payment.chitGroupId._id,
        paymentId: payment._id
      });
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'RECORD_PAYMENT',
      entity: 'Payment',
      entityId: payment._id,
      changes: {
        after: {
          amount,
          paymentMethod,
          paymentStatus: payment.paymentStatus,
          outstandingBalance: payment.outstandingBalance
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: payment.chitGroupId._id
    });

    res.status(200).json({
      success: true,
      message: payment.paymentStatus === 'Paid' ? 'Payment recorded successfully - Fully paid' : 'Partial payment recorded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while recording payment'
    });
  }
});

// @desc    Record payment (by payment ID)
// @route   POST /api/payments/:id/record
// @access  Private/Admin
router.post('/:id/record', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      amount,
      paymentMethod,
      referenceNumber,
      date,
      notes
    } = req.body;

    if (!amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Please provide amount and payment method'
      });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('chitGroupId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const paidAmount = parseFloat(amount);

    if (paidAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than zero'
      });
    }

    if (paidAmount > payment.outstandingBalance) {
      return res.status(400).json({
        success: false,
        error: `Payment amount cannot exceed outstanding balance of ₹${payment.outstandingBalance}`
      });
    }

    // Calculate if payment is on time
    const paymentDate = date ? new Date(date) : new Date();
    const dueDate = new Date(payment.dueDate);
    const gracePeriodEnd = new Date(dueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + payment.gracePeriodDays);

    const isOnTime = paymentDate <= dueDate;
    const isWithinGrace = paymentDate <= gracePeriodEnd;

    // Calculate delay days (only count after grace period)
    let delayDays = 0;
    if (paymentDate > gracePeriodEnd) {
      delayDays = Math.floor((paymentDate - gracePeriodEnd) / (1000 * 60 * 60 * 24));
    }

    // Check if full payment or partial
    const isFullPayment = (payment.paidAmount + paidAmount) >= payment.dueAmount;

    // Update payment record
    payment.paidAmount += paidAmount;
    payment.outstandingBalance = payment.dueAmount - payment.paidAmount;
    payment.paymentStatus = payment.outstandingBalance === 0 ? 'Paid' : (payment.paidAmount > 0 ? 'Partial' : 'Pending');

    if (!payment.paidDate && isFullPayment) {
      payment.paidDate = paymentDate;
    }

    payment.isOnTime = isOnTime;
    payment.gracePeriodUsed = !isOnTime && isWithinGrace;
    payment.delayDays = delayDays;

    if (!payment.partialPayments) {
      payment.partialPayments = [];
    }

    payment.partialPayments.push({
      amount: paidAmount,
      date: paymentDate,
      recordedBy: req.user.id,
      paymentMethod,
      referenceNumber,
      notes
    });

    if (isFullPayment) {
      payment.paymentMethod = paymentMethod;
      payment.referenceNumber = referenceNumber;
      if (notes) payment.notes = notes;
    }

    await payment.save();

    // Update member ranking
    await updateMemberRanking(payment.memberId, payment.chitGroupId);

    // Send payment confirmation notification
    const member = await User.findById(payment.memberId);
    if (member) {
      await Notification.create({
        recipientId: member._id,
        recipientPhone: member.phone,
        recipientName: member.name,
        type: 'payment_received',
        priority: 'medium',
        language: member.language || 'en',
        templateId: 'payment_received',
        templateData: {
          name: member.name,
          chitGroup: payment.chitGroupId.name,
          amount: paidAmount,
          receivedOn: paymentDate.toLocaleDateString('en-IN'),
          status: isOnTime ? 'On-time' : (isWithinGrace ? 'Within Grace Period' : 'Delayed'),
          balance: payment.outstandingBalance
        },
        messageText: `Payment of ₹${paidAmount} received for ${payment.chitGroupId.name} on ${paymentDate.toLocaleDateString('en-IN')}. Outstanding balance: ₹${payment.outstandingBalance}`,
        scheduledAt: new Date(),
        status: 'pending',
        chitGroupId: payment.chitGroupId._id,
        paymentId: payment._id
      });
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'RECORD_PAYMENT',
      entity: 'Payment',
      entityId: payment._id,
      changes: {
        after: {
          amount: paidAmount,
          paymentMethod,
          paymentStatus: payment.paymentStatus,
          outstandingBalance: payment.outstandingBalance
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: payment.chitGroupId._id
    });

    res.status(200).json({
      success: true,
      message: isFullPayment ? 'Payment recorded successfully - Fully paid' : 'Partial payment recorded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while recording payment'
    });
  }
});

// @desc    Get pending payments
// @route   GET /api/payments/status/pending
// @access  Private/Admin
router.get('/status/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitId } = req.query;

    const query = {
      paymentStatus: { $in: ['Pending', 'Partial'] }
    };

    if (chitId) {
      query.chitGroupId = chitId;
    }

    const pendingPayments = await Payment.find(query)
      .populate('memberId', 'name phone email')
      .populate('chitGroupId', 'name')
      .sort({ dueDate: 1 });

    const totalOutstanding = pendingPayments.reduce((sum, p) => sum + p.outstandingBalance, 0);

    res.status(200).json({
      success: true,
      count: pendingPayments.length,
      totalOutstanding,
      data: pendingPayments
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching pending payments'
    });
  }
});

// @desc    Get overdue payments
// @route   GET /api/payments/status/overdue
// @access  Private/Admin
router.get('/status/overdue', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitId, days } = req.query;

    const query = {
      paymentStatus: { $in: ['Pending', 'Partial', 'Overdue'] }
    };

    if (chitId) {
      query.chitGroupId = chitId;
    }

    const allPayments = await Payment.find(query)
      .populate('memberId', 'name phone email')
      .populate('chitGroupId', 'name gracePeriodDays');

    // Filter overdue payments
    const overduePayments = allPayments.filter(payment => {
      const dueDate = new Date(payment.dueDate);
      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (payment.chitGroupId.gracePeriodDays || 0));
      const now = new Date();

      const isOverdue = now > gracePeriodEnd && payment.outstandingBalance > 0;

      if (days) {
        const daysPastDue = Math.floor((now - gracePeriodEnd) / (1000 * 60 * 60 * 24));
        return isOverdue && daysPastDue >= parseInt(days);
      }

      return isOverdue;
    });

    // Mark as overdue
    for (const payment of overduePayments) {
      if (payment.paymentStatus !== 'Overdue') {
        payment.paymentStatus = 'Overdue';
        await payment.save();
      }
    }

    const totalOverdue = overduePayments.reduce((sum, p) => sum + p.outstandingBalance, 0);

    res.status(200).json({
      success: true,
      count: overduePayments.length,
      totalOverdue,
      data: overduePayments
    });
  } catch (error) {
    console.error('Get overdue payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching overdue payments'
    });
  }
});

// @desc    Get member payments
// @route   GET /api/payments/member/:memberId
// @access  Private
router.get('/member/:memberId', protect, async (req, res) => {
  try {
    // If member, verify they can only see their own payments
    if (req.user.role === 'member' && req.params.memberId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own payments'
      });
    }

    const { chitId, status } = req.query;

    const query = { memberId: req.params.memberId };

    if (chitId) query.chitGroupId = chitId;
    if (status) query.paymentStatus = status;

    const payments = await Payment.find(query)
      .populate('chitGroupId', 'name chitAmount monthlyContribution')
      .sort({ auctionNumber: -1 });

    // Calculate summary
    const summary = {
      totalDue: payments.reduce((sum, p) => sum + p.dueAmount, 0),
      totalPaid: payments.reduce((sum, p) => sum + p.paidAmount, 0),
      totalOutstanding: payments.reduce((sum, p) => sum + p.outstandingBalance, 0),
      totalDividends: payments.reduce((sum, p) => sum + p.dividendReceived, 0),
      onTimePayments: payments.filter(p => p.isOnTime).length,
      delayedPayments: payments.filter(p => p.delayDays > 0).length
    };

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
      summary
    });
  } catch (error) {
    console.error('Get member payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching member payments'
    });
  }
});

// @desc    Get payments for a chit group
// @route   GET /api/payments/chitgroup/:chitGroupId
// @access  Private
router.get('/chitgroup/:chitGroupId', protect, async (req, res) => {
  try {
    const chitGroup = await ChitGroup.findById(req.params.chitGroupId);

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // If member, verify they're part of this chit
    if (req.user.role === 'member') {
      const isMember = chitGroup.members.some(
        m => m.memberId.toString() === req.user.id
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this chit group'
        });
      }

      // Members only see their own payments
      const myPayments = await Payment.find({
        chitGroupId: req.params.chitGroupId,
        memberId: req.user.id
      }).sort({ auctionNumber: -1 });

      return res.status(200).json({
        success: true,
        count: myPayments.length,
        data: myPayments
      });
    }

    // Admin sees all payments
    const { auctionNumber, status } = req.query;
    const query = { chitGroupId: req.params.chitGroupId };

    if (auctionNumber) query.auctionNumber = parseInt(auctionNumber);
    if (status) query.paymentStatus = status;

    const payments = await Payment.find(query)
      .populate('memberId', 'name phone')
      .sort({ auctionNumber: -1, memberName: 1 });

    // Group by auction number
    const groupedByAuction = payments.reduce((acc, payment) => {
      const auctionNum = payment.auctionNumber;
      if (!acc[auctionNum]) {
        acc[auctionNum] = [];
      }
      acc[auctionNum].push(payment);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
      groupedByAuction
    });
  } catch (error) {
    console.error('Get chit payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching chit payments'
    });
  }
});

// @desc    Extend grace period for a payment
// @route   POST /api/payments/:id/extend-grace
// @access  Private/Admin
router.post('/:id/extend-grace', protect, authorize('admin'), async (req, res) => {
  try {
    const { additionalDays, reason } = req.body;

    if (!additionalDays || additionalDays <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid additional days'
      });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('memberId', 'name phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot extend grace period for already paid payment'
      });
    }

    const oldGracePeriod = payment.gracePeriodDays;
    payment.gracePeriodDays += parseInt(additionalDays);
    payment.notes = (payment.notes || '') + `\nGrace period extended by ${additionalDays} days. Reason: ${reason || 'N/A'}`;

    await payment.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'EXTEND_GRACE_PERIOD',
      entity: 'Payment',
      entityId: payment._id,
      changes: {
        before: { gracePeriodDays: oldGracePeriod },
        after: { gracePeriodDays: payment.gracePeriodDays, reason }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: payment.chitGroupId
    });

    res.status(200).json({
      success: true,
      message: `Grace period extended by ${additionalDays} days`,
      data: payment
    });
  } catch (error) {
    console.error('Extend grace period error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while extending grace period'
    });
  }
});

// Helper function to update member ranking
async function updateMemberRanking(memberId, chitGroupId) {
  try {
    // Get all payments for this member in this chit
    const payments = await Payment.find({
      memberId,
      chitGroupId,
      isWinner: { $ne: true } // Exclude winner receipt payments
    });

    const onTimePayments = payments.filter(p => p.isOnTime && p.paymentStatus === 'Paid').length;
    const delayedPayments = payments.filter(p => p.delayDays > 0).length;
    const totalPaymentsDue = payments.length;
    const totalDelayDays = payments.reduce((sum, p) => sum + (p.delayDays || 0), 0);
    const averageDelayDays = delayedPayments > 0 ? totalDelayDays / delayedPayments : 0;
    const gracePeriodUsed = payments.filter(p => p.gracePeriodUsed).length;
    const totalAmountPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalDividendsReceived = payments.reduce((sum, p) => sum + p.dividendReceived, 0);
    const outstandingAmount = payments.reduce((sum, p) => sum + p.outstandingBalance, 0);

    // Calculate rank score
    let rankScore = 1000; // Base score

    // Add points
    rankScore += onTimePayments * 50; // +50 for each on-time payment
    if (delayedPayments === 0 && onTimePayments > 0) rankScore += 100; // Bonus for zero delays
    rankScore += (totalPaymentsDue - gracePeriodUsed) * 20; // +20 for not using grace period

    // Deduct points
    rankScore -= delayedPayments * 30; // -30 for each delayed payment
    rankScore -= totalDelayDays * 5; // -5 for each delay day
    if (outstandingAmount > 0) rankScore -= 100; // -100 for outstanding balance
    rankScore -= gracePeriodUsed * 10; // -10 for each time grace period used

    // Determine rank category
    let rankCategory = 'Poor';
    if (rankScore >= 1000) rankCategory = 'Excellent';
    else if (rankScore >= 800) rankCategory = 'Good';
    else if (rankScore >= 600) rankCategory = 'Average';

    // Check if member has won
    const chitGroup = await ChitGroup.findById(chitGroupId);
    const memberData = chitGroup.members.find(m => m.memberId.toString() === memberId.toString());
    const hasWon = memberData ? memberData.hasWon : false;
    const wonInAuction = memberData ? memberData.wonInAuction : null;

    // Update or create ranking
    await MemberRanking.findOneAndUpdate(
      { memberId, chitGroupId },
      {
        memberName: (await User.findById(memberId)).name,
        onTimePayments,
        delayedPayments,
        totalPaymentsDue,
        totalDelayDays,
        averageDelayDays,
        gracePeriodUsed,
        totalAmountPaid,
        totalDividendsReceived,
        outstandingAmount,
        rankScore,
        rankCategory,
        hasWon,
        wonInAuction,
        lastUpdated: new Date(),
        calculatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Update ranks (position) for all members in this chit
    const allRankings = await MemberRanking.find({ chitGroupId }).sort({ rankScore: -1 });

    for (let i = 0; i < allRankings.length; i++) {
      allRankings[i].rank = i + 1;
      await allRankings[i].save();
    }
  } catch (error) {
    console.error('Update member ranking error:', error);
  }
}

// @desc    Get payments for a specific auction
// @route   GET /api/payments/auction/:auctionId
// @access  Private
router.get('/auction/:auctionId', protect, async (req, res) => {
  try {
    const Auction = require('../models/Auction');

    const auction = await Auction.findById(req.params.auctionId)
      .populate('chitGroupId', 'name chitAmount monthlyContribution');

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    // Get all payments for this auction
    const payments = await Payment.find({
      chitGroupId: auction.chitGroupId._id,
      auctionNumber: auction.auctionNumber
    })
      .populate('memberId', 'name phone email')
      .sort({ memberName: 1 });

    // Calculate statistics
    const stats = {
      totalMembers: payments.length,
      paidCount: payments.filter(p => p.paymentStatus === 'Paid').length,
      partialCount: payments.filter(p => p.paymentStatus === 'Partial').length,
      pendingCount: payments.filter(p => p.paymentStatus === 'Pending').length,
      overdueCount: payments.filter(p => p.paymentStatus === 'Overdue').length,
      totalDue: payments.reduce((sum, p) => sum + p.dueAmount, 0),
      totalPaid: payments.reduce((sum, p) => sum + p.paidAmount, 0),
      totalOutstanding: payments.reduce((sum, p) => sum + p.outstandingBalance, 0),
      totalDividends: payments.reduce((sum, p) => sum + p.dividendReceived, 0),
      collectionRate: 0
    };

    if (stats.totalDue > 0) {
      stats.collectionRate = Math.round((stats.totalPaid / stats.totalDue) * 100);
    }

    res.status(200).json({
      success: true,
      data: {
        auction: {
          _id: auction._id,
          auctionNumber: auction.auctionNumber,
          scheduledDate: auction.scheduledDate,
          status: auction.status,
          chitGroupName: auction.chitGroupId.name,
          chitAmount: auction.chitGroupId.chitAmount,
          monthlyContribution: auction.chitGroupId.monthlyContribution,
          winningBid: auction.winningBid,
          dividendPerMember: auction.dividendPerMember
        },
        payments,
        stats
      }
    });
  } catch (error) {
    console.error('Get auction payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching auction payments'
    });
  }
});

module.exports = router;
