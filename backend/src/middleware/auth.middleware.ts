import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { AppError } from './error.middleware';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in', 401));
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };

    // 3) Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return next(new AppError('The user no longer exists', 401));
    }

    // 4) Check if user changed password after the token was issued
    // This would require adding a passwordChangedAt field to the User model

    // Grant access to protected route
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}; 