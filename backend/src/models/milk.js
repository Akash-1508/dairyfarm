const mongoose = require("mongoose");

const MilkTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["sale", "purchase"],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerLiter: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  buyer: {
    type: String,
    required: false,
    trim: true
  },
  buyerPhone: {
    type: String,
    required: false,
    trim: true
  },
  seller: {
    type: String,
    required: false,
    trim: true
  },
  sellerPhone: {
    type: String,
    required: false,
    trim: true
  },
  notes: {
    type: String,
    required: false,
    trim: true
  },
  fixedPrice: {
    type: Number,
    required: false,
    min: 0
  },
  paymentType: {
    type: String,
    enum: ["cash", "credit"],
    required: false,
    default: "cash",
    trim: true
  },
  amountReceived: {
    type: Number,
    required: false,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret._id = ret._id.toString();
      return ret;
    }
  }
});

// Indexes for filtering
MilkTransactionSchema.index({ buyerPhone: 1 });
MilkTransactionSchema.index({ sellerPhone: 1 });
MilkTransactionSchema.index({ date: -1 });

const MilkTransaction = mongoose.model('MilkTransaction', MilkTransactionSchema);

async function getAllMilkTransactions(mobileNumber) {
  let query = {};
  if (mobileNumber) {
    query = {
      $or: [
        { buyerPhone: mobileNumber },
        { sellerPhone: mobileNumber }
      ]
    };
  }
  
  const transactions = await MilkTransaction.find(query).sort({ date: -1 });
  return transactions;
}

async function addMilkTransaction(transactionData) {
  const transaction = new MilkTransaction(transactionData);
  return await transaction.save();
}

module.exports = {
  MilkTransaction,
  getAllMilkTransactions,
  addMilkTransaction,
};
