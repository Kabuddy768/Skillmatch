import express from 'express';
import { register, login, getCurrentUser, validateRegistration, validateLogin } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, catchAsync(register));
router.post('/login', validateLogin, catchAsync(login));

// Protected routes
router.get('/me', protect, getCurrentUser);

export default router; 