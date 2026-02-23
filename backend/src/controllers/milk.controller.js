const { z } = require("zod");
const {
  getAllMilkTransactions,
  getMilkRequests,
  addMilkTransaction,
  getMilkTransactionById,
  updateMilkTransaction: updateMilkTransactionModel,
  deleteMilkTransaction,
  getUnpaidMilkTransactions: getUnpaidMilkTransactionsModel,
  findUserByMobile,
  createPayment,
  createPaymentLog,
  createNotification,
  MilkTransaction,
  findBuyerByUserId,
} = require("../models");

/** Start of today 00:00:00 in India (IST, UTC+5:30) so quick sale date matches Indian calendar day regardless of server timezone. */
function getStartOfTodayIST() {
  const now = new Date();
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth();
  const d = istNow.getUTCDate();
  return new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);
}

const milkTxSchema = z.object({
  date: z.string().datetime(),
  quantity: z.number().nonnegative(),
  pricePerLiter: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  buyer: z.string().optional(),
  buyerPhone: z.string().optional(),
  seller: z.string().optional(),
  sellerPhone: z.string().optional(),
  notes: z.string().optional(),
  fixedPrice: z.number().nonnegative().optional(),
  paymentType: z.enum(["cash", "credit"]).optional(),
  amountReceived: z.number().nonnegative().optional(),
  milkSource: z.enum(["cow", "buffalo", "sheep", "goat"]).optional()
});

const listMilkTransactions = async (req, res) => {
  try {
    // If user is Consumer (role 2), filter by their mobile number
    const user = req.user;
    let mobileNumber;
    
    if (user && user.role === 2) {
      // Consumer can only see their own transactions
      // Normalize mobile number (trim whitespace) for consistent matching
      mobileNumber = user.mobile?.trim();
    }
    
    const transactions = await getAllMilkTransactions(mobileNumber);
    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch milk transactions" });
  }
};

/** Admin only: list milk requests from buyer app (requestSource === 'buyer_app') */
const listMilkRequests = async (req, res) => {
  try {
    const requests = await getMilkRequests();
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch milk requests" });
  }
};

const createMilkSale = async (req, res) => {
  const parsed = milkTxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const normalizedData = {
      ...parsed.data,
      buyerPhone: parsed.data.buyerPhone?.trim() || undefined,
      sellerPhone: parsed.data.sellerPhone?.trim() || undefined,
    };
    const requestSource = req.user?.role === 2 ? "buyer_app" : "admin";
    const tx = await addMilkTransaction({ type: "sale", requestSource, ...normalizedData });

    if (requestSource === "buyer_app") {
      await createNotification({
        type: "milk_request",
        message: `${normalizedData.buyer || "Buyer"} requested ${(normalizedData.quantity || 0).toFixed(2)} L milk`,
        data: {
          buyerName: normalizedData.buyer,
          buyerPhone: normalizedData.buyerPhone,
          quantity: normalizedData.quantity,
          milkTransactionId: tx._id,
        },
        forRole: 0,
      });
    }

    const amountReceived = Number(normalizedData.amountReceived);
    const buyerPhone = normalizedData.buyerPhone;

    if (amountReceived > 0 && buyerPhone) {
      const buyerUser = await findUserByMobile(buyerPhone);
      if (buyerUser) {
        const payment = await createPayment({
          customerId: buyerUser._id,
          customerName: buyerUser.name || (normalizedData.buyer || "Buyer"),
          customerMobile: buyerPhone,
          amount: amountReceived,
          paymentDate: tx.date || new Date(),
          paymentType: "cash",
          paymentDirection: "from_buyer",
          milkTransactionIds: [tx._id],
          milkQuantity: tx.quantity || 0,
          notes: `Paid at milk sale · ${(tx.quantity || 0).toFixed(2)} L`,
        });

        await createPaymentLog({
          action: "payment_created",
          paymentId: payment._id,
          customerId: buyerUser._id,
          customerName: buyerUser.name,
          customerMobile: buyerPhone,
          amount: amountReceived,
          milkTransactionId: tx._id,
          milkQuantity: tx.quantity,
          description: `Payment of ₹${amountReceived} received at milk sale (${(tx.quantity || 0).toFixed(2)} L)`,
          performedBy: req.user?.userId || req.user?.id,
          performedByName: req.user?.name || "System",
          metadata: { source: "milk_sale" },
        });
        await createPaymentLog({
          action: "milk_paid",
          paymentId: payment._id,
          milkTransactionId: tx._id,
          customerId: buyerUser._id,
          customerName: buyerUser.name,
          customerMobile: buyerPhone,
          amount: amountReceived,
          milkQuantity: tx.quantity,
          description: `Milk sale paid: ${(tx.quantity || 0).toFixed(2)} L for ₹${amountReceived}`,
          performedBy: req.user?.userId || req.user?.id,
          performedByName: req.user?.name || "System",
        });

        await MilkTransaction.findByIdAndUpdate(tx._id, {
          $push: { paymentIds: payment._id },
        });
      }
    }

    return res.status(201).json(tx);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create milk sale" });
  }
};

const quickSaleSchema = z.object({
  buyerMobile: z.string().min(10).max(10).regex(/^[0-9]+$/),
  quantity: z.number().positive().optional(),
  pricePerLiter: z.number().nonnegative().optional(),
});

/**
 * Quick Sale: record today's delivery for a buyer using their set rate/quantity.
 * POST body: { buyerMobile } for "Delivered" (use buyer's set quantity & rate),
 * or { buyerMobile, quantity?, pricePerLiter? } for "Custom Delivered".
 */
