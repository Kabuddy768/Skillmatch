import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { AppError } from '../middleware/error.middleware';

export const recruiterController = {
  // Dashboard
  getDashboard: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recruiterId = req.user.id;

      // Get company information
      const company = await prisma.company.findFirst({
        where: { id: recruiterId },
        include: {
          jobs: {
            include: {
              applications: true,
            },
          },
        },
      });

      if (!company) {
        return next(new AppError('Company not found', 404));
      }

      // Calculate dashboard metrics
      const totalJobs = company.jobs.length;
      const totalApplications = company.jobs.reduce(
        (acc, job) => acc + job.applications.length,
        0
      );
      const activeJobs = company.jobs.filter(
        (job) => job.status === 'PUBLISHED'
      ).length;

      res.status(200).json({
        status: 'success',
        data: {
          company,
          metrics: {
            totalJobs,
            totalApplications,
            activeJobs,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Company Profile
  getCompanyProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const company = await prisma.company.findFirst({
        where: { id: req.user.id },
        include: {
          values: true,
          benefits: true,
          locations: true,
        },
      });

      if (!company) {
        return next(new AppError('Company not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: { company },
      });
    } catch (err) {
      next(err);
    }
  },

  updateCompanyProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        industry,
        size,
        foundingYear,
        website,
        description,
        mission,
        logoUrl,
        values,
        benefits,
        locations,
      } = req.body;

      const company = await prisma.company.update({
        where: { id: req.user.id },
        data: {
          name,
          industry,
          size,
          foundingYear,
          website,
          description,
          mission,
          logoUrl,
          values: {
            deleteMany: {},
            create: values,
          },
          benefits: {
            deleteMany: {},
            create: benefits,
          },
          locations: {
            deleteMany: {},
            create: locations,
          },
        },
        include: {
          values: true,
          benefits: true,
          locations: true,
        },
      });

      res.status(200).json({
        status: 'success',
        data: { company },
      });
    } catch (err) {
      next(err);
    }
  },

  // Job Management
  getJobs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = await prisma.job.findMany({
        where: { companyId: req.user.id },
        include: {
          applications: true,
          requiredSkills: {
            include: {
              skill: true,
            },
          },
        },
      });

      res.status(200).json({
        status: 'success',
        data: { jobs },
      });
    } catch (err) {
      next(err);
    }
  },

  createJob: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        description,
        requirements,
        responsibilities,
        salaryRange,
        jobType,
        experienceLevel,
        locationType,
        requiredSkills,
      } = req.body;

      const job = await prisma.job.create({
        data: {
          title,
          description,
          requirements,
          responsibilities,
          salaryRange,
          jobType,
          experienceLevel,
          locationType,
          companyId: req.user.id,
          requiredSkills: {
            create: requiredSkills.map((skill: any) => ({
              skillId: skill.id,
              importanceLevel: skill.importanceLevel,
            })),
          },
        },
        include: {
          requiredSkills: {
            include: {
              skill: true,
            },
          },
        },
      });

      res.status(201).json({
        status: 'success',
        data: { job },
      });
    } catch (err) {
      next(err);
    }
  },

  getJobDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await prisma.job.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
          applications: {
            include: {
              jobseeker: {
                include: {
                  profile: true,
                  skills: {
                    include: {
                      skill: true,
                    },
                  },
                },
              },
            },
          },
          requiredSkills: {
            include: {
              skill: true,
            },
          },
        },
      });

      if (!job) {
        return next(new AppError('Job not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: { job },
      });
    } catch (err) {
      next(err);
    }
  },

  updateJob: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        description,
        requirements,
        responsibilities,
        salaryRange,
        jobType,
        experienceLevel,
        locationType,
        status,
        requiredSkills,
      } = req.body;

      const job = await prisma.job.update({
        where: { id: parseInt(req.params.id) },
        data: {
          title,
          description,
          requirements,
          responsibilities,
          salaryRange,
          jobType,
          experienceLevel,
          locationType,
          status,
          requiredSkills: {
            deleteMany: {},
            create: requiredSkills.map((skill: any) => ({
              skillId: skill.id,
              importanceLevel: skill.importanceLevel,
            })),
          },
        },
        include: {
          requiredSkills: {
            include: {
              skill: true,
            },
          },
        },
      });

      res.status(200).json({
        status: 'success',
        data: { job },
      });
    } catch (err) {
      next(err);
    }
  },

  deleteJob: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.job.delete({
        where: { id: parseInt(req.params.id) },
      });

      res.status(204).json({
        status: 'success',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // Candidate Management
  getCandidates: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const candidates = await prisma.jobApplication.findMany({
        where: {
          job: {
            companyId: req.user.id,
          },
        },
        include: {
          jobseeker: {
            include: {
              profile: true,
              skills: {
                include: {
                  skill: true,
                },
              },
            },
          },
          job: true,
        },
      });

      res.status(200).json({
        status: 'success',
        data: { candidates },
      });
    } catch (err) {
      next(err);
    }
  },

  getCandidateDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const candidate = await prisma.jobApplication.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
          jobseeker: {
            include: {
              profile: true,
              skills: {
                include: {
                  skill: true,
                },
              },
            },
          },
          job: true,
        },
      });

      if (!candidate) {
        return next(new AppError('Candidate not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: { candidate },
      });
    } catch (err) {
      next(err);
    }
  },

  updateCandidateStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;

      const application = await prisma.jobApplication.update({
        where: { id: parseInt(req.params.id) },
        data: { status },
        include: {
          jobseeker: {
            include: {
              profile: true,
            },
          },
        },
      });

      res.status(200).json({
        status: 'success',
        data: { application },
      });
    } catch (err) {
      next(err);
    }
  },

  // Analytics
  getAnalytics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user.id;

      // Get job applications over time
      const applicationsOverTime = await prisma.jobApplication.groupBy({
        by: ['appliedAt'],
        where: {
          job: {
            companyId,
          },
        },
        _count: true,
      });

      // Get candidate status distribution
      const statusDistribution = await prisma.jobApplication.groupBy({
        by: ['status'],
        where: {
          job: {
            companyId,
          },
        },
        _count: true,
      });

      // Get top skills
      const topSkills = await prisma.jobRequiredSkill.groupBy({
        by: ['skillId'],
        where: {
          job: {
            companyId,
          },
        },
        _count: true,
        orderBy: {
          _count: {
            skillId: 'desc',
          },
        },
        take: 10,
      });

      res.status(200).json({
        status: 'success',
        data: {
          applicationsOverTime,
          statusDistribution,
          topSkills,
        },
      });
    } catch (err) {
      next(err);
    }
  },
}; 