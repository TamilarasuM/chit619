const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Auction = require('../models/Auction');
const ChitGroup = require('../models/ChitGroup');
const User = require('../models/User');
const MemberRanking = require('../models/MemberRanking');
const MemberStatement = require('../models/MemberStatement');
const { protect, authorize } = require('../middleware/auth');
const reportService = require('../services/reportService');

// Helper function for Indian number formatting
function formatIndianCurrency(amount) {
  if (!amount && amount !== 0) return '₹0';

  const numStr = Math.abs(amount).toString();
  let lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return (amount < 0 ? '-' : '') + '₹' + formatted;
}

// Helper function for date formatting (DD/MM/YYYY)
function formatIndianDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// @desc    Get member payment history report
// @route   GET /api/reports/payment-history
// @access  Private/Admin
router.get('/payment-history', protect, authorize('admin'), async (req, res) => {
  try {
    const { memberId, chitId, from, to, format = 'json' } = req.query;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide member ID'
      });
    }

    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    const query = { memberId };

    if (chitId) query.chitGroupId = chitId;
    if (from || to) {
      query.dueDate = {};
      if (from) query.dueDate.$gte = new Date(from);
      if (to) query.dueDate.$lte = new Date(to);
    }

    const payments = await Payment.find(query)
      .populate('chitGroupId', 'name chitAmount monthlyContribution')
      .sort({ dueDate: 1 });

    // Get chit group details if specific chit
    let chitGroup = null;
    if (chitId) {
      chitGroup = await ChitGroup.findById(chitId);
    }

    // Calculate summary
    const summary = {
      totalDue: payments.reduce((sum, p) => sum + p.dueAmount, 0),
      totalPaid: payments.reduce((sum, p) => sum + p.paidAmount, 0),
      totalOutstanding: payments.reduce((sum, p) => sum + p.outstandingBalance, 0),
      onTimePayments: payments.filter(p => p.isOnTime && p.paymentStatus === 'Paid').length,
      delayedPayments: payments.filter(p => p.delayDays > 0).length,
      totalPayments: payments.length
    };

    // Get ranking if specific chit
    let ranking = null;
    if (chitId) {
      ranking = await MemberRanking.findOne({ memberId, chitGroupId: chitId });
    }

    const reportData = {
      reportType: 'Member Payment History',
      generatedAt: new Date(),
      generatedBy: req.user.name,
      member: {
        id: member._id,
        name: member.name,
        phone: member.phone,
        email: member.email
      },
      chitGroup: chitGroup ? {
        id: chitGroup._id,
        name: chitGroup.name,
        chitAmount: chitGroup.chitAmount,
        monthlyContribution: chitGroup.monthlyContribution
      } : null,
      dateRange: {
        from: from ? formatIndianDate(from) : 'All',
        to: to ? formatIndianDate(to) : 'All'
      },
      payments: payments.map(p => ({
        auctionNumber: p.auctionNumber,
        dueDate: formatIndianDate(p.dueDate),
        dueAmount: formatIndianCurrency(p.dueAmount),
        paidAmount: formatIndianCurrency(p.paidAmount),
        paidDate: p.paidDate ? formatIndianDate(p.paidDate) : 'Pending',
        status: p.paymentStatus,
        delayDays: p.delayDays || 0,
        onTime: p.isOnTime,
        chitGroup: p.chitGroupId.name,
        outstandingBalance: formatIndianCurrency(p.outstandingBalance)
      })),
      summary: {
        totalDue: formatIndianCurrency(summary.totalDue),
        totalPaid: formatIndianCurrency(summary.totalPaid),
        totalOutstanding: formatIndianCurrency(summary.totalOutstanding),
        onTimePayments: `${summary.onTimePayments} / ${summary.totalPayments}`,
        delayedPayments: `${summary.delayedPayments} / ${summary.totalPayments}`,
        ranking: ranking ? `${ranking.rank} / ${ranking.rankCategory}` : 'N/A'
      }
    };

    if (format === 'pdf') {
      const doc = await reportService.generatePaymentCollectionPDF(chitId, from, to);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=payment-history.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Payment history report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating report'
    });
  }
});

