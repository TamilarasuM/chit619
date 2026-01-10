const mongoose = require('mongoose');

const PartialPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque'],
    required: true
  },
  referenceNumber: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    maxlength: 200
  }
}, { _id: true, timestamps: true });

const PaymentSchema = new mongoose.Schema({
  chitGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChitGroup',
    required: [true, 'Chit group is required']
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Member is required']
  },
  memberName: {
    type: String,
    required: true
  },
  auctionNumber: {
    type: Number,
    required: [true, 'Auction number is required'],
    min: 1
  },

  // Amount Details
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  baseAmount: {
    type: Number,
    required: [true, 'Base amount is required'],
    min: 0
  },
  dividendReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  dueAmount: {
    type: Number,
    required: [true, 'Due amount is required'],
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid', 'Overdue'],
    default: 'Pending'
  },
  paidDate: {
    type: Date,
    default: null
  },
  isOnTime: {
    type: Boolean,
    default: false
  },

  // Delay Tracking
  gracePeriodDays: {
    type: Number,
    default: 0,
    min: 0
  },
  gracePeriodUsed: {
    type: Boolean,
    default: false
  },
  delayDays: {
    type: Number,
    default: 0,
    min: 0
  },

  // Partial Payments
  partialPayments: [PartialPaymentSchema],

  // Winner Special Fields
  isWinner: {
    type: Boolean,
    default: false
  },
  commissionAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  amountReceived: {
    type: Number,
    default: 0,
    min: 0
  },

  // Payment Details
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Not Paid'],
    default: 'Not Paid'
  },
  referenceNumber: {
    type: String,
    default: null
  },
  receiptNumber: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    maxlength: 500
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
PaymentSchema.index({ chitGroupId: 1, auctionNumber: 1 });
PaymentSchema.index({ memberId: 1, paymentStatus: 1 });
PaymentSchema.index({ dueDate: 1, paymentStatus: 1 });
PaymentSchema.index({ chitGroupId: 1, memberId: 1, auctionNumber: 1 }, { unique: true });

// Calculate outstanding balance before saving
PaymentSchema.pre('save', function(next) {
  this.outstandingBalance = Math.max(0, this.dueAmount - this.paidAmount);

  // Update payment status based on amounts
  if (this.paidAmount === 0) {
    // Check if overdue
    const now = new Date();
    const graceEndDate = new Date(this.dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + this.gracePeriodDays);

    if (now > graceEndDate) {
      this.paymentStatus = 'Overdue';
    } else {
      this.paymentStatus = 'Pending';
    }
  } else if (this.paidAmount < this.dueAmount) {
    this.paymentStatus = 'Partial';
  } else {
    this.paymentStatus = 'Paid';
  }

  next();
});

// Method to record a payment
PaymentSchema.methods.recordPayment = async function(amount, paymentMethod, referenceNumber, recordedBy, notes = null) {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  if (amount > this.outstandingBalance) {
    throw new Error(`Payment amount exceeds outstanding balance of ₹${this.outstandingBalance}`);
  }

  // Add to partial payments if it's a partial payment
  if (amount < this.dueAmount || this.partialPayments.length > 0) {
    this.partialPayments.push({
      amount,
      date: Date.now(),
      recordedBy,
      paymentMethod,
      referenceNumber,
      notes
    });
  }

  // Update paid amount
  this.paidAmount += amount;

  // If fully paid, set paid date
  if (this.paidAmount >= this.dueAmount) {
    this.paidDate = Date.now();
    this.paymentStatus = 'Paid';
    this.paymentMethod = paymentMethod;
    this.referenceNumber = referenceNumber;

    // Check if payment is on time
    const paymentDate = new Date();
    const dueDate = new Date(this.dueDate);
    this.isOnTime = paymentDate.toDateString() === dueDate.toDateString();
  } else {
    this.paymentStatus = 'Partial';
  }

  this.recordedBy = recordedBy;
  if (notes) {
    this.notes = notes;
  }

  await this.save();
  return this;
};

// Method to calculate delay days
PaymentSchema.methods.calculateDelayDays = function() {
  if (this.paymentStatus === 'Paid') {
    const paidDate = new Date(this.paidDate);
    const dueDate = new Date(this.dueDate);
    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + this.gracePeriodDays);

    if (paidDate > graceEndDate) {
      const diffTime = Math.abs(paidDate - graceEndDate);
      this.delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.gracePeriodUsed = true;
    } else if (paidDate > dueDate) {
      this.gracePeriodUsed = true;
      this.delayDays = 0;
    } else {
      this.gracePeriodUsed = false;
      this.delayDays = 0;
    }
  } else {
    // For pending/partial/overdue payments, calculate from current date
    const now = new Date();
    const dueDate = new Date(this.dueDate);
    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + this.gracePeriodDays);

    if (now > graceEndDate) {
      const diffTime = Math.abs(now - graceEndDate);
      this.delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.gracePeriodUsed = true;
      this.paymentStatus = 'Overdue';
    } else if (now > dueDate) {
      this.gracePeriodUsed = true;
      this.delayDays = 0;
    }
  }

  return this.delayDays;
};

// Method to update payment status based on current date
PaymentSchema.methods.updatePaymentStatus = function() {
  if (this.paymentStatus !== 'Paid') {
    const now = new Date();
    const dueDate = new Date(this.dueDate);
    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + this.gracePeriodDays);

    if (now > graceEndDate) {
      this.paymentStatus = 'Overdue';
      this.calculateDelayDays();
    }
  }

  return this.paymentStatus;
};

// Virtual for grace period end date
PaymentSchema.virtual('gracePeriodEndDate').get(function() {
  const graceEndDate = new Date(this.dueDate);
  graceEndDate.setDate(graceEndDate.getDate() + this.gracePeriodDays);
  return graceEndDate;
});

// Ensure virtuals are included in JSON
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Payment', PaymentSchema);
