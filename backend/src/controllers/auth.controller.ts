import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware';
import { body, validationResult } from 'express-validator';

// Validation middleware for registration
export const validateRegistration = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role').isIn(['ADMIN', 'RECRUITER', 'JOBSEEKER'])
    .withMessage('Invalid role specified'),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
];

// Validation middleware for login
export const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role,
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate JWT token
    // const token = jwt.sign(
    //   { id: user.id, role: user.role },
    //   process.env.JWT_SECRET as string,
    //   { expiresIn: process.env.JWT_EXPIRES_IN }
    // );
    // Create token
    const token = jwt.sign(
      { id: user.id, role_id: user.role },
      process.env.JWT_SECRET as string || 'secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return next(new AppError('Account is not active', 403));
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    // const token = jwt.sign(
    //   { id: user.id, role: user.role },
    //   process.env.JWT_SECRET as string,
    //   { expiresIn: process.env.JWT_EXPIRES_IN }
    // );

    // Create token
    const token = jwt.sign(
      { id: user.id, role_id: user.role},
      process.env.JWT_SECRET as string || 'secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
      status: 'success',
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (err) {
    next(err);
  }
}; 