// @desc    Get auction history report
// @route   GET /api/reports/auction-history
// @access  Private/Admin
router.get('/auction-history', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitId, from, to, format = 'json' } = req.query;

    if (!chitId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide chit group ID'
      });
    }

    const chitGroup = await ChitGroup.findById(chitId);
    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    const query = { chitGroupId: chitId };

    if (from || to) {
      query.closedAt = {};
      if (from) query.closedAt.$gte = new Date(from);
      if (to) query.closedAt.$lte = new Date(to);
    }

    const auctions = await Auction.find(query)
      .populate('winnerId', 'name phone')
      .sort({ auctionNumber: 1 });

    const reportData = {
      reportType: 'Auction History',
      generatedAt: new Date(),
      generatedBy: req.user.name,
      chitGroup: {
        id: chitGroup._id,
        name: chitGroup.name,
        chitAmount: formatIndianCurrency(chitGroup.chitAmount),
        totalMembers: chitGroup.totalMembers,
        duration: chitGroup.duration,
        commission: formatIndianCurrency(chitGroup.commissionAmount),
        model: chitGroup.winnerPaymentModel
      },
      dateRange: {
        from: from ? formatIndianDate(from) : 'All',
        to: to ? formatIndianDate(to) : 'All'
      },
      auctions: auctions.map(a => ({
        auctionNumber: a.auctionNumber,
        scheduledDate: formatIndianDate(a.scheduledDate),
        closedAt: a.closedAt ? formatIndianDate(a.closedAt) : 'Not closed',
        status: a.status,
        participants: a.totalBids,
        eligibleMembers: a.eligibleMembers,
        participationRate: a.participationRate ? `${a.participationRate.toFixed(1)}%` : 'N/A',
        winner: a.winnerId ? a.winnerId.name : 'TBD',
        winningBid: formatIndianCurrency(a.winningBid || 0),
        commission: formatIndianCurrency(a.commissionCollected || 0),
        totalDividend: formatIndianCurrency(a.totalDividend || 0),
        dividendPerMember: formatIndianCurrency(a.dividendPerMember || 0),
        bids: a.bids.map(b => ({
          memberName: b.memberName,
          bidAmount: formatIndianCurrency(b.bidAmount),
          bidTime: formatIndianDate(b.bidTime),
          won: b.memberId.toString() === (a.winnerId?._id?.toString() || '')
        }))
      })),
      summary: {
        totalAuctions: auctions.length,
        completedAuctions: auctions.filter(a => a.status === 'Closed').length,
        totalCommissionCollected: formatIndianCurrency(
          auctions.reduce((sum, a) => sum + (a.commissionCollected || 0), 0)
        ),
        totalDividendDistributed: formatIndianCurrency(
          auctions.reduce((sum, a) => sum + (a.totalDividend || 0), 0)
        ),
        averageParticipation: auctions.length > 0
          ? `${(auctions.reduce((sum, a) => sum + (a.participationRate || 0), 0) / auctions.length).toFixed(1)}%`
          : 'N/A'
      }
    };

    if (format === 'pdf') {
      const doc = await reportService.generateAuctionHistoryPDF(chitId, from, to);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=auction-history-${chitId}.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Auction history report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating report'
    });
  }
});

