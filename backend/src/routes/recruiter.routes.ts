import express from 'express';
import { protect, recruiterGuard } from '../middleware/auth.middleware';
import { recruiterController } from '../controllers/recruiter.controller';

const router = express.Router();

// All routes in this file are protected and require recruiter role
router.use(protect, recruiterGuard);

// Dashboard
router.get('/dashboard', recruiterController.getDashboard);

// Company Profile
router.get('/company-profile', recruiterController.getCompanyProfile);
router.put('/company-profile', recruiterController.updateCompanyProfile);

// Job Management
router.get('/jobs', recruiterController.getJobs);
router.post('/jobs', recruiterController.createJob);
router.get('/jobs/:id', recruiterController.getJobDetails);
router.put('/jobs/:id', recruiterController.updateJob);
router.delete('/jobs/:id', recruiterController.deleteJob);

// Candidate Management
router.get('/candidates', recruiterController.getCandidates);
router.get('/candidates/:id', recruiterController.getCandidateDetails);
router.put('/candidates/:id/status', recruiterController.updateCandidateStatus);

// Analytics
router.get('/analytics', recruiterController.getAnalytics);

export default router;