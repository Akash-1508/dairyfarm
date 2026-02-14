const { z } = require("zod");
const { getAllMilkTransactions, addMilkTransaction, getMilkTransactionById, updateMilkTransaction: updateMilkTransactionModel, deleteMilkTransaction } = require("../models");

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
  amountReceived: z.number().nonnegative().optional()
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

const createMilkSale = async (req, res) => {
  const parsed = milkTxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  try {
    // Normalize phone numbers (trim whitespace)
    const normalizedData = {
      ...parsed.data,
      buyerPhone: parsed.data.buyerPhone?.trim() || undefined,
      sellerPhone: parsed.data.sellerPhone?.trim() || undefined,
    };
    const tx = await addMilkTransaction({ type: "sale", ...normalizedData });
    return res.status(201).json(tx);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create milk sale" });
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
  
  console.log("[milk] Update request received:", { id, body: req.body });
  
  if (!id) {
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

module.exports = {
  listMilkTransactions,
  createMilkSale,
  createMilkPurchase,
  updateMilkTransaction,
  deleteMilkTransactionRecord,
};