const createQuickSale = async (req, res) => {
  const parsed = quickSaleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const buyerMobile = parsed.data.buyerMobile.trim();
  let quantity = parsed.data.quantity;
  let pricePerLiter = parsed.data.pricePerLiter;

  try {
    const user = await findUserByMobile(buyerMobile);
    if (!user) return res.status(404).json({ error: "Buyer not found for this mobile number." });

    const buyer = await findBuyerByUserId(user._id);
    if (!buyer) return res.status(404).json({ error: "Buyer profile not found." });

    if (quantity == null || quantity <= 0) quantity = Number(buyer.quantity) || 0;
    if (pricePerLiter == null || pricePerLiter < 0) pricePerLiter = Number(buyer.rate) || 0;
    if (!quantity || !pricePerLiter) {
      return res.status(400).json({
        error: "Set buyer's daily quantity and rate first, or pass quantity and pricePerLiter.",
      });
    }

    const totalAmount = Math.round(quantity * pricePerLiter * 100) / 100;
    const today = getStartOfTodayIST();

    const payload = {
      date: today.toISOString(),
      quantity,
      pricePerLiter,
      totalAmount,
      buyer: user.name || buyer.name,
      buyerPhone: buyerMobile,
      paymentType: "credit",
      notes: "Quick sale",
    };

    const tx = await addMilkTransaction({ type: "sale", ...payload });
    return res.status(201).json(tx);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to create quick sale" });
  }
};

const createMilkPurchase = async (req, res) => {
  const parsed = milkTxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  try {
    // Normalize phone numbers (trim whitespace)
    const normalizedData = {
      ...parsed.data,
      buyerPhone: parsed.data.buyerPhone?.trim() || undefined,
      sellerPhone: parsed.data.sellerPhone?.trim() || undefined,
    };
    const tx = await addMilkTransaction({ type: "purchase", ...normalizedData });
    return res.status(201).json(tx);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create milk purchase" });
  }
};

const updateMilkTransaction = async (req, res) => {
  const { id } = req.params;
  
  console.log("[milk] Update request received:", { 
    id, 
    idType: typeof id,
    url: req.url,
    method: req.method,
    body: req.body 
  });
  
  if (!id) {
    console.error("[milk] No ID provided in request");
    return res.status(400).json({ error: "Transaction ID is required" });
  }

  const parsed = milkTxSchema.safeParse(req.body);
  
  if (!parsed.success) {
    console.error("[milk] Validation error:", parsed.error.flatten());
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  try {
    // Check if transaction exists
    const existingTx = await getMilkTransactionById(id);
    if (!existingTx) {
      console.log("[milk] Transaction not found:", id);
      return res.status(404).json({ error: "Transaction not found" });
    }

    console.log("[milk] Found transaction:", existingTx._id);

    // Check permissions - Consumers can only update their own transactions
    const user = req.user;
    if (user && user.role === 2) {
      const userMobile = user.mobile?.trim();
      const isOwner = 
        (existingTx.buyerPhone?.trim() === userMobile) ||
        (existingTx.sellerPhone?.trim() === userMobile);
      
      if (!isOwner) {
        return res.status(403).json({ error: "You can only update your own transactions" });
      }
    }

    // Normalize phone numbers (trim whitespace)
    const normalizedData = {
      ...parsed.data,
      buyerPhone: parsed.data.buyerPhone?.trim() || undefined,
      sellerPhone: parsed.data.sellerPhone?.trim() || undefined,
    };

    // Preserve the transaction type - don't update it
    const updatedTx = await updateMilkTransactionModel(id, normalizedData);
    
    if (!updatedTx) {
      console.error("[milk] Update returned null");
      return res.status(500).json({ error: "Failed to update transaction" });
    }
    
    console.log("[milk] Transaction updated successfully:", updatedTx._id);
    return res.json(updatedTx);
  } catch (error) {
    console.error("[milk] Error updating transaction:", error);
    console.error("[milk] Error stack:", error.stack);
    return res.status(500).json({ error: "Failed to update transaction", message: error.message });
  }
};

const deleteMilkTransactionRecord = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if transaction exists
    const existingTx = await getMilkTransactionById(id);
    if (!existingTx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check permissions - Consumers can only delete their own transactions
    const user = req.user;
    if (user && user.role === 2) {
      const userMobile = user.mobile?.trim();
      const isOwner = 
        (existingTx.buyerPhone?.trim() === userMobile) ||
        (existingTx.sellerPhone?.trim() === userMobile);
      
      if (!isOwner) {
        return res.status(403).json({ error: "You can only delete your own transactions" });
      }
    }

    await deleteMilkTransaction(id);
    return res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("[milk] Error deleting transaction:", error);
    return res.status(500).json({ error: "Failed to delete transaction" });
  }
};

const getUnpaidMilkTransactions = async (req, res) => {
  try {
    const { customerMobile, customerId } = req.query;
    const user = req.user;
    
    // If user is Consumer (role 2), only show their own unpaid transactions
    let filterMobile = customerMobile;
    let filterCustomerId = customerId;
    
    if (user && user.role === 2) {
      filterMobile = user.mobile?.trim();
      filterCustomerId = user.userId || user.id;
    }
    
    if (!filterMobile && !filterCustomerId) {
      return res.status(400).json({ error: "customerMobile or customerId is required" });
    }
    
    const transactions = await getUnpaidMilkTransactionsModel(filterMobile, filterCustomerId);
    return res.json(transactions);
  } catch (error) {
    console.error("[milk] Error fetching unpaid transactions:", error);
    return res.status(500).json({ error: "Failed to fetch unpaid transactions" });
  }
};

module.exports = {
  listMilkTransactions,
  listMilkRequests,
  createMilkSale,
  createQuickSale,
  createMilkPurchase,
  updateMilkTransaction,
  deleteMilkTransactionRecord,
  getUnpaidMilkTransactions,
};

