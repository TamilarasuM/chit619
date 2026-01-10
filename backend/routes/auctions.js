const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const ChitGroup = require('../models/ChitGroup');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// @desc    Schedule new auction (simplified endpoint)
// @route   POST /api/auctions
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      chitGroupId,
      auctionDate,
      venue,
      excludedMembers,
      notes
    } = req.body;

    console.log('📅 SCHEDULE AUCTION REQUEST');
    console.log('Chit Group ID:', chitGroupId);
    console.log('Auction Date:', auctionDate);
    console.log('Excluded Members:', excludedMembers);

    // Validation
    if (!chitGroupId || !auctionDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide chitGroupId and auctionDate'
      });
    }

    // Verify chit group exists and is active
    const chitGroup = await ChitGroup.findById(chitGroupId)
      .populate('members.memberId', 'name phone email');

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    if (chitGroup.status !== 'Active') {
      return res.status(400).json({
        success: false,
        error: 'Chit group must be active to schedule auctions'
      });
    }

    // Calculate next auction number
    const existingAuctionsCount = await Auction.countDocuments({ chitGroupId });
    const auctionNumber = existingAuctionsCount + 1;

    if (auctionNumber > chitGroup.duration) {
      return res.status(400).json({
        success: false,
        error: `All ${chitGroup.duration} auctions have been scheduled`
      });
    }

    // Get members who have already won
    const previousWinners = chitGroup.winners || [];

    // Combine auto-excluded (winners) and manually excluded members
    const allExcludedMembers = [
      ...previousWinners.map(id => id.toString()),
      ...(excludedMembers || [])
    ];

    // Calculate eligible members count
    const eligibleMembers = chitGroup.members.filter(
      m => !allExcludedMembers.includes(m.memberId._id.toString())
    );

    console.log('Total members:', chitGroup.members.length);
    console.log('Previous winners:', previousWinners.length);
    console.log('Manually excluded:', excludedMembers?.length || 0);
    console.log('Eligible members:', eligibleMembers.length);

    if (eligibleMembers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No eligible members available for this auction'
      });
    }

    // Extract date and time from auctionDate
    const auctionDateTime = new Date(auctionDate);
    const hours = String(auctionDateTime.getHours()).padStart(2, '0');
    const minutes = String(auctionDateTime.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    console.log('Auction DateTime:', auctionDateTime);
    console.log('Extracted Time:', timeString);
    console.log('Hours:', hours, 'Minutes:', minutes);

    // Create auction
    const auction = await Auction.create({
      chitGroupId,
      chitGroupName: chitGroup.name,
      auctionNumber,
      scheduledDate: auctionDateTime,
      scheduledTime: timeString,
      status: 'Scheduled',
      startingBid: chitGroup.commissionAmount,
      currentHighestBid: 0,
      chitAmount: chitGroup.chitAmount,
      autoExcludedMembers: previousWinners,
      manualExcludedMembers: excludedMembers || [],
      eligibleMembers: eligibleMembers.length,
      venue: venue || '',
      createdBy: req.user.id,
      notes: notes || ''
    });

    console.log('✅ Auction created:', auction.auctionNumber);

    // Send notifications to eligible members
    const notifications = eligibleMembers.map(member => ({
      recipientId: member.memberId._id,
      recipientPhone: member.memberId.phone,
      recipientName: member.memberId.name,
      type: 'auction_scheduled',
      messageText: `Auction #${auctionNumber} for ${chitGroup.name} has been scheduled for ${new Date(auctionDate).toLocaleDateString()} at ${timeString}`,
      priority: 'high',
      language: member.memberId.language || 'en'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Create audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        auctionNumber,
        chitGroupId,
        scheduledDate: auctionDate,
        eligibleMembers: eligibleMembers.length
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: auction
    });
  } catch (error) {
    console.error('Schedule auction error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while scheduling auction'
    });
  }
});

