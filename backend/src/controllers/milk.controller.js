const { z } = require("zod");
const { getAllMilkTransactions, addMilkTransaction } = require("../models");

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

module.exports = {
  listMilkTransactions,
  createMilkSale,
  createMilkPurchase,
};

