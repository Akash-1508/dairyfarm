const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { listBuyers, updateBuyer } = require("../controllers/buyers.controller");

const router = Router();

router.get("/", requireAuth, listBuyers);
router.patch("/:id", requireAuth, updateBuyer);

module.exports = { router };