// @desc    Schedule new auction (legacy endpoint)
// @route   POST /api/auctions/schedule
// @access  Private/Admin
router.post('/schedule', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      chitGroupId,
      auctionNumber,
      scheduledDate,
      scheduledTime,
      notes
    } = req.body;

    // Validation
    if (!chitGroupId || !auctionNumber || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Verify chit group exists and is active
    const chitGroup = await ChitGroup.findById(chitGroupId);

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    if (chitGroup.status !== 'Active') {
      return res.status(400).json({
        success: false,
        error: 'Chit group must be active to schedule auctions'
      });
    }

    // Validate auction number
    if (auctionNumber < 1 || auctionNumber > chitGroup.duration) {
      return res.status(400).json({
        success: false,
        error: `Auction number must be between 1 and ${chitGroup.duration}`
      });
    }

    // Check if auction already exists for this number
    const existingAuction = await Auction.findOne({
      chitGroupId,
      auctionNumber
    });

    if (existingAuction) {
      return res.status(400).json({
        success: false,
        error: `Auction #${auctionNumber} already exists for this chit group`
      });
    }

    // Get previous winners for auto-exclusion
    const previousWinners = chitGroup.winners || [];

    // Create auction
    const auction = await Auction.create({
      chitGroupId,
      chitGroupName: chitGroup.name,
      auctionNumber,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: 'Scheduled',
      startingBid: chitGroup.commissionAmount,
      currentHighestBid: 0,
      autoExcludedMembers: previousWinners,
      manualExcludedMembers: [],
      createdBy: req.user.id,
      notes
    });

    // Calculate eligible members
    const eligibleCount = chitGroup.members.length - previousWinners.length;
    auction.eligibleMembers = eligibleCount;
    await auction.save();

    // Send notifications to all eligible members
    const eligibleMembers = chitGroup.members.filter(
      m => !previousWinners.includes(m.memberId.toString())
    );

    // Create notification queue
    for (const member of eligibleMembers) {
      const memberData = await User.findById(member.memberId);
      if (memberData) {
        await Notification.create({
          recipientId: memberData._id,
          recipientPhone: memberData.phone,
          recipientName: memberData.name,
          type: 'auction_scheduled',
          priority: 'medium',
          language: memberData.language || 'en',
          templateId: 'auction_scheduled',
          templateData: {
            name: memberData.name,
            chitGroup: chitGroup.name,
            auctionNumber,
            date: scheduledDate,
            time: scheduledTime,
            startingBid: chitGroup.commissionAmount
          },
          messageText: `Auction #${auctionNumber} for ${chitGroup.name} has been scheduled for ${new Date(scheduledDate).toLocaleDateString('en-IN')} at ${scheduledTime}.`,
          scheduledAt: new Date(),
          status: 'pending',
          chitGroupId: chitGroup._id,
          auctionId: auction._id
        });
      }
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'SCHEDULE_AUCTION',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        after: {
          chitGroupId,
          auctionNumber,
          scheduledDate,
          scheduledTime
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: chitGroup._id,
      auctionId: auction._id
    });

    res.status(201).json({
      success: true,
      data: auction,
      message: `Auction #${auctionNumber} scheduled successfully. ${eligibleMembers.length} members notified.`
    });
  } catch (error) {
    console.error('Schedule auction error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while scheduling auction'
    });
  }
});

// @desc    Start auction
// @route   POST /api/auctions/:id/start
// @access  Private/Admin
router.post('/:id/start', protect, authorize('admin'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('chitGroupId');

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    if (auction.status !== 'Scheduled') {
      return res.status(400).json({
        success: false,
        error: `Cannot start auction with status: ${auction.status}`
      });
    }

    auction.status = 'Live';
    auction.startedAt = new Date();
    auction.startedBy = req.user.id;
    await auction.save();

    // Send "auction started" notifications to eligible members
    const chitGroup = auction.chitGroupId;
    const allExcluded = [
      ...auction.autoExcludedMembers.map(id => id.toString()),
      ...auction.manualExcludedMembers.map(e => e.memberId.toString())
    ];

    const eligibleMembers = chitGroup.members.filter(
      m => !allExcluded.includes(m.memberId.toString())
    );

    for (const member of eligibleMembers) {
      const memberData = await User.findById(member.memberId);
      if (memberData) {
        await Notification.create({
          recipientId: memberData._id,
          recipientPhone: memberData.phone,
          recipientName: memberData.name,
          type: 'auction_started',
          priority: 'high',
          language: memberData.language || 'en',
          templateId: 'auction_started',
          templateData: {
            name: memberData.name,
            chitGroup: chitGroup.name,
            auctionNumber: auction.auctionNumber,
            startingBid: auction.startingBid,
            url: `${process.env.CLIENT_URL}/auctions/${auction._id}`
          },
          messageText: `Auction #${auction.auctionNumber} for ${chitGroup.name} has started! Starting bid: ₹${auction.startingBid}. Place your bid now.`,
          scheduledAt: new Date(),
          status: 'pending',
          chitGroupId: chitGroup._id,
          auctionId: auction._id
        });
      }
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'START_AUCTION',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        before: { status: 'Scheduled' },
        after: { status: 'Live', startedAt: new Date() }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: chitGroup._id,
      auctionId: auction._id
    });

    res.status(200).json({
      success: true,
      data: auction,
      eligibleMembers: eligibleMembers.length,
      message: 'Auction started successfully'
    });
  } catch (error) {
    console.error('Start auction error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while starting auction'
    });
  }
});

