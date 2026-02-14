const { Router } = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listPayments,
  createPaymentRecord,
  getPayment,
  updatePaymentRecord,
  deletePaymentRecord,
} = require("../controllers/payments.controller");

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// GET /payments - List all payments (with optional filters)
router.get("/", listPayments);

// POST /payments - Create a new payment
router.post("/", createPaymentRecord);

// GET /payments/:id - Get a specific payment
router.get("/:id", getPayment);

// PATCH /payments/:id - Update a payment
router.patch("/:id", updatePaymentRecord);

// DELETE /payments/:id - Delete a payment
router.delete("/:id", deletePaymentRecord);

module.exports = { router };

