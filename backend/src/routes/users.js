const { Router } = require("express");
const { getUsers, updateUser } = require("../controllers/users.controller");
const { requireAuth, requireAdminOrSuperAdmin } = require("../middleware/auth");

const router = Router();

router.get("/check", (_req, res) => res.json({ ok: true, message: "users route is working" }));
// Get users by role (requires authentication)
router.get("/", requireAuth, getUsers);

// Update user (only super_admin and admin) - support both PATCH and PUT
router.patch("/:id", requireAuth, requireAdminOrSuperAdmin, updateUser);
router.put("/:id", requireAuth, requireAdminOrSuperAdmin, updateUser);

module.exports = { router };