// @desc    Place bid in auction (member bids for self, admin can bid on behalf of any member)
// @route   POST /api/auctions/:id/bid
// @access  Private
router.post('/:id/bid', protect, async (req, res) => {
  try {
    const { bidAmount, memberId } = req.body;

    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid bid amount'
      });
    }

    const auction = await Auction.findById(req.params.id)
      .populate('chitGroupId');

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    if (auction.status !== 'Live') {
      return res.status(400).json({
        success: false,
        error: 'Auction is not currently live'
      });
    }

    const chitGroup = auction.chitGroupId;

    // Determine who is bidding
    // If admin provides memberId, bid on behalf of that member
    // Otherwise, bid for the current user
    let biddingMemberId = req.user.id;
    let biddingMemberName = req.user.name;
    let biddingMemberPhone = req.user.phone;
    let biddingMemberLanguage = req.user.language || 'en';
    let isAdminBiddingForMember = false;

    if (memberId && req.user.role === 'admin') {
      // Admin is bidding on behalf of a member
      isAdminBiddingForMember = true;
      biddingMemberId = memberId;

      // Get member details
      const member = await User.findById(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          error: 'Member not found'
        });
      }

      biddingMemberName = member.name;
      biddingMemberPhone = member.phone;
      biddingMemberLanguage = member.language || 'en';

      console.log(`Admin ${req.user.name} is placing bid on behalf of ${biddingMemberName}`);
    } else if (memberId && req.user.role !== 'admin') {
      // Non-admin trying to bid for someone else
      return res.status(403).json({
        success: false,
        error: 'Only admins can place bids on behalf of other members'
      });
    }

    // Verify member is part of chit group
    const isMember = chitGroup.members.some(
      m => m.memberId.toString() === biddingMemberId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: isAdminBiddingForMember
          ? `${biddingMemberName} is not a member of this chit group`
          : 'You are not a member of this chit group'
      });
    }

    // Check if member is excluded
    const isAutoExcluded = auction.autoExcludedMembers.some(
      id => id.toString() === biddingMemberId
    );

    const isManuallyExcluded = auction.manualExcludedMembers.some(
      e => e.memberId.toString() === biddingMemberId
    );

    if (isAutoExcluded) {
      return res.status(403).json({
        success: false,
        error: isAdminBiddingForMember
          ? `${biddingMemberName} has already won in a previous auction and cannot bid again`
          : 'You have already won in a previous auction and cannot bid again'
      });
    }

    if (isManuallyExcluded) {
      const exclusion = auction.manualExcludedMembers.find(
        e => e.memberId.toString() === biddingMemberId
      );
      return res.status(403).json({
        success: false,
        error: isAdminBiddingForMember
          ? `${biddingMemberName} has been excluded from this auction. Reason: ${exclusion.reason}`
          : `You have been excluded from this auction. Reason: ${exclusion.reason}`
      });
    }

    // Check if member already placed a bid
    const existingBid = auction.bids.find(
      b => b.memberId.toString() === biddingMemberId
    );

    if (existingBid) {
      return res.status(400).json({
        success: false,
        error: isAdminBiddingForMember
          ? `${biddingMemberName} has already placed a bid in this auction. Only one bid per member is allowed.`
          : 'You have already placed a bid in this auction. Only one bid per member is allowed.'
      });
    }

    // Validate bid amount (must be >= starting bid)
    if (bidAmount < auction.startingBid) {
      return res.status(400).json({
        success: false,
        error: `Bid amount must be at least ₹${auction.startingBid} (commission amount)`
      });
    }

    // Add bid
    auction.bids.push({
      memberId: biddingMemberId,
      memberName: biddingMemberName,
      bidAmount,
      bidTime: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      placedByAdmin: isAdminBiddingForMember,
      placedByUserId: isAdminBiddingForMember ? req.user.id : undefined,
      placedByUserName: isAdminBiddingForMember ? req.user.name : undefined
    });

    // Update current highest bid if this is higher
    if (bidAmount > auction.currentHighestBid) {
      auction.currentHighestBid = bidAmount;
    }

    auction.totalBids = auction.bids.length;

    // Calculate participation rate only if there are eligible members
    if (auction.eligibleMembers > 0) {
      auction.participationRate = Math.round((auction.bids.length / auction.eligibleMembers) * 100);
    } else {
      auction.participationRate = 0;
    }

    await auction.save();

    // Send bid confirmation to the member who is bidding
    const bidConfirmationMessage = isAdminBiddingForMember
      ? `Your bid of ₹${bidAmount} for ${chitGroup.name} Auction #${auction.auctionNumber} has been placed by admin ${req.user.name}`
      : `Your bid of ₹${bidAmount} for ${chitGroup.name} Auction #${auction.auctionNumber} has been submitted successfully`;

    await Notification.create({
      recipientId: biddingMemberId,
      recipientPhone: biddingMemberPhone,
      recipientName: biddingMemberName,
      type: 'bid_confirmation',
      messageText: bidConfirmationMessage,
      priority: 'high',
      language: biddingMemberLanguage,
      templateId: 'bid_confirmation',
      templateData: {
        name: biddingMemberName,
        chitGroup: chitGroup.name,
        auctionNumber: auction.auctionNumber,
        bidAmount,
        placedByAdmin: isAdminBiddingForMember,
        adminName: isAdminBiddingForMember ? req.user.name : undefined
      },
      scheduledAt: new Date(),
      status: 'pending',
      chitGroupId: chitGroup._id,
      auctionId: auction._id
    });

    // Send admin notification (if not admin who placed the bid)
    const admin = await User.findById(chitGroup.createdBy);
    if (admin && admin._id.toString() !== req.user.id) {
      const adminNotificationMessage = isAdminBiddingForMember
        ? `Admin ${req.user.name} placed a bid of ₹${bidAmount} on behalf of ${biddingMemberName} for ${chitGroup.name} Auction #${auction.auctionNumber}`
        : `${biddingMemberName} placed a bid of ₹${bidAmount} for ${chitGroup.name} Auction #${auction.auctionNumber}`;

      await Notification.create({
        recipientId: admin._id,
        recipientPhone: admin.phone,
        recipientName: admin.name,
        type: 'new_bid_admin',
        messageText: adminNotificationMessage,
        priority: 'medium',
        language: admin.language || 'en',
        templateId: 'new_bid_admin',
        templateData: {
          chitGroup: chitGroup.name,
          auctionNumber: auction.auctionNumber,
          memberName: biddingMemberName,
          bidAmount,
          time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          placedByAdmin: isAdminBiddingForMember,
          adminName: isAdminBiddingForMember ? req.user.name : undefined
        },
        scheduledAt: new Date(),
        status: 'pending',
        chitGroupId: chitGroup._id,
        auctionId: auction._id
      });
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: isAdminBiddingForMember ? 'PLACE_BID_ON_BEHALF' : 'PLACE_BID',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        after: {
          bidAmount,
          auctionNumber: auction.auctionNumber,
          biddingMemberId,
          biddingMemberName,
          placedByAdmin: isAdminBiddingForMember
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: chitGroup._id,
      auctionId: auction._id
    });

    res.status(200).json({
      success: true,
      message: isAdminBiddingForMember
        ? `Bid submitted successfully on behalf of ${biddingMemberName}`
        : 'Bid submitted successfully',
      data: {
        bidAmount,
        bidTime: new Date(),
        auctionNumber: auction.auctionNumber,
        chitGroupName: chitGroup.name,
        memberName: biddingMemberName,
        memberId: biddingMemberId,
        placedByAdmin: isAdminBiddingForMember
      }
    });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while placing bid'
    });
  }
});

