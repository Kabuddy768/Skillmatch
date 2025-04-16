import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import jobseekerRoutes from './routes/jobseeker.routes';
import recruiterRoutes from './routes/recruiter.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error.middleware';

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobseeker', jobseekerRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(errorHandler);

export { app, prisma }; 