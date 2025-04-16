import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './error.middleware';

// Validation middleware factory
export const validate = (schema: z.ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map((error) => ({
          path: error.path.join('.'),
          message: error.message,
        }));
        return next(new AppError(JSON.stringify(errors), 400));
      }
      next(err);
    }
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas
  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
  }),

  register: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['jobseeker', 'recruiter', 'admin']),
    }),
  }),

  // Job schemas
  createJob: z.object({
    body: z.object({
      title: z.string().min(3),
      description: z.string().min(10),
      requirements: z.array(z.string()),
      responsibilities: z.array(z.string()),
      salaryRange: z.object({
        min: z.number().min(0),
        max: z.number().min(0),
      }),
      jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
      experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'EXPERT']),
      locationType: z.enum(['REMOTE', 'HYBRID', 'ON_SITE']),
      requiredSkills: z.array(z.string()),
    }),
  }),

  updateJob: z.object({
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: z.object({
      title: z.string().min(3).optional(),
      description: z.string().min(10).optional(),
      requirements: z.array(z.string()).optional(),
      responsibilities: z.array(z.string()).optional(),
      salaryRange: z
        .object({
          min: z.number().min(0),
          max: z.number().min(0),
        })
        .optional(),
      jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).optional(),
      experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'EXPERT']).optional(),
      locationType: z.enum(['REMOTE', 'HYBRID', 'ON_SITE']).optional(),
      requiredSkills: z.array(z.string()).optional(),
    }),
  }),

  // Company schemas
  updateCompany: z.object({
    body: z.object({
      name: z.string().min(2),
      industry: z.string().min(2),
      size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']),
      foundingYear: z.number().min(1900).max(new Date().getFullYear()),
      website: z.string().url(),
      description: z.string().min(10),
      mission: z.string().min(10),
      values: z.array(z.string()),
      benefits: z.array(z.string()),
      locations: z.array(z.string()),
    }),
  }),

  // Application schemas
  createApplication: z.object({
    body: z.object({
      jobId: z.number(),
      coverLetter: z.string().min(10),
    }),
  }),

  updateApplicationStatus: z.object({
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: z.object({
      status: z.enum(['PENDING', 'SHORTLISTED', 'REJECTED', 'HIRED']),
    }),
  }),

  // Profile schemas
  updateProfile: z.object({
    body: z.object({
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      phone: z.string().min(10),
      location: z.string().min(2),
      bio: z.string().min(10),
      skills: z.array(z.string()),
      experience: z.array(
        z.object({
          title: z.string(),
          company: z.string(),
          startDate: z.string(),
          endDate: z.string().optional(),
          description: z.string(),
        })
      ),
      education: z.array(
        z.object({
          degree: z.string(),
          institution: z.string(),
          startDate: z.string(),
          endDate: z.string().optional(),
          description: z.string(),
        })
      ),
    }),
  }),
}; 