// @desc    Close auction and select winner (manual selection by admin)
// @route   POST /api/auctions/:id/close
// @access  Private/Admin
router.post('/:id/close', protect, authorize('admin'), async (req, res) => {
  try {
    const { winnerId, manualDividendPerMember } = req.body;

    if (!winnerId) {
      return res.status(400).json({
        success: false,
        error: 'Please select a winner to close the auction'
      });
    }

    const auction = await Auction.findById(req.params.id)
      .populate('chitGroupId');

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    if (auction.status !== 'Live') {
      return res.status(400).json({
        success: false,
        error: `Cannot close auction with status: ${auction.status}`
      });
    }

    if (auction.bids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot close auction without any bids'
      });
    }

    const chitGroup = auction.chitGroupId;

    // Find the winning bid based on selected winner
    const winningBid = auction.bids.find(bid => bid.memberId.toString() === winnerId);

    if (!winningBid) {
      return res.status(400).json({
        success: false,
        error: 'Selected winner has not placed a bid'
      });
    }

    auction.winningBid = winningBid.bidAmount;
    auction.winnerId = winningBid.memberId;
    auction.winnerName = winningBid.memberName;
    auction.status = 'Closed';
    auction.closedAt = new Date();
    auction.closedBy = req.user.id;

    // Calculate dividends
    auction.commissionCollected = chitGroup.commissionAmount;
    auction.totalDividend = auction.winningBid - chitGroup.commissionAmount;

    // Determine who gets dividends based on payment model
    let dividendRecipients;
    if (chitGroup.winnerPaymentModel === 'A') {
      // Model A: Only non-winners get dividend
      dividendRecipients = chitGroup.members.filter(
        m => m.memberId.toString() !== auction.winnerId.toString()
      );
    } else {
      // Model B: All members except current winner get dividend
      dividendRecipients = chitGroup.members.filter(
        m => m.memberId.toString() !== auction.winnerId.toString()
      );
    }

    // Use manual dividend if provided, otherwise calculate automatically
    if (manualDividendPerMember && !isNaN(manualDividendPerMember)) {
      auction.dividendPerMember = Math.floor(manualDividendPerMember);
      console.log(`Using manual dividend: ₹${auction.dividendPerMember} per member`);
    } else {
      auction.dividendPerMember = dividendRecipients.length > 0
        ? Math.floor(auction.totalDividend / dividendRecipients.length)
        : 0;
      console.log(`Auto-calculated dividend: ₹${auction.dividendPerMember} per member`);
    }

    await auction.save();

    // Update chit group
    chitGroup.completedAuctions += 1;

    // Update winner status in chit group
    const winnerMember = chitGroup.members.find(
      m => m.memberId.toString() === auction.winnerId.toString()
    );
    if (winnerMember) {
      winnerMember.hasWon = true;
      winnerMember.wonInAuction = auction.auctionNumber;
    }

    // Add winner to winners array
    if (!chitGroup.winners) {
      chitGroup.winners = [];
    }
    chitGroup.winners.push(auction.winnerId);

    await chitGroup.save();

    // Create payment records for all members
    const payments = [];

    for (const member of chitGroup.members) {
      const isWinner = member.memberId.toString() === auction.winnerId.toString();
      const isPreviousWinner = chitGroup.winners.slice(0, -1).includes(member.memberId.toString());

      let dueAmount = chitGroup.monthlyContribution;
      let dividendReceived = 0;

      if (isWinner) {
        // Winner pays full monthly contribution
        dueAmount = chitGroup.monthlyContribution;
        dividendReceived = 0;
        console.log(`💰 Winner: ${member.memberName} - Due: ₹${dueAmount}, Dividend: ₹${dividendReceived}`);

        // Also create winner's receipt payment
        payments.push({
          chitGroupId: chitGroup._id,
          memberId: member.memberId,
          memberName: member.memberName,
          auctionNumber: auction.auctionNumber,
          dueDate: new Date(),
          baseAmount: 0,
          dividendReceived: 0,
          dueAmount: 0,
          paidAmount: 0,
          outstandingBalance: 0,
          paymentStatus: 'Paid',
          paidDate: new Date(),
          isOnTime: true,
          gracePeriodDays: 0,
          gracePeriodUsed: false,
          delayDays: 0,
          isWinner: true,
          isCommissionPayment: false,
          commissionAmount: chitGroup.commissionAmount,
          amountReceived: chitGroup.chitAmount - chitGroup.commissionAmount - auction.winningBid,
          paymentMethod: 'Not Paid',
          recordedBy: req.user.id
        });
      } else {
        // Non-winner or previous winner
        if (chitGroup.winnerPaymentModel === 'A' && isPreviousWinner) {
          // Model A: Previous winners pay full, no dividend
          dueAmount = chitGroup.monthlyContribution;
          dividendReceived = 0;
          console.log(`📋 Previous Winner (Model A): ${member.memberName} - Due: ₹${dueAmount}, Dividend: ₹${dividendReceived}`);
        } else {
          // Model B or non-winner: Gets dividend
          dividendReceived = auction.dividendPerMember;
          dueAmount = chitGroup.monthlyContribution - dividendReceived;
          console.log(`✅ Non-Winner: ${member.memberName} - Model: ${chitGroup.winnerPaymentModel}, Base: ₹${chitGroup.monthlyContribution}, Dividend: ₹${dividendReceived}, Due: ₹${dueAmount}`);
        }
      }

      payments.push({
        chitGroupId: chitGroup._id,
        memberId: member.memberId,
        memberName: member.memberName,
        auctionNumber: auction.auctionNumber,
        dueDate: new Date(auction.closedAt),
        baseAmount: chitGroup.monthlyContribution,
        dividendReceived,
        dueAmount,
        paidAmount: 0,
        outstandingBalance: dueAmount,
        paymentStatus: 'Pending',
        isOnTime: false,
        gracePeriodDays: chitGroup.gracePeriodDays,
        gracePeriodUsed: false,
        delayDays: 0,
        isWinner,
        isCommissionPayment: false,
        commissionAmount: isWinner ? chitGroup.commissionAmount : 0,
        paymentMethod: null,
        recordedBy: req.user.id
      });
    }

    // Create payments individually to handle duplicates gracefully
    let createdCount = 0;
    let skippedCount = 0;

    for (const payment of payments) {
      try {
        await Payment.create(payment);
        createdCount++;
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key - payment already exists, skip it
          skippedCount++;
        } else {
          // Other error - rethrow
          throw error;
        }
      }
    }

    console.log(`Payment creation for auction #${auction.auctionNumber}: ${createdCount} created, ${skippedCount} skipped (already exist)`);

    // Send notifications to all members
    for (const member of chitGroup.members) {
      const memberData = await User.findById(member.memberId);
      if (!memberData) continue;

      const isWinner = member.memberId.toString() === auction.winnerId.toString();
      const payment = payments.find(p => p.memberId.toString() === member.memberId.toString());

      if (isWinner) {
        // Winner notification
        await Notification.create({
          recipientId: memberData._id,
          recipientPhone: memberData.phone,
          recipientName: memberData.name,
          type: 'winner_announcement',
          priority: 'high',
          language: memberData.language || 'en',
          templateId: 'winner_announcement',
          templateData: {
            name: memberData.name,
            chitGroup: chitGroup.name,
            auctionNumber: auction.auctionNumber,
            winningBid: auction.winningBid,
            netAmount: chitGroup.chitAmount - chitGroup.commissionAmount - auction.winningBid,
            commission: chitGroup.commissionAmount,
            monthlyPayment: payment.dueAmount,
            dueDate: payment.dueDate.toLocaleDateString('en-IN')
          },
          messageText: `Congratulations! You won Auction #${auction.auctionNumber} for ${chitGroup.name} with a bid of ₹${auction.winningBid}. Net amount: ₹${chitGroup.chitAmount - chitGroup.commissionAmount - auction.winningBid}`,
          scheduledAt: new Date(),
          status: 'pending',
          chitGroupId: chitGroup._id,
          auctionId: auction._id,
          paymentId: payment._id
        });
      } else {
        // Non-winner notification
        await Notification.create({
          recipientId: memberData._id,
          recipientPhone: memberData.phone,
          recipientName: memberData.name,
          type: 'non_winner_result',
          priority: 'medium',
          language: memberData.language || 'en',
          templateId: 'non_winner_result',
          templateData: {
            name: memberData.name,
            chitGroup: chitGroup.name,
            auctionNumber: auction.auctionNumber,
            winnerName: auction.winnerName,
            winningBid: auction.winningBid,
            payment: payment.dueAmount,
            dividend: payment.dividendReceived,
            dueDate: payment.dueDate.toLocaleDateString('en-IN'),
            yourBid: auction.bids.find(b => b.memberId.toString() === member.memberId.toString())?.bidAmount || 'N/A'
          },
          messageText: `Auction #${auction.auctionNumber} for ${chitGroup.name} is closed. Winner: ${auction.winnerName} with bid ₹${auction.winningBid}. Your dividend: ₹${payment.dividendReceived}`,
          scheduledAt: new Date(),
          status: 'pending',
          chitGroupId: chitGroup._id,
          auctionId: auction._id,
          paymentId: payment._id
        });
      }
    }

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'CLOSE_AUCTION',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        before: { status: 'Live' },
        after: {
          status: 'Closed',
          winnerId: auction.winnerId,
          winnerName: auction.winnerName,
          winningBid: auction.winningBid,
          dividendPerMember: auction.dividendPerMember
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: chitGroup._id,
      auctionId: auction._id
    });

    res.status(200).json({
      success: true,
      message: 'Auction closed successfully',
      data: {
        auction,
        winner: {
          name: auction.winnerName,
          bid: auction.winningBid,
          amountReceived: chitGroup.chitAmount - chitGroup.commissionAmount - auction.winningBid
        },
        dividendPerMember: auction.dividendPerMember,
        paymentsCreated: payments.length,
        notificationsSent: chitGroup.members.length
      }
    });
  } catch (error) {
    console.error('Close auction error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while closing auction'
    });
  }
});

