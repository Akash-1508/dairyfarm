const mongoose = require("mongoose");

const UserRoles = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  CONSUMER: 2,
  SELLER: 3
};

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    default: ""
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    match: /^[0-9]{10}$/
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: false
  },
  address: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: Number,
    required: true,
    enum: [0, 1, 2, 3],
    default: 2
  },
  passwordHash: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  toJSON: {
    transform: function(doc, ret) {
      // Remove Mongoose internal properties
      delete ret.$__;
      delete ret.$isNew;
      delete ret.$op;
      delete ret.$versionError;
      delete ret.saveOptions;
      delete ret.validating;
      delete ret.cachedRequired;
      delete ret.backup;
      delete ret.inserting;
      delete ret.savedState;
      
      // Convert _id to string
      ret._id = ret._id.toString();
      
      // Remove passwordHash from JSON output (security)
      delete ret.passwordHash;
      
      return ret;
    }
  }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ mobile: 1 });
UserSchema.index({ role: 1 });

const User = mongoose.model('User', UserSchema);

// Helper functions
async function findUserByEmail(email) {
  const needle = email.trim().toLowerCase();
  return await User.findOne({ email: needle });
}

async function findUserByMobile(mobile) {
  const needle = mobile.trim();
  if (!needle) return null;
  return await User.findOne({ mobile: needle });
}

async function assertUserUnique(email, mobile) {
  const existingByEmail = await findUserByEmail(email);
  if (existingByEmail) {
    throw new Error("Email already in use");
  }
  if (mobile && mobile.trim()) {
    const existingByMobile = await findUserByMobile(mobile);
    if (existingByMobile) {
      throw new Error("Mobile already in use");
    }
  }
}

async function addUser(userData) {
  await assertUserUnique(userData.email, userData.mobile);
  
  const user = new User(userData);
  return await user.save();
}

async function getUsersByRole(role) {
  console.log(`[users] Fetching users with role ${role}`);
  const users = await User.find({ role: role });
  console.log(`[users] Found ${users.length} users with role ${role}`);
  return users;
}

async function updateUserPassword(userId, newPasswordHash) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  user.passwordHash = newPasswordHash;
  return await user.save();
}

async function updateUser(userId, updates) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (updates.name !== undefined) user.name = updates.name.trim();
  if (updates.email !== undefined) user.email = (updates.email || "").trim().toLowerCase();
  if (updates.address !== undefined) user.address = (updates.address || "").trim();
  if (updates.isActive !== undefined) user.isActive = !!updates.isActive;
  if (updates.mobile !== undefined) {
    const mobile = updates.mobile.trim();
    if (!/^[0-9]{10}$/.test(mobile)) throw new Error("Invalid mobile number");
    const existing = await User.findOne({ mobile });
    if (existing && existing._id.toString() !== userId.toString()) {
      throw new Error("Mobile already in use");
    }
    user.mobile = mobile;
  }
  return await user.save();
}

module.exports = {
  User,
  UserRoles,
  findUserByEmail,
  findUserByMobile,
  assertUserUnique,
  addUser,
  getUsersByRole,
  updateUserPassword,
  updateUser,
};