// @desc    Get outstanding payments report
// @route   GET /api/reports/outstanding
// @access  Private/Admin
router.get('/outstanding', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitId, format = 'json' } = req.query;

    const query = {
      paymentStatus: { $in: ['Pending', 'Partial', 'Overdue'] },
      outstandingBalance: { $gt: 0 }
    };

    if (chitId) {
      query.chitGroupId = chitId;
    }

    const payments = await Payment.find(query)
      .populate('memberId', 'name phone email')
      .populate('chitGroupId', 'name gracePeriodDays')
      .sort({ dueDate: 1 });

    // Calculate delay status
    const now = new Date();
    const paymentsWithDelay = payments.map(p => {
      const dueDate = new Date(p.dueDate);
      const gracePeriodEnd = new Date(dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (p.chitGroupId.gracePeriodDays || 0));

      let delayStatus = 'Within Grace';
      let daysOverdue = 0;

      if (now > gracePeriodEnd) {
        daysOverdue = Math.floor((now - gracePeriodEnd) / (1000 * 60 * 60 * 24));
        delayStatus = 'Overdue';
      }

      return {
        ...p.toObject(),
        delayStatus,
        daysOverdue
      };
    });

    // Group by chit
    const groupedByChit = paymentsWithDelay.reduce((acc, p) => {
      const chitId = p.chitGroupId._id.toString();
      if (!acc[chitId]) {
        acc[chitId] = {
          chitName: p.chitGroupId.name,
          payments: [],
          totalOutstanding: 0,
          membersCount: 0
        };
      }
      acc[chitId].payments.push(p);
      acc[chitId].totalOutstanding += p.outstandingBalance;
      return acc;
    }, {});

    // Calculate unique members per chit
    Object.keys(groupedByChit).forEach(chitId => {
      const uniqueMembers = new Set(
        groupedByChit[chitId].payments.map(p => p.memberId._id.toString())
      );
      groupedByChit[chitId].membersCount = uniqueMembers.size;
    });

    const reportData = {
      reportType: 'Outstanding Payments',
      generatedAt: new Date(),
      generatedBy: req.user.name,
      asOf: formatIndianDate(now),
      payments: paymentsWithDelay.map(p => ({
        memberName: p.memberId.name,
        phone: p.memberId.phone,
        chitGroup: p.chitGroupId.name,
        auctionNumber: p.auctionNumber,
        dueDate: formatIndianDate(p.dueDate),
        dueAmount: formatIndianCurrency(p.dueAmount),
        paidAmount: formatIndianCurrency(p.paidAmount),
        outstandingBalance: formatIndianCurrency(p.outstandingBalance),
        delayStatus: p.delayStatus,
        daysOverdue: p.daysOverdue,
        paymentStatus: p.paymentStatus
      })),
      groupedByChit: Object.entries(groupedByChit).map(([id, data]) => ({
        chitName: data.chitName,
        membersWithOutstanding: data.membersCount,
        paymentsCount: data.payments.length,
        totalOutstanding: formatIndianCurrency(data.totalOutstanding)
      })),
      summary: {
        totalPayments: payments.length,
        totalOutstanding: formatIndianCurrency(
          payments.reduce((sum, p) => sum + p.outstandingBalance, 0)
        ),
        membersInGrace: paymentsWithDelay.filter(p => p.delayStatus === 'Within Grace').length,
        membersOverdue: paymentsWithDelay.filter(p => p.delayStatus === 'Overdue').length,
        chitsAffected: Object.keys(groupedByChit).length
      }
    };

    if (format === 'pdf') {
      const doc = await reportService.generateOutstandingPaymentsPDF(chitId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=outstanding-payments.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Outstanding payments report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating report'
    });
  }
});

