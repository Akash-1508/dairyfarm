const mongoose = require("mongoose");

const PaymentLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["payment_created", "payment_updated", "payment_deleted", "milk_paid", "milk_unpaid"],
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: false
  },
  milkTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MilkTransaction',
    required: false
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  customerName: {
    type: String,
    required: false,
    trim: true
  },
  customerMobile: {
    type: String,
    required: false,
    trim: true
  },
  amount: {
    type: Number,
    required: false,
    min: 0
  },
  milkQuantity: {
    type: Number,
    required: false,
    min: 0
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  performedByName: {
    type: String,
    required: false,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  toJSON: {
    transform: function(doc, ret) {
      ret._id = ret._id.toString();
      if (ret.paymentId) ret.paymentId = ret.paymentId.toString();
      if (ret.milkTransactionId) ret.milkTransactionId = ret.milkTransactionId.toString();
      if (ret.customerId) ret.customerId = ret.customerId.toString();
      if (ret.performedBy) ret.performedBy = ret.performedBy.toString();
      return ret;
    }
  }
});

// Indexes for efficient queries
PaymentLogSchema.index({ createdAt: -1 });
PaymentLogSchema.index({ customerId: 1 });
PaymentLogSchema.index({ paymentId: 1 });
PaymentLogSchema.index({ milkTransactionId: 1 });
PaymentLogSchema.index({ action: 1 });

const PaymentLog = mongoose.model('PaymentLog', PaymentLogSchema);

async function createPaymentLog(logData) {
  const log = new PaymentLog(logData);
  return await log.save();
}

async function getPaymentLogs(filters = {}) {
  const query = {};
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.paymentId) query.paymentId = filters.paymentId;
  if (filters.milkTransactionId) query.milkTransactionId = filters.milkTransactionId;
  if (filters.action) query.action = filters.action;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }
  
  return await PaymentLog.find(query).sort({ createdAt: -1 }).limit(filters.limit || 100);
}

module.exports = {
  PaymentLog,
  createPaymentLog,
  getPaymentLogs,
};

