const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerMobile: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentType: {
    type: String,
    enum: ["cash", "bank_transfer", "upi", "other"],
    required: true,
    default: "cash"
  },
  notes: {
    type: String,
    required: false,
    trim: true
  },
  referenceNumber: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  toJSON: {
    transform: function(doc, ret) {
      ret._id = ret._id.toString();
      ret.customerId = ret.customerId.toString();
      return ret;
    }
  }
});

// Indexes for efficient queries
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ customerMobile: 1 });
PaymentSchema.index({ paymentDate: -1 });

const Payment = mongoose.model('Payment', PaymentSchema);

async function createPayment(paymentData) {
  const payment = new Payment(paymentData);
  return await payment.save();
}

async function getAllPayments(customerId = null, customerMobile = null) {
  const query = {};
  if (customerId) {
    query.customerId = customerId;
  }
  if (customerMobile) {
    query.customerMobile = customerMobile.trim();
  }
  return await Payment.find(query).sort({ paymentDate: -1 });
}

async function getPaymentById(paymentId) {
  return await Payment.findById(paymentId);
}

async function updatePayment(paymentId, updates) {
  return await Payment.findByIdAndUpdate(
    paymentId,
    { $set: updates },
    { new: true }
  );
}

async function deletePayment(paymentId) {
  return await Payment.findByIdAndDelete(paymentId);
}

async function getTotalPaymentsByCustomer(customerId) {
  const result = await Payment.aggregate([
    { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
}

module.exports = {
  Payment,
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  getTotalPaymentsByCustomer,
};

