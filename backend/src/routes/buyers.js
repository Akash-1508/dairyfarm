const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { listBuyers } = require("../controllers/buyers.controller");

const router = Router();

router.get("/", requireAuth, listBuyers);

module.exports = { router };