// @desc    Get all auctions
// @route   GET /api/auctions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Admin can see all auctions
    if (req.user.role === 'admin') {
      const auctions = await Auction.find()
        .populate('chitGroupId', 'name chitAmount commissionAmount')
        .populate('winnerId', 'name phone')
        .populate('createdBy', 'name')
        .populate('closedBy', 'name')
        .sort({ scheduledDate: -1, auctionNumber: -1 });

      return res.status(200).json({
        success: true,
        count: auctions.length,
        data: auctions
      });
    }

    // Members can only see auctions for their chit groups
    if (req.user.role === 'member') {
      // Find all chit groups the member belongs to
      const chitGroups = await ChitGroup.find({
        'members.memberId': req.user.id
      }).select('_id');

      const chitGroupIds = chitGroups.map(cg => cg._id);

      const auctions = await Auction.find({
        chitGroupId: { $in: chitGroupIds }
      })
        .populate('chitGroupId', 'name chitAmount commissionAmount')
        .populate('winnerId', 'name phone')
        .sort({ scheduledDate: -1, auctionNumber: -1 });

      return res.status(200).json({
        success: true,
        count: auctions.length,
        data: auctions
      });
    }

    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  } catch (error) {
    console.error('Get all auctions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching auctions'
    });
  }
});

