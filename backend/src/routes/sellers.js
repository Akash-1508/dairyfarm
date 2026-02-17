const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { listSellers } = require("../controllers/sellers.controller");

const router = Router();

router.get("/", requireAuth, listSellers);

module.exports = { router };