// @desc    Get dividend distribution summary
// @route   GET /api/reports/dividend-summary
// @access  Private/Admin
router.get('/dividend-summary', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitId, memberId, from, to, format = 'json' } = req.query;

    if (!chitId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide chit group ID'
      });
    }

    const chitGroup = await ChitGroup.findById(chitId);
    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    const query = { chitGroupId: chitId };

    if (memberId) query.memberId = memberId;
    if (from || to) {
      query.dueDate = {};
      if (from) query.dueDate.$gte = new Date(from);
      if (to) query.dueDate.$lte = new Date(to);
    }

    const payments = await Payment.find(query)
      .populate('memberId', 'name phone')
      .sort({ auctionNumber: 1 });

    // Group by member
    const memberDividends = {};

    payments.forEach(p => {
      const memberId = p.memberId._id.toString();
      if (!memberDividends[memberId]) {
        memberDividends[memberId] = {
          memberName: p.memberId.name,
          phone: p.memberId.phone,
          auctions: {},
          totalDividends: 0,
          hasWon: p.isWinner || false
        };
      }

      memberDividends[memberId].auctions[p.auctionNumber] = {
        dividendReceived: p.dividendReceived,
        isWinner: p.isWinner
      };
      memberDividends[memberId].totalDividends += p.dividendReceived || 0;

      if (p.isWinner) {
        memberDividends[memberId].hasWon = true;
        memberDividends[memberId].wonInAuction = p.auctionNumber;
      }
    });

    // Get all auction numbers
    const auctionNumbers = [...new Set(payments.map(p => p.auctionNumber))].sort((a, b) => a - b);

    const reportData = {
      reportType: 'Dividend Distribution Summary',
      generatedAt: new Date(),
      generatedBy: req.user.name,
      chitGroup: {
        id: chitGroup._id,
        name: chitGroup.name,
        chitAmount: formatIndianCurrency(chitGroup.chitAmount),
        model: chitGroup.winnerPaymentModel
      },
      dateRange: {
        from: from ? formatIndianDate(from) : 'All',
        to: to ? formatIndianDate(to) : 'All'
      },
      auctionNumbers,
      memberDividends: Object.values(memberDividends).map(m => ({
        memberName: m.memberName,
        phone: m.phone,
        auctionWise: auctionNumbers.map(num => ({
          auctionNumber: num,
          dividend: m.auctions[num]
            ? (m.auctions[num].isWinner ? 'Winner' : formatIndianCurrency(m.auctions[num].dividendReceived))
            : '-'
        })),
        totalDividends: formatIndianCurrency(m.totalDividends),
        wonInAuction: m.wonInAuction || '-'
      })).sort((a, b) => b.totalDividends - a.totalDividends),
      summary: {
        totalMembers: Object.keys(memberDividends).length,
        totalDividendsDistributed: formatIndianCurrency(
          Object.values(memberDividends).reduce((sum, m) => sum + m.totalDividends, 0)
        ),
        auctionsCompleted: auctionNumbers.length,
        averageDividendPerMember: formatIndianCurrency(
          Object.values(memberDividends).reduce((sum, m) => sum + m.totalDividends, 0) / Object.keys(memberDividends).length
        )
      }
    };

    if (format === 'pdf') {
      const doc = await reportService.generateChitGroupSummaryPDF(chitId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=dividend-summary-${chitId}.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Dividend summary report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating report'
    });
  }
});

