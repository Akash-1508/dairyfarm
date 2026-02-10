const { getUsersByRole, updateUser: updateUserModel, User, UserRoles } = require("../models/users");
const { findBuyerByUserId, updateBuyer } = require("../models/buyers");

/**
 * Get users by role
 * GET /users?role=2
 */
const getUsers = async (req, res) => {
  try {
    const roleParam = req.query.role;
    
    if (!roleParam) {
      return res.status(400).json({ error: "Role parameter is required" });
    }

    const role = parseInt(roleParam, 10);
    
    if (isNaN(role) || (role !== 0 && role !== 1 && role !== 2)) {
      return res.status(400).json({ error: "Invalid role. Must be 0, 1, or 2" });
    }

    const users = await getUsersByRole(role);
    
    console.log(`[users] Controller: Found ${users.length} users with role ${role}`);
    
    // Remove passwordHash from response
    const safeUsers = users.map(({ passwordHash, ...user }) => ({
      ...user,
      _id: user._id?.toString(),
    }));

    console.log(`[users] Controller: Returning ${safeUsers.length} safe users`);
    return res.json(safeUsers);
  } catch (error) {
    console.error("[users] Error fetching users:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};

const updateUser = async (req, res) => {
  const userId = req.params.id;
  console.log("[users] PATCH /users/:id hit, userId:", userId);
  try {
    const body = req.body || {};
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.mobile !== undefined) updates.mobile = body.mobile;
    if (body.address !== undefined) updates.address = body.address;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    await updateUserModel(userId, updates);
    // If consumer (buyer), update buyer record name/rate/quantity
    if (user.role === UserRoles.CONSUMER) {
      const buyer = await findBuyerByUserId(userId);
      if (buyer) {
        const buyerUpdates = {};
        if (body.name !== undefined) buyerUpdates.name = body.name.trim();
        if (body.milkFixedPrice !== undefined) buyerUpdates.rate = Number(body.milkFixedPrice);
        if (body.dailyMilkQuantity !== undefined) buyerUpdates.quantity = Number(body.dailyMilkQuantity);
        if (Object.keys(buyerUpdates).length > 0) {
          await updateBuyer(userId, buyerUpdates);
        }
      }
    }
    const updated = await User.findById(userId);
    const { passwordHash, ...safe } = updated.toObject();
    safe._id = safe._id.toString();
    return res.json(safe);
  } catch (error) {
    const msg = error.message || "Failed to update user";
    if (msg.includes("already in use") || msg.includes("Invalid mobile")) {
      return res.status(400).json({ error: msg });
    }
    console.error("[users] Error updating user:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

module.exports = { getUsers, updateUser };

