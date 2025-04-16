import express from 'express';
import { protect, jobseekerGuard } from '../middleware/auth.middleware';
import { jobseekerController } from '../controllers/jobseeker.controller';

const router = express.Router();

// All routes in this file are protected and require jobseeker role
router.use(protect, jobseekerGuard);

// Dashboard
router.get('/dashboard', jobseekerController.getDashboard);

// Profile Management
router.get('/profile', jobseekerController.getProfile);
router.put('/profile', jobseekerController.updateProfile);

// Job Applications
router.get('/applications', jobseekerController.getApplications);
router.post('/applications/:jobId', jobseekerController.applyForJob);
router.get('/applications/:id', jobseekerController.getApplicationDetails);

// Saved Jobs
router.get('/saved-jobs', jobseekerController.getSavedJobs);
router.post('/saved-jobs/:jobId', jobseekerController.saveJob);
router.delete('/saved-jobs/:jobId', jobseekerController.unsaveJob);

// Skills Management
router.get('/skills', jobseekerController.getSkills);
router.post('/skills', jobseekerController.addSkill);
router.put('/skills/:skillId', jobseekerController.updateSkill);
router.delete('/skills/:skillId', jobseekerController.removeSkill);

export default router; 