// @desc    Get auction details
// @route   GET /api/auctions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate({
        path: 'chitGroupId',
        populate: {
          path: 'members.memberId',
          select: 'name phone email language'
        }
      })
      .populate('autoExcludedMembers', 'name phone email')
      .populate('manualExcludedMembers.memberId', 'name phone email')
      .populate('winnerId', 'name phone')
      .populate('createdBy', 'name')
      .populate('closedBy', 'name');

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    // If member, filter data
    if (req.user.role === 'member') {
      const chitGroup = auction.chitGroupId;
      const isMember = chitGroup.members.some(
        m => m.memberId.toString() === req.user.id
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this auction'
        });
      }

      // Filter bids - member sees only their own
      const myBid = auction.bids.find(
        b => b.memberId.toString() === req.user.id
      );

      const filteredAuction = {
        ...auction.toObject(),
        bids: auction.status === 'Closed' ? [myBid].filter(Boolean) : (myBid ? [myBid] : []),
        totalBids: auction.status === 'Closed' ? auction.totalBids : undefined,
        currentHighestBid: undefined // Members don't see current highest during live auction
      };

      return res.status(200).json({
        success: true,
        data: filteredAuction,
        canBid: auction.status === 'Live' && !myBid,
        myBid: myBid || null
      });
    }

    // Admin sees all bids
    res.status(200).json({
      success: true,
      data: auction
    });
  } catch (error) {
    console.error('Get auction error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching auction'
    });
  }
});

