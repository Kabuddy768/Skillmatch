import express from 'express';
import authRoutes from './auth.routes';
import jobseekerRoutes from './jobseeker.routes';
import recruiterRoutes from './recruiter.routes';
import adminRoutes from './admin.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/jobseeker', jobseekerRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/admin', adminRoutes);

export default router;