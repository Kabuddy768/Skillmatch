import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

// Define role types
export type UserRole = 'ADMIN' | 'RECRUITER' | 'JOBSEEKER';

// Role-based access control middleware
export const roleGuard = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('You are not authenticated', 401));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(
        new AppError('You do not have permission to access this resource', 403)
      );
    }

    next();
  };
};

// Specific role guards
export const adminGuard = roleGuard('ADMIN');
export const recruiterGuard = roleGuard('RECRUITER');
export const jobseekerGuard = roleGuard('JOBSEEKER'); 