const crypto = require("crypto");
const { addUser, UserRoles, findUserByEmail, findUserByMobile, addBuyer, addSeller, updateUserPassword } = require("../models");
const { validateSignup, validateLogin, validateForgotPassword, validateResetPassword, formatValidationErrors } = require("../utils/validators");
const { generateToken } = require("../utils/jwt");
const { storeOTP, verifyOTP, getStoredOTP } = require("../utils/otpStore");
const { sendOTP } = require("../services/smsService");

const login = async (req, res) => {
  const validation = validateLogin(req.body);
  if (!validation.success) {
    return res.status(400).json(formatValidationErrors(validation.errors));
  }
  
  const { emailOrMobile, password } = validation.data;
  
  // Check if it's email or mobile number
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrMobile);
  const isMobile = /^[0-9]{10}$/.test(emailOrMobile);
  
  if (!isEmail && !isMobile) {
    return res.status(400).json({ error: "Invalid email or mobile number format" });
  }
  
  try {
    // Find user by email or mobile
    let user = null;
    if (isEmail) {
      user = await findUserByEmail(emailOrMobile.toLowerCase());
    } else {
      user = await findUserByMobile(emailOrMobile);
    }
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Verify password hash
    const [salt, hash] = user.passwordHash.split(':');
    if (!salt || !hash) {
      return res.status(500).json({ error: "Invalid password format" });
    }
    
    const inputHash = crypto.scryptSync(password, salt, 64).toString("hex");
    if (inputHash !== hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Generate JWT token with user data
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      mobile: user.mobile,
      name: user.name,
      role: user.role,
    });
    
    return res.json({ 
      token, 
      user: { 
        id: user._id.toString(), 
        name: user.name, 
        email: user.email,
        mobile: user.mobile,
        role: user.role
      } 
    });
  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
};

const signup = async (req, res) => {
  // Validate request data using helper
  const validation = validateSignup(req.body);
  if (!validation.success) {
    return res.status(400).json(formatValidationErrors(validation.errors));
  }
  
  const validatedData = validation.data;

  // Hash password (salt + scrypt)
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(validatedData.password, salt, 64).toString("hex");
  const passwordHash = `${salt}:${hash}`;

  try {
    // Use provided role or default to CONSUMER (2)
    const userRole = validatedData.role !== undefined ? validatedData.role : UserRoles.CONSUMER;
    
    const emailForUser = (validatedData.email && String(validatedData.email).trim())
      ? String(validatedData.email).trim().toLowerCase()
      : "";
    const created = await addUser({
      name: validatedData.name,
      email: emailForUser,
      mobile: validatedData.mobile.trim(),
      gender: validatedData.gender,
      address: validatedData.address?.trim(),
      role: userRole,
      passwordHash,
      isActive: true,
    });

    console.log(`[auth] New user created:`, {
      _id: created._id,
      name: created.name,
      mobile: created.mobile,
    });

    // If user is a buyer (CONSUMER role), create a buyer record
    if (userRole === UserRoles.CONSUMER && created._id) {
      try {
        // Convert _id to string if it's ObjectId, to ensure proper handling
        const userId = created._id?.toString ? created._id.toString() : String(created._id);
        
        console.log('[auth] Attempting to create buyer record for user:', {
          userId: userId,
          userIdType: typeof created._id,
          userIdString: userId,
          name: created.name,
          quantity: validatedData.dailyMilkQuantity,
          rate: validatedData.milkFixedPrice,
        });
        
        const buyer = await addBuyer({
          userId: userId, // Pass as string, addBuyer will convert to ObjectId
          name: created.name,
          quantity: validatedData.dailyMilkQuantity,
          rate: validatedData.milkFixedPrice,
        });
        
        console.log(`[auth] Buyer record created successfully:`, {
          _id: buyer._id,
          userId: buyer.userId,
          name: buyer.name,
          quantity: buyer.quantity,
          rate: buyer.rate,
        });
      } catch (buyerError) {
        // Log error but don't fail the signup if buyer creation fails
        console.error('[auth] Failed to create buyer record:', {
          error: buyerError?.message || buyerError,
          stack: buyerError?.stack,
          userId: created._id?.toString ? created._id.toString() : String(created._id),
          userIdType: typeof created._id,
          fullError: JSON.stringify(buyerError, Object.getOwnPropertyNames(buyerError)),
        });
      }
    } else {
      console.log('[auth] Skipping buyer creation:', {
        userRole,
        isConsumer: userRole === UserRoles.CONSUMER,
        hasId: !!created._id,
        _id: created._id?.toString ? created._id.toString() : String(created._id),
      });
    }

    // If user is a seller (SELLER role), create a seller record
    if (userRole === UserRoles.SELLER && created._id) {
      try {
        // Convert _id to string if it's ObjectId, to ensure proper handling
        const userId = created._id?.toString ? created._id.toString() : String(created._id);
        
        console.log('[auth] Attempting to create seller record for user:', {
          userId: userId,
          userIdType: typeof created._id,
          userIdString: userId,
          name: created.name,
          quantity: validatedData.dailyMilkQuantity,
          rate: validatedData.milkFixedPrice,
        });
        
        const seller = await addSeller({
          userId: userId, // Pass as string, addSeller will convert to ObjectId
          name: created.name,
          quantity: validatedData.dailyMilkQuantity,
          rate: validatedData.milkFixedPrice,
        });
        
        console.log(`[auth] Seller record created successfully:`, {
          _id: seller._id,
          userId: seller.userId,
          name: seller.name,
          quantity: seller.quantity,
          rate: seller.rate,
        });
      } catch (sellerError) {
        // Log error but don't fail the signup if seller creation fails
        console.error('[auth] Failed to create seller record:', {
          error: sellerError?.message || sellerError,
          stack: sellerError?.stack,
          userId: created._id?.toString ? created._id.toString() : String(created._id),
          userIdType: typeof created._id,
          fullError: JSON.stringify(sellerError, Object.getOwnPropertyNames(sellerError)),
        });
      }
    } else {
      console.log('[auth] Skipping seller creation:', {
        userRole,
        isSeller: userRole === UserRoles.SELLER,
        hasId: !!created._id,
        _id: created._id?.toString ? created._id.toString() : String(created._id),
      });
    }

    // Convert Mongoose document to JSON (will use toJSON transform)
    const userJson = created.toJSON ? created.toJSON() : JSON.parse(JSON.stringify(created));
    // Remove passwordHash if still present
    const { passwordHash: _ph, ...safe } = userJson;
    return res.status(201).json(safe);
  } catch (e) {
    const msg = typeof e?.message === "string" ? e.message : "Unable to create user";
    const status = /already in use/i.test(msg) ? 409 : 400;
    return res.status(status).json({ error: msg });
  }
};

