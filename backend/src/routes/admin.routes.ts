import express from 'express';
import { protect, adminGuard } from '../middleware/auth.middleware';
import { adminController } from '../controllers/admin.controller';

const router = express.Router();

// All routes in this file are protected and require admin role
router.use(protect, adminGuard);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Content Management
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

router.get('/industries', adminController.getIndustries);
router.post('/industries', adminController.createIndustry);
router.put('/industries/:id', adminController.updateIndustry);
router.delete('/industries/:id', adminController.deleteIndustry);

// System Analytics
router.get('/analytics', adminController.getAnalytics);
router.get('/logs', adminController.getSystemLogs);

export default router; 