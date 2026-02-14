const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { 
  createMilkPurchase, 
  createMilkSale, 
  listMilkTransactions,
  updateMilkTransaction,
  deleteMilkTransactionRecord
} = require("../controllers/milk.controller");

const router = Router();

router.get("/", requireAuth, listMilkTransactions);
router.post("/sale", requireAuth, createMilkSale);
router.post("/purchase", requireAuth, createMilkPurchase);
router.patch("/:id", requireAuth, updateMilkTransaction);
router.delete("/:id", requireAuth, deleteMilkTransactionRecord);

module.exports = { router };

