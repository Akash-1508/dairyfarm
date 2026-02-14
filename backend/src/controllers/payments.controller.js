const { z } = require("zod");
const { createPayment, getAllPayments, getPaymentById, updatePayment, deletePayment } = require("../models/payments");
const { User } = require("../models/users");

const paymentSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerMobile: z.string().regex(/^[0-9]{10}$/, "Mobile must be exactly 10 digits"),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().datetime().optional(),
  paymentType: z.enum(["cash", "bank_transfer", "upi", "other"]).optional().default("cash"),
  notes: z.string().optional(),
  referenceNumber: z.string().optional(),
});

const listPayments = async (req, res) => {
  try {
    const { customerId, customerMobile } = req.query;
    
    // If user is Consumer (role 2), only show their own payments
    const user = req.user;
    let filterCustomerId = customerId;
    let filterCustomerMobile = customerMobile;
    
    if (user && user.role === 2) {
      // Consumer can only see their own payments
      filterCustomerId = user.userId || user.id;
    }
    
    const payments = await getAllPayments(filterCustomerId, filterCustomerMobile);
    return res.json(payments);
  } catch (error) {
    console.error("[payments] Error fetching payments:", error);
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
};

const createPaymentRecord = async (req, res) => {
  try {
    const validation = paymentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validation.error.errors 
      });
    }

    const data = validation.data;
    
    // Verify customer exists
    const customer = await User.findById(data.customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Use customer's actual name and mobile from database
    const paymentData = {
      customerId: data.customerId,
      customerName: customer.name || data.customerName,
      customerMobile: customer.mobile || data.customerMobile,
      amount: data.amount,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      paymentType: data.paymentType || "cash",
      notes: data.notes || "",
      referenceNumber: data.referenceNumber || "",
    };

    const payment = await createPayment(paymentData);
    return res.status(201).json(payment);
  } catch (error) {
    console.error("[payments] Error creating payment:", error);
    return res.status(500).json({ error: "Failed to create payment" });
  }
};

const getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await getPaymentById(id);
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Check if user has permission to view this payment
    const user = req.user;
    if (user && user.role === 2) {
      // Consumer can only see their own payments
      const customerId = user.userId || user.id;
      if (payment.customerId.toString() !== customerId.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    return res.json(payment);
  } catch (error) {
    console.error("[payments] Error fetching payment:", error);
    return res.status(500).json({ error: "Failed to fetch payment" });
  }
};

const updatePaymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await getPaymentById(id);
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Check permissions
    const user = req.user;
    if (user && user.role === 2) {
      return res.status(403).json({ error: "Consumers cannot update payments" });
    }

    const updates = {};
    if (req.body.amount !== undefined) updates.amount = req.body.amount;
    if (req.body.paymentDate !== undefined) updates.paymentDate = new Date(req.body.paymentDate);
    if (req.body.paymentType !== undefined) updates.paymentType = req.body.paymentType;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.referenceNumber !== undefined) updates.referenceNumber = req.body.referenceNumber;

    const updated = await updatePayment(id, updates);
    return res.json(updated);
  } catch (error) {
    console.error("[payments] Error updating payment:", error);
    return res.status(500).json({ error: "Failed to update payment" });
  }
};

const deletePaymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await getPaymentById(id);
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Check permissions
    const user = req.user;
    if (user && user.role === 2) {
      return res.status(403).json({ error: "Consumers cannot delete payments" });
    }

    await deletePayment(id);
    return res.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("[payments] Error deleting payment:", error);
    return res.status(500).json({ error: "Failed to delete payment" });
  }
};

module.exports = {
  listPayments,
  createPaymentRecord,
  getPayment,
  updatePaymentRecord,
  deletePaymentRecord,
};

