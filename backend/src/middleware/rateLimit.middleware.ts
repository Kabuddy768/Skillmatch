import rateLimit from 'express-rate-limit';
import { AppError } from './error.middleware';

// Rate limit options
const rateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
};

// Create rate limiters
export const globalRateLimiter = rateLimit(rateLimitOptions);

// More strict rate limiter for auth routes
export const authRateLimiter = rateLimit({
  ...rateLimitOptions,
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
});

// Strict rate limiter for sensitive operations
export const sensitiveRateLimiter = rateLimit({
  ...rateLimitOptions,
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many sensitive operations, please try again after 15 minutes',
});