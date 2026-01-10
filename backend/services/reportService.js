const PDFDocument = require('pdfkit');
const ChitGroup = require('../models/ChitGroup');
const User = require('../models/User');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');

class ReportService {

  // Helper method to format currency
  formatCurrency(amount) {
    const value = amount || 0;
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Helper method to format date
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Helper method to add header to PDF
  addPDFHeader(doc, title, subtitle = null) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown(0.5);

    if (subtitle) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(subtitle, { align: 'center' })
        .moveDown(0.5);
    }

    doc
      .fontSize(10)
      .text(`Generated on: ${this.formatDate(new Date())}`, { align: 'center' })
      .moveDown(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(1);
  }

  // Helper method to add table to PDF
  addTable(doc, headers, rows, startY = null) {
    if (startY) doc.y = startY;

    const tableTop = doc.y;
    const colWidth = (500 / headers.length);
    const rowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(9);
    headers.forEach((header, i) => {
      doc.text(header, 50 + (i * colWidth), tableTop, { width: colWidth, align: 'left' });
    });

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    doc.font('Helvetica').fontSize(8);
    let currentY = tableTop + 20;

    rows.forEach((row, rowIndex) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;

        doc.font('Helvetica-Bold').fontSize(9);
        headers.forEach((header, i) => {
          doc.text(header, 50 + (i * colWidth), currentY, { width: colWidth, align: 'left' });
        });

        doc.moveTo(50, currentY + 15).lineTo(550, currentY + 15).stroke();
        currentY += 20;
        doc.font('Helvetica').fontSize(8);
      }

      row.forEach((cell, i) => {
        doc.text(String(cell), 50 + (i * colWidth), currentY, { width: colWidth, align: 'left' });
      });

      currentY += rowHeight;
    });

    doc.moveDown(2);
    return currentY;
  }

  // 1. Chit Group Summary Report
  async generateChitGroupSummary(chitGroupId) {
    const chitGroup = await ChitGroup.findById(chitGroupId).populate('members.memberId');
    if (!chitGroup) throw new Error('Chit group not found');

    const auctions = await Auction.find({ chitGroupId }).sort({ auctionNumber: 1 });
    const payments = await Payment.find({ chitGroupId });

    const totalCollected = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalOutstanding = payments.reduce((sum, p) => sum + (p.dueAmount - p.paidAmount), 0);
    const completedAuctions = auctions.filter(a => a.status === 'Closed').length;
    const totalCommission = auctions
      .filter(a => a.winnerId)
      .reduce((sum, a) => sum + (a.commissionAmount || 0), 0);

    return {
      chitGroup,
      auctions,
      summary: {
        totalMembers: chitGroup.members.length,
        totalValue: chitGroup.totalValue,
        monthlyContribution: chitGroup.monthlyContribution,
        totalDuration: chitGroup.numberOfMonths,
        completedAuctions,
        remainingAuctions: chitGroup.numberOfMonths - completedAuctions,
        totalCollected,
        totalOutstanding,
        totalCommission,
        status: chitGroup.status
      }
    };
  }

  async generateChitGroupSummaryPDF(chitGroupId) {
    const data = await this.generateChitGroupSummary(chitGroupId);
    const doc = new PDFDocument({ margin: 50 });

    this.addPDFHeader(doc, 'Chit Group Summary Report', data.chitGroup.name);

    doc.fontSize(12).font('Helvetica-Bold').text('Group Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${data.chitGroup.name}`);
    doc.text(`Total Value: ${this.formatCurrency(data.summary.totalValue)}`);
    doc.text(`Monthly Contribution: ${this.formatCurrency(data.summary.monthlyContribution)}`);
    doc.text(`Duration: ${data.summary.totalDuration} months`);
    doc.text(`Total Members: ${data.summary.totalMembers}`);
    doc.text(`Status: ${data.summary.status}`);
    doc.text(`Model Type: ${data.chitGroup.modelType}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Financial Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Collected: ${this.formatCurrency(data.summary.totalCollected)}`);
    doc.text(`Total Outstanding: ${this.formatCurrency(data.summary.totalOutstanding)}`);
    doc.text(`Total Commission: ${this.formatCurrency(data.summary.totalCommission)}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Auction Progress', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Completed Auctions: ${data.summary.completedAuctions}`);
    doc.text(`Remaining Auctions: ${data.summary.remainingAuctions}`);
    doc.moveDown(1);

    if (data.auctions.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Auction History', { underline: true });
      doc.moveDown(0.5);

      const headers = ['#', 'Date', 'Winner', 'Bid Amount', 'Commission'];
      const rows = data.auctions.filter(a => a.winnerId).map(auction => [
        auction.auctionNumber,
        this.formatDate(auction.scheduledDate),
        auction.winnerName || 'N/A',
        this.formatCurrency(auction.winningBid || 0),
        this.formatCurrency(auction.commissionAmount || 0)
      ]);

      this.addTable(doc, headers, rows);
    }

    return doc;
  }

  // 2. Member Statement Report
  async generateMemberStatement(memberId, chitGroupId) {
    const member = await User.findById(memberId);
    if (!member) throw new Error('Member not found');

    const chitGroup = await ChitGroup.findById(chitGroupId);
    if (!chitGroup) throw new Error('Chit group not found');

    const payments = await Payment.find({ memberId, chitGroupId }).sort({ auctionNumber: 1 });
    const auctions = await Auction.find({ chitGroupId, winnerId: memberId });

    let transactions = [];
    let balance = 0;

    payments.forEach(payment => {
      const debit = payment.dueAmount;
      const credit = payment.dividendReceived || 0;
      const net = debit - credit;
      balance += net - payment.paidAmount;

      transactions.push({
        date: payment.createdAt,
        auctionNumber: payment.auctionNumber,
        type: 'Payment',
        description: `Month ${payment.auctionNumber} contribution`,
        debit,
        credit,
        paidAmount: payment.paidAmount,
        balance
      });
    });

    const totalContributions = payments.reduce((sum, p) => sum + p.dueAmount, 0);
    const totalDividends = payments.reduce((sum, p) => sum + (p.dividendReceived || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const outstandingAmount = totalContributions - totalDividends - totalPaid;

    return {
      member,
      chitGroup,
      transactions,
      summary: {
        totalContributions,
        totalDividends,
        netContributions: totalContributions - totalDividends,
        totalPaid,
        outstandingAmount,
        auctionWon: auctions.length > 0 ? {
          auctionNumber: auctions[0].auctionNumber,
          bidAmount: auctions[0].winningBid,
          receivedAmount: auctions[0].amountToWinner,
          commissionPaid: auctions[0].commissionAmount
        } : null
      }
    };
  }

  async generateMemberStatementPDF(memberId, chitGroupId) {
    const data = await this.generateMemberStatement(memberId, chitGroupId);
    const doc = new PDFDocument({ margin: 50 });

    this.addPDFHeader(doc, 'Member Statement', `${data.member.name} - ${data.chitGroup.name}`);

    doc.fontSize(12).font('Helvetica-Bold').text('Member Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${data.member.name}`);
    doc.text(`Phone: ${data.member.phone}`);
    doc.text(`Email: ${data.member.email || 'N/A'}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Financial Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Contributions: ${this.formatCurrency(data.summary.totalContributions)}`);
    doc.text(`Total Dividends: ${this.formatCurrency(data.summary.totalDividends)}`);
    doc.text(`Net Contributions: ${this.formatCurrency(data.summary.netContributions)}`);
    doc.text(`Total Paid: ${this.formatCurrency(data.summary.totalPaid)}`);
    doc.text(`Outstanding Amount: ${this.formatCurrency(data.summary.outstandingAmount)}`);
    doc.moveDown(1);

    if (data.summary.auctionWon) {
      doc.fontSize(12).font('Helvetica-Bold').text('Auction Won', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Auction #${data.summary.auctionWon.auctionNumber}`);
      doc.text(`Bid Amount: ${this.formatCurrency(data.summary.auctionWon.bidAmount)}`);
      doc.text(`Received Amount: ${this.formatCurrency(data.summary.auctionWon.receivedAmount)}`);
      doc.text(`Commission Paid: ${this.formatCurrency(data.summary.auctionWon.commissionPaid)}`);
      doc.moveDown(1);
    }

    if (data.transactions.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Transaction History', { underline: true });
      doc.moveDown(0.5);

      const headers = ['Date', 'Month', 'Type', 'Debit', 'Credit', 'Paid', 'Balance'];
      const rows = data.transactions.map(txn => [
        this.formatDate(txn.date),
        txn.auctionNumber,
        txn.type,
        this.formatCurrency(txn.debit),
        this.formatCurrency(txn.credit),
        this.formatCurrency(txn.paidAmount),
        this.formatCurrency(txn.balance)
      ]);

      this.addTable(doc, headers, rows);
    }

    return doc;
  }

  // 3. Auction History Report
  async generateAuctionHistory(chitGroupId, fromDate = null, toDate = null) {
    const chitGroup = await ChitGroup.findById(chitGroupId);
    if (!chitGroup) throw new Error('Chit group not found');

    let query = { chitGroupId };
    if (fromDate || toDate) {
      query.scheduledDate = {};
      if (fromDate) query.scheduledDate.$gte = new Date(fromDate);
      if (toDate) query.scheduledDate.$lte = new Date(toDate);
    }

    const auctions = await Auction.find(query).sort({ auctionNumber: 1 });

    const totalAuctions = auctions.length;
    const completedAuctions = auctions.filter(a => a.status === 'Closed').length;
    const totalCommission = auctions
      .filter(a => a.winnerId)
      .reduce((sum, a) => sum + (a.commissionAmount || 0), 0);

    return {
      chitGroup,
      auctions,
      summary: {
        totalAuctions,
        completedAuctions,
        pendingAuctions: totalAuctions - completedAuctions,
        totalCommission
      }
    };
  }

  async generateAuctionHistoryPDF(chitGroupId, fromDate = null, toDate = null) {
    const data = await this.generateAuctionHistory(chitGroupId, fromDate, toDate);
    const doc = new PDFDocument({ margin: 50 });

    let subtitle = data.chitGroup.name;
    if (fromDate || toDate) {
      subtitle += ` (${fromDate ? this.formatDate(fromDate) : 'Start'} to ${toDate ? this.formatDate(toDate) : 'End'})`;
    }

    this.addPDFHeader(doc, 'Auction History Report', subtitle);

    doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Auctions: ${data.summary.totalAuctions}`);
    doc.text(`Completed Auctions: ${data.summary.completedAuctions}`);
    doc.text(`Pending Auctions: ${data.summary.pendingAuctions}`);
    doc.text(`Total Commission: ${this.formatCurrency(data.summary.totalCommission)}`);
    doc.moveDown(1);

    if (data.auctions.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Auction Details', { underline: true });
      doc.moveDown(0.5);

      const headers = ['#', 'Date', 'Time', 'Winner', 'Winning Bid', 'Commission', 'Status'];
      const rows = data.auctions.map(auction => [
        auction.auctionNumber,
        this.formatDate(auction.scheduledDate),
        auction.scheduledTime || 'N/A',
        auction.winnerName || 'N/A',
        auction.winningBid ? this.formatCurrency(auction.winningBid) : 'N/A',
        auction.commissionAmount ? this.formatCurrency(auction.commissionAmount) : 'N/A',
        auction.status
      ]);

      this.addTable(doc, headers, rows);
    }

    return doc;
  }

  // 4. Payment Collection Report
  async generatePaymentCollection(chitGroupId = null, fromDate = null, toDate = null) {
    let query = {};
    if (chitGroupId) query.chitGroupId = chitGroupId;
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const payments = await Payment.find(query)
      .populate('chitGroupId', 'name')
      .populate('memberId', 'name')
      .sort({ createdAt: -1 });

    const totalDue = payments.reduce((sum, p) => sum + p.dueAmount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalOutstanding = totalDue - totalPaid;
    const totalDividends = payments.reduce((sum, p) => sum + (p.dividendReceived || 0), 0);

    return {
      payments,
      summary: {
        totalPayments: payments.length,
        totalDue,
        totalPaid,
        totalOutstanding,
        totalDividends,
        collectionPercentage: totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(2) : 0
      }
    };
  }

  async generatePaymentCollectionPDF(chitGroupId = null, fromDate = null, toDate = null) {
    const data = await this.generatePaymentCollection(chitGroupId, fromDate, toDate);
    const doc = new PDFDocument({ margin: 50 });

    let subtitle = 'All Chit Groups';
    if (chitGroupId && data.payments.length > 0) {
      subtitle = data.payments[0].chitGroupId?.name || 'Chit Group';
    }
    if (fromDate || toDate) {
      subtitle += ` (${fromDate ? this.formatDate(fromDate) : 'Start'} to ${toDate ? this.formatDate(toDate) : 'End'})`;
    }

    this.addPDFHeader(doc, 'Payment Collection Report', subtitle);

    doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Payments: ${data.summary.totalPayments}`);
    doc.text(`Total Due: ${this.formatCurrency(data.summary.totalDue)}`);
    doc.text(`Total Paid: ${this.formatCurrency(data.summary.totalPaid)}`);
    doc.text(`Total Outstanding: ${this.formatCurrency(data.summary.totalOutstanding)}`);
    doc.text(`Total Dividends: ${this.formatCurrency(data.summary.totalDividends)}`);
    doc.text(`Collection Rate: ${data.summary.collectionPercentage}%`);
    doc.moveDown(1);

    if (data.payments.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Payment Details', { underline: true });
      doc.moveDown(0.5);

      const headers = ['Date', 'Member', 'Group', 'Month', 'Due', 'Paid', 'Status'];
      const rows = data.payments.map(payment => [
        this.formatDate(payment.createdAt),
        payment.memberId?.name || payment.memberName || 'N/A',
        payment.chitGroupId?.name || 'N/A',
        payment.auctionNumber,
        this.formatCurrency(payment.dueAmount),
        this.formatCurrency(payment.paidAmount),
        payment.paymentStatus
      ]);

      this.addTable(doc, headers, rows);
    }

    return doc;
  }

  // 5. Outstanding Payments Report
  async generateOutstandingPayments(chitGroupId = null) {
    let query = { paymentStatus: { $in: ['Pending', 'Partial', 'Overdue'] } };
    if (chitGroupId) query.chitGroupId = chitGroupId;

    const payments = await Payment.find(query)
      .populate('chitGroupId', 'name')
      .populate('memberId', 'name phone')
      .sort({ dueDate: 1 });

    const totalOutstanding = payments.reduce((sum, p) => sum + (p.dueAmount - p.paidAmount), 0);
    const overduePayments = payments.filter(p => p.paymentStatus === 'Overdue').length;
    const totalOverdueAmount = payments
      .filter(p => p.paymentStatus === 'Overdue')
      .reduce((sum, p) => sum + (p.dueAmount - p.paidAmount), 0);

    return {
      payments,
      summary: {
        totalOutstandingPayments: payments.length,
        totalOutstanding,
        overduePayments,
        totalOverdueAmount
      }
    };
  }

  async generateOutstandingPaymentsPDF(chitGroupId = null) {
    const data = await this.generateOutstandingPayments(chitGroupId);
    const doc = new PDFDocument({ margin: 50 });

    const subtitle = chitGroupId && data.payments.length > 0
      ? data.payments[0].chitGroupId?.name || 'Chit Group'
      : 'All Chit Groups';

    this.addPDFHeader(doc, 'Outstanding Payments Report', subtitle);

    doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Outstanding Payments: ${data.summary.totalOutstandingPayments}`);
    doc.text(`Total Outstanding Amount: ${this.formatCurrency(data.summary.totalOutstanding)}`);
    doc.text(`Overdue Payments: ${data.summary.overduePayments}`);
    doc.text(`Total Overdue Amount: ${this.formatCurrency(data.summary.totalOverdueAmount)}`);
    doc.moveDown(1);

    if (data.payments.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Outstanding Payment Details', { underline: true });
      doc.moveDown(0.5);

      const headers = ['Member', 'Phone', 'Group', 'Month', 'Due', 'Paid', 'Outstanding', 'Status'];
      const rows = data.payments.map(payment => [
        payment.memberId?.name || payment.memberName || 'N/A',
        payment.memberId?.phone || 'N/A',
        payment.chitGroupId?.name || 'N/A',
        payment.auctionNumber,
        this.formatCurrency(payment.dueAmount),
        this.formatCurrency(payment.paidAmount),
        this.formatCurrency(payment.dueAmount - payment.paidAmount),
        payment.paymentStatus
      ]);

      this.addTable(doc, headers, rows);
    }

    return doc;
  }

  // 6. Commission Report
  async generateCommissionReport(fromDate = null, toDate = null) {
    let query = { status: 'Closed', winnerId: { $exists: true } };
    if (fromDate || toDate) {
      query.scheduledDate = {};
      if (fromDate) query.scheduledDate.$gte = new Date(fromDate);
      if (toDate) query.scheduledDate.$lte = new Date(toDate);
    }

    const auctions = await Auction.find(query)
      .populate('chitGroupId', 'name')
      .sort({ scheduledDate: -1 });

    const totalCommission = auctions.reduce((sum, a) => sum + (a.commissionAmount || 0), 0);
    const totalAuctions = auctions.length;

    return {
      auctions,
      summary: {
        totalAuctions,
        totalCommission,
        averageCommission: totalAuctions > 0 ? totalCommission / totalAuctions : 0
      }
    };
  }

  async generateCommissionReportPDF(fromDate = null, toDate = null) {
    const data = await this.generateCommissionReport(fromDate, toDate);
    const doc = new PDFDocument({ margin: 50 });

    let subtitle = 'All Chit Groups';
    if (fromDate || toDate) {
      subtitle += ` (${fromDate ? this.formatDate(fromDate) : 'Start'} to ${toDate ? this.formatDate(toDate) : 'End'})`;
    }

    this.addPDFHeader(doc, 'Commission Report', subtitle);

    doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Auctions: ${data.summary.totalAuctions}`);
    doc.text(`Total Commission: ${this.formatCurrency(data.summary.totalCommission)}`);
    doc.text(`Average Commission: ${this.formatCurrency(data.summary.averageCommission)}`);
    doc.moveDown(1);

    if (data.auctions.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Commission Details', { underline: true });
      doc.moveDown(0.5);

      const headers = ['Date', 'Chit Group', 'Auction #', 'Winner', 'Winning Bid', 'Commission'];
      const rows = data.auctions.map(auction => [
        this.formatDate(auction.scheduledDate),
        auction.chitGroupId?.name || 'N/A',
        auction.auctionNumber,
        auction.winnerName || 'N/A',
        this.formatCurrency(auction.winningBid || 0),
        this.formatCurrency(auction.commissionAmount || 0)
      ]);

      this.addTable(doc, headers, rows);
    }

    return doc;
  }

  // 7. Complete Chit Report (Comprehensive)
  async generateCompleteChitReport(chitGroupId) {
    const chitGroup = await ChitGroup.findById(chitGroupId).populate('members.memberId');
    if (!chitGroup) throw new Error('Chit group not found');

    const auctions = await Auction.find({ chitGroupId }).sort({ auctionNumber: 1 });
    const payments = await Payment.find({ chitGroupId })
      .populate('memberId', 'name phone')
      .sort({ auctionNumber: 1 });

    const totalCollected = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalOutstanding = payments.reduce((sum, p) => sum + (p.dueAmount - p.paidAmount), 0);
    const totalCommission = auctions
      .filter(a => a.winnerId)
      .reduce((sum, a) => sum + (a.commissionAmount || 0), 0);
    const completedAuctions = auctions.filter(a => a.status === 'Closed').length;

    return {
      chitGroup,
      auctions,
      payments,
      summary: {
        totalMembers: chitGroup.members.length,
        totalValue: chitGroup.chitAmount,
        monthlyContribution: chitGroup.monthlyContribution,
        duration: chitGroup.duration,
        completedAuctions,
        remainingAuctions: chitGroup.duration - completedAuctions,
        totalCollected,
        totalOutstanding,
        totalCommission,
        status: chitGroup.status
      }
    };
  }

  async generateCompleteChitReportPDF(chitGroupId) {
    const data = await this.generateCompleteChitReport(chitGroupId);
    const doc = new PDFDocument({ margin: 50 });

    this.addPDFHeader(doc, 'Complete Chit Report', data.chitGroup.name);

    doc.fontSize(14).font('Helvetica-Bold').text('CHIT GROUP OVERVIEW', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${data.chitGroup.name}`);
    doc.text(`Payment Model: ${data.chitGroup.winnerPaymentModel}`);
    doc.text(`Total Value: ${this.formatCurrency(data.summary.totalValue)}`);
    doc.text(`Monthly Contribution: ${this.formatCurrency(data.summary.monthlyContribution)}`);
    doc.text(`Duration: ${data.summary.duration} months`);
    doc.text(`Total Members: ${data.summary.totalMembers}`);
    doc.text(`Status: ${data.summary.status}`);
    doc.text(`Start Date: ${this.formatDate(data.chitGroup.startDate)}`);
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('FINANCIAL SUMMARY', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Collected: ${this.formatCurrency(data.summary.totalCollected)}`);
    doc.text(`Total Outstanding: ${this.formatCurrency(data.summary.totalOutstanding)}`);
    doc.text(`Total Commission: ${this.formatCurrency(data.summary.totalCommission)}`);
    doc.text(`Completed Auctions: ${data.summary.completedAuctions} / ${data.summary.duration}`);
    doc.moveDown(1);

    if (data.chitGroup.members.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('MEMBER LIST', { underline: true });
      doc.moveDown(0.5);

      const memberHeaders = ['#', 'Name', 'Phone', 'Status'];
      const memberRows = data.chitGroup.members.map((member, idx) => [
        idx + 1,
        member.memberId?.name || 'N/A',
        member.memberId?.phone || 'N/A',
        member.hasWon ? 'Won' : 'Active'
      ]);

      this.addTable(doc, memberHeaders, memberRows);
    }

    if (data.auctions.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('AUCTION HISTORY', { underline: true });
      doc.moveDown(0.5);

      const auctionHeaders = ['#', 'Date', 'Winner', 'Winning Bid', 'Commission', 'Status'];
      const auctionRows = data.auctions.map(auction => [
        auction.auctionNumber,
        this.formatDate(auction.scheduledDate),
        auction.winnerName || 'N/A',
        auction.winningBid ? this.formatCurrency(auction.winningBid) : 'N/A',
        auction.commissionAmount ? this.formatCurrency(auction.commissionAmount) : 'N/A',
        auction.status
      ]);

      this.addTable(doc, auctionHeaders, auctionRows);
    }

    if (data.payments.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT COLLECTION DETAILS', { underline: true });
      doc.moveDown(0.5);

      const paymentHeaders = ['Member', 'Month', 'Due', 'Paid', 'Outstanding', 'Status'];
      const paymentRows = data.payments.map(payment => [
        payment.memberId?.name || payment.memberName || 'N/A',
        payment.auctionNumber,
        this.formatCurrency(payment.dueAmount),
        this.formatCurrency(payment.paidAmount),
        this.formatCurrency(payment.dueAmount - payment.paidAmount),
        payment.paymentStatus
      ]);

      this.addTable(doc, paymentHeaders, paymentRows);
    }

    return doc;
  }
}

module.exports = new ReportService();
