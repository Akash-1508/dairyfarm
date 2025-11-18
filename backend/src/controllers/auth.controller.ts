import { Request, Response } from "express";
import crypto from "crypto";
import { addUser, UserRoles, findUserByEmail, findUserByMobile } from "../models";
import { validateSignup, validateLogin, formatValidationErrors } from "../utils/validators";
import { generateToken } from "../utils/jwt";

export const login = async (req: Request, res: Response) => {
  const validation = validateLogin(req.body);
  if (!validation.success) {
    return res.status(400).json(formatValidationErrors(validation.errors!));
  }
  
  const { emailOrMobile, password } = validation.data!;
  
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

export const signup = async (req: Request, res: Response) => {
  // Validate request data using helper
  const validation = validateSignup(req.body);
  if (!validation.success) {
    return res.status(400).json(formatValidationErrors(validation.errors!));
  }
  
  const validatedData = validation.data!;

  // Hash password (salt + scrypt)
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(validatedData.password, salt, 64).toString("hex");
  const passwordHash = `${salt}:${hash}`;

  try {
    // Use provided role or default to CONSUMER (2)
    const userRole = validatedData.role !== undefined ? validatedData.role : UserRoles.CONSUMER;
    
    const created = await addUser({
      name: validatedData.name,
      email: validatedData.email || "",
      mobile: validatedData.mobile.trim(),
      gender: validatedData.gender,
      address: validatedData.address?.trim(),
      role: userRole,
      passwordHash,
      isActive: true
    });

    // eslint-disable-next-line no-console
    console.log(`[auth] New user created: created=${created}`);

    const { passwordHash: _ph, ...safe } = created;
    return res.status(201).json(safe);
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Unable to create user";
    const status = /already in use/i.test(msg) ? 409 : 400;
    return res.status(status).json({ error: msg });
  }
};