// @desc    Get member statement
// @route   GET /api/reports/member-statement/:memberId
// @access  Private
router.get('/member-statement/:memberId', protect, async (req, res) => {
  try {
    // Members can only view their own statement
    if (req.user.role === 'member' && req.params.memberId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own statement'
      });
    }

    const { chitId, format = 'json' } = req.query;

    const member = await User.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    const query = { memberId: req.params.memberId };
    if (chitId) query.chitGroupId = chitId;

    const payments = await Payment.find(query)
      .populate('chitGroupId', 'name chitAmount monthlyContribution')
      .sort({ auctionNumber: 1 });

    // Build transactions
    const transactions = [];
    let runningBalance = 0;

    payments.forEach(p => {
      // Dividend credit
      if (p.dividendReceived > 0) {
        transactions.push({
          date: formatIndianDate(p.dueDate),
          auctionNumber: p.auctionNumber,
          type: 'Dividend',
          description: `Dividend from auction #${p.auctionNumber}`,
          debit: 0,
          credit: p.dividendReceived,
          balance: runningBalance + p.dividendReceived
        });
        runningBalance += p.dividendReceived;
      }

      // Win amount credit (if winner)
      if (p.isWinner && p.amountReceived) {
        transactions.push({
          date: formatIndianDate(p.dueDate),
          auctionNumber: p.auctionNumber,
          type: 'Win Amount',
          description: `Won auction #${p.auctionNumber}`,
          debit: 0,
          credit: p.amountReceived,
          balance: runningBalance + p.amountReceived
        });
        runningBalance += p.amountReceived;
      }

      // Commission debit (if winner)
      if (p.isWinner && p.commissionAmount) {
        transactions.push({
          date: formatIndianDate(p.dueDate),
          auctionNumber: p.auctionNumber,
          type: 'Commission',
          description: `Commission for auction #${p.auctionNumber}`,
          debit: p.commissionAmount,
          credit: 0,
          balance: runningBalance - p.commissionAmount
        });
        runningBalance -= p.commissionAmount;
      }

      // Monthly contribution debit
      if (p.paidAmount > 0) {
        transactions.push({
          date: p.paidDate ? formatIndianDate(p.paidDate) : formatIndianDate(p.dueDate),
          auctionNumber: p.auctionNumber,
          type: 'Contribution',
          description: `Monthly payment for auction #${p.auctionNumber}`,
          debit: p.paidAmount,
          credit: 0,
          balance: runningBalance - p.paidAmount,
          status: p.paymentStatus
        });
        runningBalance -= p.paidAmount;
      }
    });

    // Calculate summary
    const summary = {
      totalContributions: payments.reduce((sum, p) => sum + p.paidAmount, 0),
      totalDividends: payments.reduce((sum, p) => sum + (p.dividendReceived || 0), 0),
      netContributions: 0,
      outstandingAmount: payments.reduce((sum, p) => sum + p.outstandingBalance, 0),
      currentBalance: runningBalance
    };

    summary.netContributions = summary.totalContributions - summary.totalDividends;

    // Check if member won
    const winnerPayment = payments.find(p => p.isWinner);
    const auctionWon = winnerPayment ? {
      auctionNumber: winnerPayment.auctionNumber,
      wonDate: formatIndianDate(winnerPayment.dueDate),
      bidAmount: winnerPayment.isWinner ? 'Winner' : 'N/A',
      receivedAmount: formatIndianCurrency(winnerPayment.amountReceived || 0),
      commissionPaid: formatIndianCurrency(winnerPayment.commissionAmount || 0)
    } : null;

    const reportData = {
      reportType: 'Member Statement',
      generatedAt: new Date(),
      member: {
        id: member._id,
        name: member.name,
        phone: member.phone,
        email: member.email
      },
      chitGroup: chitId ? {
        name: payments[0]?.chitGroupId.name,
        chitAmount: formatIndianCurrency(payments[0]?.chitGroupId.chitAmount)
      } : 'All Chit Groups',
      transactions: transactions.map(t => ({
        ...t,
        debit: t.debit > 0 ? formatIndianCurrency(t.debit) : '-',
        credit: t.credit > 0 ? formatIndianCurrency(t.credit) : '-',
        balance: formatIndianCurrency(t.balance)
      })),
      summary: {
        totalContributions: formatIndianCurrency(summary.totalContributions),
        totalDividends: formatIndianCurrency(summary.totalDividends),
        netContributions: formatIndianCurrency(summary.netContributions),
        outstandingAmount: formatIndianCurrency(summary.outstandingAmount),
        currentBalance: formatIndianCurrency(summary.currentBalance)
      },
      auctionWon
    };

    if (format === 'pdf') {
      const doc = await reportService.generateMemberStatementPDF(req.params.memberId, chitId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=member-statement-${req.params.memberId}.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Member statement report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating report'
    });
  }
});