const forgotPassword = async (req, res) => {
  const validation = validateForgotPassword(req.body);
  if (!validation.success) {
    return res.status(400).json(formatValidationErrors(validation.errors));
  }
  
  const { mobile } = validation.data;
  
  try {
    // Find user by mobile number only
    const user = await findUserByMobile(mobile);
    
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      // Still return success message to prevent user enumeration
      return res.json({ 
        message: "If the mobile number exists, an OTP has been sent to your mobile number"
      });
    }
    
    // Generate and store OTP
    const otp = storeOTP(mobile, user._id.toString());
    
    // Log OTP for testing (since SMS might not be working)
    console.log(`\n🔐 [OTP GENERATED]`);
    console.log(`📱 Mobile: +91${mobile}`);
    console.log(`🔢 OTP: ${otp}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log(`💡 Use this OTP to test password reset\n`);
    
    // Send OTP via SMS
    try {
      await sendOTP(mobile, otp);
      console.log(`[auth/forgot-password] ✅ OTP sent via SMS to mobile ${mobile}`);
    } catch (smsError) {
      console.error(`[auth/forgot-password] ❌ Failed to send SMS:`, smsError.message);
      console.error(`[auth/forgot-password] ⚠️  SMS not sent, but OTP is: ${otp} (check console above)`);
      // Still return success to prevent user enumeration
      // Log error for monitoring
    }
    
    return res.json({ 
      message: "OTP has been sent to your mobile number"
    });
  } catch (error) {
    console.error("[auth/forgot-password] Error:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
};

const resetPassword = async (req, res) => {
  const validation = validateResetPassword(req.body);
  if (!validation.success) {
    return res.status(400).json(formatValidationErrors(validation.errors));
  }
  
  const { mobile, otp, newPassword } = validation.data;
  
  try {
    // Verify OTP
    const otpResult = verifyOTP(mobile, otp);
    
    if (!otpResult.valid) {
      return res.status(400).json({ error: otpResult.error });
    }
    
    // Find user by mobile number
    const user = await findUserByMobile(mobile);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Verify userId matches
    if (user._id.toString() !== otpResult.userId) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    // Hash new password
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(newPassword, salt, 64).toString("hex");
    const passwordHash = `${salt}:${hash}`;
    
    // Update password
    await updateUserPassword(user._id, passwordHash);
    
    console.log(`[auth/reset-password] Password reset successful for mobile ${mobile}`);
    
    return res.json({ 
      message: "Password reset successful. Please login with your new password."
    });
  } catch (error) {
    console.error("[auth/reset-password] Error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

module.exports = { login, signup, forgotPassword, resetPassword };