// @desc    Get all auctions for a chit group
// @route   GET /api/auctions/chitgroup/:chitGroupId
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
    }

    const auctions = await Auction.find({ chitGroupId: req.params.chitGroupId })
      .populate('winnerId', 'name phone')
      .sort({ auctionNumber: 1 });

    res.status(200).json({
      success: true,
      count: auctions.length,
      data: auctions
    });
  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching auctions'
    });
  }
});

// @desc    Exclude member from auction manually
// @route   POST /api/auctions/:id/exclude-member
// @access  Private/Admin
router.post('/:id/exclude-member', protect, authorize('admin'), async (req, res) => {
  try {
    const { memberId, reason } = req.body;

    if (!memberId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Please provide member ID and reason'
      });
    }

    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    if (auction.status === 'Closed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot exclude members from a closed auction'
      });
    }

    // Check if already excluded
    const alreadyExcluded = auction.manualExcludedMembers.some(
      e => e.memberId.toString() === memberId
    );

    if (alreadyExcluded) {
      return res.status(400).json({
        success: false,
        error: 'Member is already excluded from this auction'
      });
    }

    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    auction.manualExcludedMembers.push({
      memberId,
      reason,
      excludedBy: req.user.id
    });

    // Update eligible members count
    const allExcluded = [
      ...auction.autoExcludedMembers.map(id => id.toString()),
      ...auction.manualExcludedMembers.map(e => e.memberId.toString())
    ];

    const chitGroup = await ChitGroup.findById(auction.chitGroupId);
    auction.eligibleMembers = chitGroup.members.length - allExcluded.length;

    await auction.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'EXCLUDE_MEMBER_FROM_AUCTION',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        after: {
          memberId,
          memberName: member.name,
          reason
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: chitGroup._id,
      auctionId: auction._id
    });

    res.status(200).json({
      success: true,
      message: 'Member excluded successfully',
      data: auction
    });
  } catch (error) {
    console.error('Exclude member error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while excluding member'
    });
  }
});

