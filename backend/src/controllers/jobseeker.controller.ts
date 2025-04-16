import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { AppError } from '../middleware/error.middleware';

export const jobseekerController = {
  // Profile management
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await prisma.jobSeekerProfile.findUnique({
        where: { userId: req.user?.id },
        include: {
          skills: true,
          experience: true,
          education: true,
        },
      });

      if (!profile) {
        return next(new AppError('Profile not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          profile,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        firstName,
        lastName,
        phone,
        location,
        bio,
        skills,
        experience,
        education,
      } = req.body;

      // Update or create profile
      const profile = await prisma.jobSeekerProfile.upsert({
        where: { userId: req.user?.id },
        update: {
          firstName,
          lastName,
          phone,
          location,
          bio,
        },
        create: {
          userId: req.user?.id!,
          firstName,
          lastName,
          phone,
          location,
          bio,
        },
      });

      // Update skills
      if (skills) {
        await prisma.skill.deleteMany({
          where: { jobSeekerProfileId: profile.id },
        });

        await prisma.skill.createMany({
          data: skills.map((skill: string) => ({
            name: skill,
            jobSeekerProfileId: profile.id,
          })),
        });
      }

      // Update experience
      if (experience) {
        await prisma.experience.deleteMany({
          where: { jobSeekerProfileId: profile.id },
        });

        await prisma.experience.createMany({
          data: experience.map((exp: any) => ({
            ...exp,
            jobSeekerProfileId: profile.id,
          })),
        });
      }

      // Update education
      if (education) {
        await prisma.education.deleteMany({
          where: { jobSeekerProfileId: profile.id },
        });

        await prisma.education.createMany({
          data: education.map((edu: any) => ({
            ...edu,
            jobSeekerProfileId: profile.id,
          })),
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          profile,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Job search and applications
  async searchJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        title,
        location,
        jobType,
        experienceLevel,
        salaryRange,
        skills,
        page = 1,
        limit = 10,
      } = req.query;

      const where: any = {
        status: 'ACTIVE',
      };

      if (title) {
        where.title = { contains: title as string, mode: 'insensitive' };
      }

      if (location) {
        where.location = { contains: location as string, mode: 'insensitive' };
      }

      if (jobType) {
        where.jobType = jobType;
      }

      if (experienceLevel) {
        where.experienceLevel = experienceLevel;
      }

      if (salaryRange) {
        const [min, max] = (salaryRange as string).split('-').map(Number);
        where.salaryRange = {
          min: { gte: min },
          max: { lte: max },
        };
      }

      if (skills) {
        where.requiredSkills = {
          hasSome: (skills as string).split(','),
        };
      }

      const jobs = await prisma.job.findMany({
        where,
        include: {
          company: {
            select: {
              name: true,
              logo: true,
              industry: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      });

      const total = await prisma.job.count({ where });

      res.status(200).json({
        status: 'success',
        data: {
          jobs,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getJobDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          company: {
            select: {
              name: true,
              logo: true,
              industry: true,
              description: true,
              website: true,
            },
          },
        },
      });

      if (!job) {
        return next(new AppError('Job not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          job,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async applyForJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId, coverLetter } = req.body;

      // Check if job exists
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return next(new AppError('Job not found', 404));
      }

      // Check if already applied
      const existingApplication = await prisma.application.findFirst({
        where: {
          jobId,
          jobSeekerId: req.user?.id,
        },
      });

      if (existingApplication) {
        return next(new AppError('You have already applied for this job', 400));
      }

      // Create application
      const application = await prisma.application.create({
        data: {
          jobId,
          jobSeekerId: req.user?.id!,
          coverLetter,
          status: 'PENDING',
        },
      });

      res.status(201).json({
        status: 'success',
        data: {
          application,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      const where: any = {
        jobSeekerId: req.user?.id,
      };

      if (status) {
        where.status = status;
      }

      const applications = await prisma.application.findMany({
        where,
        include: {
          job: {
            include: {
              company: {
                select: {
                  name: true,
                  logo: true,
                },
              },
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      });

      const total = await prisma.application.count({ where });

      res.status(200).json({
        status: 'success',
        data: {
          applications,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Job alerts and preferences
  async getJobAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await prisma.jobAlert.findMany({
        where: { userId: req.user?.id },
        include: {
          job: {
            include: {
              company: {
                select: {
                  name: true,
                  logo: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        status: 'success',
        data: {
          alerts,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateJobPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        jobTypes,
        locations,
        experienceLevels,
        salaryRange,
        skills,
        notificationFrequency,
      } = req.body;

      const preferences = await prisma.jobPreferences.upsert({
        where: { userId: req.user?.id },
        update: {
          jobTypes,
          locations,
          experienceLevels,
          salaryRange,
          skills,
          notificationFrequency,
        },
        create: {
          userId: req.user?.id!,
          jobTypes,
          locations,
          experienceLevels,
          salaryRange,
          skills,
          notificationFrequency,
        },
      });

      res.status(200).json({
        status: 'success',
        data: {
          preferences,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};