// @desc    Get chit group summary report
// @route   GET /api/reports/chit-summary/:chitId
// @access  Private/Admin
router.get('/chit-summary/:chitId', protect, authorize('admin'), async (req, res) => {
  try {
    const { format = 'json', auctionNumber } = req.query;

    const chitGroup = await ChitGroup.findById(req.params.chitId)
      .populate('members.memberId', 'name phone')
      .populate('createdBy', 'name');

    if (!chitGroup) {
      return res.status(404).json({
        success: false,
        error: 'Chit group not found'
      });
    }

    // Build auction query
    const auctionQuery = { chitGroupId: chitGroup._id };
    if (auctionNumber) {
      auctionQuery.auctionNumber = parseInt(auctionNumber);
    }

    // Get auctions (all or filtered by auction number)
    const auctions = await Auction.find(auctionQuery)
      .sort({ auctionNumber: 1 });

    // Build payment query
    const paymentQuery = { chitGroupId: chitGroup._id };
    if (auctionNumber) {
      paymentQuery.auctionNumber = parseInt(auctionNumber);
    }

    // Get payments (all or filtered by auction number)
    const payments = await Payment.find(paymentQuery);

    // Calculate financial summary
    const totalCollections = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPayouts = auctions
      .filter(a => a.status === 'Closed')
      .reduce((sum, a) => {
        const chitAmount = chitGroup.chitAmount;
        const commission = chitGroup.commissionAmount;
        const winningBid = a.winningBid || 0;
        return sum + (chitAmount - commission - winningBid);
      }, 0);
    const commissionEarned = auctions
      .filter(a => a.status === 'Closed')
      .reduce((sum, a) => sum + (a.commissionCollected || 0), 0);
    const outstanding = payments.reduce((sum, p) => sum + p.outstandingBalance, 0);

    // Member statistics
    const rankings = await MemberRanking.find({ chitGroupId: chitGroup._id })
      .sort({ rank: 1 });

    const memberStats = {
      total: chitGroup.totalMembers,
      joined: chitGroup.members.length,
      winners: chitGroup.winners ? chitGroup.winners.length : 0,
      pendingWinners: chitGroup.totalMembers - (chitGroup.winners ? chitGroup.winners.length : 0),
      excellent: rankings.filter(r => r.rankCategory === 'Excellent').length,
      good: rankings.filter(r => r.rankCategory === 'Good').length,
      average: rankings.filter(r => r.rankCategory === 'Average').length,
      poor: rankings.filter(r => r.rankCategory === 'Poor').length
    };

    const reportData = {
      reportType: auctionNumber ? `Chit Group Summary - Auction #${auctionNumber}` : 'Chit Group Summary',
      generatedAt: new Date(),
      generatedBy: req.user.name,
      filters: auctionNumber ? {
        auctionNumber: parseInt(auctionNumber),
        auctionDetails: auctions.length > 0 ? {
          status: auctions[0].status,
          date: formatIndianDate(auctions[0].scheduledDate),
          winner: auctions[0].winnerName || 'TBD'
        } : null
      } : null,
      configuration: {
        name: chitGroup.name,
        chitAmount: formatIndianCurrency(chitGroup.chitAmount),
        totalMembers: chitGroup.totalMembers,
        duration: `${chitGroup.duration} months`,
        monthlyContribution: formatIndianCurrency(chitGroup.monthlyContribution),
        commission: formatIndianCurrency(chitGroup.commissionAmount),
        model: chitGroup.winnerPaymentModel === 'A' ? 'A (Winner pays full)' : 'B (Winner gets dividend)',
        gracePeriod: `${chitGroup.gracePeriodDays} days`,
        startDate: formatIndianDate(chitGroup.startDate),
        status: chitGroup.status,
        createdBy: chitGroup.createdBy.name
      },
      progress: {
        auctionsCompleted: `${chitGroup.completedAuctions} / ${chitGroup.duration}`,
        percentComplete: `${((chitGroup.completedAuctions / chitGroup.duration) * 100).toFixed(1)}%`,
        monthsRemaining: chitGroup.duration - chitGroup.completedAuctions
      },
      financialSummary: {
        totalCollections: formatIndianCurrency(totalCollections),
        totalPayouts: formatIndianCurrency(totalPayouts),
        commissionEarned: formatIndianCurrency(commissionEarned),
        outstanding: formatIndianCurrency(outstanding),
        netPosition: formatIndianCurrency(totalCollections - totalPayouts)
      },
      memberStatistics: {
        total: memberStats.total,
        joined: memberStats.joined,
        winners: memberStats.winners,
        pendingWinners: memberStats.pendingWinners,
        rankingDistribution: {
          excellent: memberStats.excellent,
          good: memberStats.good,
          average: memberStats.average,
          poor: memberStats.poor
        }
      },
      topMembers: rankings.slice(0, 5).map((r, idx) => ({
        rank: idx + 1,
        name: r.memberName,
        category: r.rankCategory,
        score: r.rankScore,
        onTimePayments: `${r.onTimePayments} / ${r.totalPaymentsDue}`
      })),
      recentAuctions: auctions.slice(-3).reverse().map(a => ({
        auctionNumber: a.auctionNumber,
        date: formatIndianDate(a.closedAt || a.scheduledDate),
        status: a.status,
        winner: a.winnerName || 'TBD',
        winningBid: formatIndianCurrency(a.winningBid || 0)
      }))
    };

    if (format === 'pdf') {
      const doc = await reportService.generateCompleteChitReportPDF(req.params.chitId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=chit-summary-${req.params.chitId}.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Chit summary report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating report'
    });
  }
});