// @desc    Revert member exclusion (make member eligible again)
// @route   DELETE /api/auctions/:id/exclude-member/:memberId
// @access  Private/Admin
router.delete('/:id/exclude-member/:memberId', protect, authorize('admin'), async (req, res) => {
  try {
    const { id: auctionId, memberId } = req.params;

    const auction = await Auction.findById(auctionId);

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    if (auction.status === 'Closed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify exclusions for a closed auction'
      });
    }

    // Find the exclusion
    const exclusionIndex = auction.manualExcludedMembers.findIndex(
      e => e.memberId.toString() === memberId
    );

    if (exclusionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Member is not manually excluded from this auction'
      });
    }

    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Remove from manual exclusions
    const removedExclusion = auction.manualExcludedMembers[exclusionIndex];
    auction.manualExcludedMembers.splice(exclusionIndex, 1);

    // Update eligible members count
    const allExcluded = [
      ...auction.autoExcludedMembers.map(id => id.toString()),
      ...auction.manualExcludedMembers.map(e => e.memberId.toString())
    ];

    const chitGroup = await ChitGroup.findById(auction.chitGroupId);
    auction.eligibleMembers = chitGroup.members.length - allExcluded.length;

    await auction.save();

    // Log audit
    await AuditLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'REVERT_MEMBER_EXCLUSION',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        before: {
          memberId,
          memberName: member.name,
          reason: removedExclusion.reason
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
      success: true,
      chitGroupId: chitGroup._id,
      auctionId: auction._id
    });

    res.status(200).json({
      success: true,
      message: 'Member exclusion reverted successfully. Member is now eligible.',
      data: auction
    });
  } catch (error) {
    console.error('Revert exclusion error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while reverting member exclusion'
    });
  }
});

// @desc    Get upcoming auctions
// @route   GET /api/auctions/upcoming
// @access  Private/Member
router.get('/member/upcoming', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('chitGroups');

    const chitGroupIds = user.chitGroups.map(cg => cg._id);

    const upcomingAuctions = await Auction.find({
      chitGroupId: { $in: chitGroupIds },
      status: { $in: ['Scheduled', 'Live'] }
    })
      .populate('chitGroupId', 'name chitAmount commissionAmount')
      .sort({ scheduledDate: 1 });

    res.status(200).json({
      success: true,
      count: upcomingAuctions.length,
      data: upcomingAuctions
    });
  } catch (error) {
    console.error('Get upcoming auctions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching upcoming auctions'
    });
  }
});

// @desc    Delete auction with cascading deletes
// @route   DELETE /api/auctions/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).populate('chitGroupId');

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    console.log(`🗑️ Deleting auction #${auction.auctionNumber} (${auction.status}) for ${auction.chitGroupName}`);

    // Track what we're deleting for the response
    const deletionSummary = {
      auction: auction.auctionNumber,
      status: auction.status,
      paymentsDeleted: 0,
      notificationsDeleted: 0,
      chitGroupUpdated: false
    };

    // 1. Delete all payment records associated with this auction
    const paymentDeleteResult = await Payment.deleteMany({
      chitGroupId: auction.chitGroupId,
      auctionNumber: auction.auctionNumber
    });
    deletionSummary.paymentsDeleted = paymentDeleteResult.deletedCount;
    console.log(`  ✅ Deleted ${deletionSummary.paymentsDeleted} payment records`);

    // 2. Delete all notifications associated with this auction
    const notificationDeleteResult = await Notification.deleteMany({
      auctionId: auction._id
    });
    deletionSummary.notificationsDeleted = notificationDeleteResult.deletedCount;
    console.log(`  ✅ Deleted ${deletionSummary.notificationsDeleted} notifications`);

    // 3. Update chit group if auction was closed
    if (auction.status === 'Closed' && auction.chitGroupId) {
      const chitGroup = auction.chitGroupId;

      // Decrement completed auctions
      if (chitGroup.completedAuctions > 0) {
        chitGroup.completedAuctions -= 1;
      }

      // Remove winner from winners array
      if (auction.winnerId) {
        chitGroup.winners = chitGroup.winners.filter(
          w => w.toString() !== auction.winnerId.toString()
        );

        // Update member's hasWon status
        const winnerMember = chitGroup.members.find(
          m => m.memberId.toString() === auction.winnerId.toString()
        );
        if (winnerMember) {
          winnerMember.hasWon = false;
          winnerMember.wonInAuction = null;
        }
      }

      await chitGroup.save();
      deletionSummary.chitGroupUpdated = true;
      console.log(`  ✅ Updated chit group stats`);
    }

    // 4. Delete the auction
    await Auction.findByIdAndDelete(req.params.id);
    console.log(`  ✅ Deleted auction record`);

    // 5. Create audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE',
      entity: 'Auction',
      entityId: auction._id,
      changes: {
        auctionNumber: auction.auctionNumber,
        status: auction.status,
        chitGroupId: auction.chitGroupId,
        scheduledDate: auction.scheduledDate,
        paymentsDeleted: deletionSummary.paymentsDeleted,
        notificationsDeleted: deletionSummary.notificationsDeleted,
        reason: 'Deleted by admin with cascading deletes'
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Auction and all related records deleted successfully',
      data: deletionSummary
    });
  } catch (error) {
    console.error('Delete auction error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting auction'
    });
  }
});

module.exports = router;
