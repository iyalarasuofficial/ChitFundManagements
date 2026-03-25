import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

/**
 * Generate JWT Token
 */
const generateToken = (user: { id: number; phone: string; email?: string | null }): string => {
  return jwt.sign(
    { 
      userId: user.id, 
      phone: user.phone, 
      email: user.email 
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );
};

const normalizePhone = (value: unknown): string => String(value || '').trim();
const isValidPhone = (phone: string): boolean => /^\d{10}$/.test(phone);

/**
 * Signup - Register new user
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, password } = req.body;

    const normalizedName = String(name || '').trim();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = String(email || '').trim();
    const emailValue = normalizedEmail.length > 0 ? normalizedEmail : null;

    // Validate required fields
    if (!normalizedName || !normalizedPhone || !password) {
      res.status(400).json({ 
        success: false, 
        message: 'Name, phone, and password are required' 
      });
      return;
    }

    // Validate phone format
    if (!isValidPhone(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: 'Phone must be a valid 10-digit number'
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (existingUser) {
      res.status(409).json({ 
        success: false, 
        message: 'User with this phone number already exists' 
      });
      return;
    }

    // Check email uniqueness only when email is provided
    if (emailValue) {
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: emailValue }
      });

      if (existingEmailUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        phone: normalizedPhone,
        email: emailValue,
        passwordHash
      }
    });

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        walletBalance: user.walletBalance
      }
    });

  } catch (error: any) {
    console.error('Signup error:', error);

    // Prisma unique constraint violation
    if (error?.code === 'P2002') {
      const target = error?.meta?.target;
      if (Array.isArray(target) && target.includes('phone')) {
        res.status(409).json({ success: false, message: 'User with this phone number already exists' });
        return;
      }
      if (Array.isArray(target) && target.includes('email')) {
        res.status(409).json({ success: false, message: 'User with this email already exists' });
        return;
      }
      res.status(409).json({ success: false, message: 'User already exists' });
      return;
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error registering user',
      error: error.message
    });
  }
};

/**
 * Login - Authenticate user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;
    const normalizedPhone = normalizePhone(phone);

    // Validate required fields
    if (!normalizedPhone || !password) {
      res.status(400).json({ 
        success: false, 
        message: 'Phone and password are required' 
      });
      return;
    }

    if (!isValidPhone(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: 'Phone must be a valid 10-digit number'
      });
      return;
    }

    // Find user by phone
    const user = await prisma.user.findUnique({ 
      where: { phone: normalizedPhone } 
    });

    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({ 
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        walletBalance: user.walletBalance
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed',
      error: error.message
    });
  }
};