// @desc    Get financial/revenue report
// @route   GET /api/reports/financial
// @access  Private/Admin
router.get('/financial', protect, authorize('admin'), async (req, res) => {
  try {
    const { chitId, from, to, format = 'json' } = req.query;

    const chitQuery = {};
    if (chitId) chitQuery._id = chitId;

    const chitGroups = await ChitGroup.find(chitQuery);

    const dateQuery = {};
    if (from || to) {
      dateQuery.closedAt = {};
      if (from) dateQuery.closedAt.$gte = new Date(from);
      if (to) dateQuery.closedAt.$lte = new Date(to);
    }

    // Get all closed auctions
    const auctionQuery = { status: 'Closed', ...dateQuery };
    if (chitId) auctionQuery.chitGroupId = chitId;

    const auctions = await Auction.find(auctionQuery)
      .populate('chitGroupId', 'name');

    // Calculate revenue by chit
    const revenueByChit = {};

    auctions.forEach(a => {
      const chitId = a.chitGroupId._id.toString();
      if (!revenueByChit[chitId]) {
        revenueByChit[chitId] = {
          chitName: a.chitGroupId.name,
          auctionsCompleted: 0,
          commissionEarned: 0
        };
      }
      revenueByChit[chitId].auctionsCompleted += 1;
      revenueByChit[chitId].commissionEarned += a.commissionCollected || 0;
    });

    // Get all payments
    const paymentQuery = {};
    if (chitId) paymentQuery.chitGroupId = chitId;
    if (from || to) {
      paymentQuery.paidDate = {};
      if (from) paymentQuery.paidDate.$gte = new Date(from);
      if (to) paymentQuery.paidDate.$lte = new Date(to);
    }

    const payments = await Payment.find(paymentQuery);

    const totalCollections = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalOutstanding = payments.reduce((sum, p) => sum + p.outstandingBalance, 0);

    const reportData = {
      reportType: 'Financial Report',
      generatedAt: new Date(),
      generatedBy: req.user.name,
      dateRange: {
        from: from ? formatIndianDate(from) : 'All time',
        to: to ? formatIndianDate(to) : 'Present'
      },
      revenueSummary: {
        totalCommissionEarned: formatIndianCurrency(
          Object.values(revenueByChit).reduce((sum, c) => sum + c.commissionEarned, 0)
        ),
        chitGroupsActive: Object.keys(revenueByChit).length,
        totalAuctionsCompleted: Object.values(revenueByChit).reduce((sum, c) => sum + c.auctionsCompleted, 0)
      },
      collections: {
        totalCollected: formatIndianCurrency(totalCollections),
        totalOutstanding: formatIndianCurrency(totalOutstanding),
        collectionRate: totalCollections + totalOutstanding > 0
          ? `${((totalCollections / (totalCollections + totalOutstanding)) * 100).toFixed(1)}%`
          : 'N/A'
      },
      chitWiseBreakdown: Object.entries(revenueByChit).map(([id, data]) => ({
        chitName: data.chitName,
        auctionsCompleted: data.auctionsCompleted,
        commissionEarned: formatIndianCurrency(data.commissionEarned)
      })),
      activeChits: chitGroups.filter(c => c.status === 'Active').length,
      completedChits: chitGroups.filter(c => c.status === 'Closed').length,
      totalMembers: chitGroups.reduce((sum, c) => sum + c.members.length, 0)
    };

    if (format === 'pdf') {
      const doc = await reportService.generateCommissionReportPDF(from, to);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=financial-report.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while generating report'
    });
  }
});

module.exports = router;
