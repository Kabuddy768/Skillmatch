import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { AppError } from '../middleware/error.middleware';

export const adminController = {
  // User management
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, status, page = 1, limit = 10 } = req.query;

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (status) {
        where.status = status;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              // jobs: role === 'recruiter',
              applications: role === 'jobseeker',
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      });

      const total = await prisma.user.count({ where });

      res.status(200).json({
        status: 'success',
        data: {
          users,
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

  async getUserDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);

      // First fetch the user to get their role
      const userInfo = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!userInfo) {
        return next(new AppError('User not found', 404));
      }

      // Then fetch the full user with appropriate includes based on role
      // const user = await prisma.user.findUnique({
      //   where: { id: userId },
      //   include: {
      //     profile: true,
      //     company: userInfo.role === 'RECRUITER',
      //     jobs: userInfo.role === 'RECRUITER',
      //     applications: userInfo.role === 'JOBSEEKER',
      //   },
      // });
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          ...(userInfo.role === 'RECRUITER' && {
            company: true,
            createdJobs: true,
          }),
          ...(userInfo.role === 'JOBSEEKER' && {
            applications: true,
          }),
        },
      });
      

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      res.status(200).json({
        status: 'success',
        data: {
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = Number(req.params.id);
      const { status } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { status },
      });

      res.status(200).json({
        status: 'success',
        data: {
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // System analytics
  async getSystemAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { timeRange = '30d' } = req.query;

      const endDate = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const analytics = await prisma.$transaction([
        // User growth
        prisma.user.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: true,
          orderBy: {
            createdAt: 'asc',
          },
        }),
        // Users by role
        prisma.user.groupBy({
          by: ['role'],
          _count: true,
          orderBy: {
            role: 'asc',
          },
        }),
        // Job growth
        prisma.job.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: true,
          orderBy: {
            createdAt: 'asc',
          },
        }),
        // Applications growth
        prisma.jobApplication.groupBy({
          by: ['appliedAt'],
          where: {
            appliedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: true,
          orderBy: {
            appliedAt: 'asc',
          },
        }),
        // Top companies
        prisma.company.findMany({
          take: 10,
          orderBy: {
            jobs: {
              _count: 'desc',
            },
          },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                jobs: true,
              },
            },
          },
        }),
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          userGrowth: analytics[0],
          usersByRole: analytics[1],
          jobGrowth: analytics[2],
          applicationGrowth: analytics[3],
          topCompanies: analytics[4],
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Content management - Categories
  async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      // Make sure to create Category model in Prisma first
      if (!prisma.$queryRaw) {
        return next(new AppError('Category model not yet available in Prisma client', 500));
      }

      // Using raw SQL query as fallback if the model doesn't exist yet
      const categories = await prisma.$queryRaw`
        SELECT 
          c.id, 
          c.name, 
          c.description, 
          c.status, 
          COUNT(j.id) as job_count 
        FROM 
          "Category" c 
        LEFT JOIN 
          "Job" j ON c.id = j."categoryId" 
        GROUP BY 
          c.id 
        ORDER BY 
          c.name ASC
      `;

      res.status(200).json({
        status: 'success',
        data: {
          categories,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      // Using raw SQL query as fallback 
      const category = await prisma.$executeRaw`
        INSERT INTO "Category" (name, description, status) 
        VALUES (${name}, ${description}, 'ACTIVE')
        RETURNING *
      `;

      res.status(201).json({
        status: 'success',
        data: {
          category,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = Number(req.params.id);
      const { name, description, status } = req.body;

      // Using raw SQL query as fallback
      const category = await prisma.$executeRaw`
        UPDATE "Category"
        SET 
          name = ${name},
          description = ${description},
          status = ${status}
        WHERE id = ${categoryId}
        RETURNING *
      `;

      res.status(200).json({
        status: 'success',
        data: {
          category,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Content management - Industries
  async getIndustries(_req: Request, res: Response, next: NextFunction) {
    try {
      // Using raw SQL query as fallback
      const industries = await prisma.$queryRaw`
        SELECT 
          i.id, 
          i.name, 
          i.description, 
          i.status, 
          COUNT(DISTINCT c.id) as company_count,
          COUNT(DISTINCT j.id) as job_count
        FROM 
          "Industry" i 
        LEFT JOIN 
          "Company" c ON i.id = c."industryId" 
        LEFT JOIN 
          "Job" j ON i.id = j."industryId" 
        GROUP BY 
          i.id 
        ORDER BY 
          i.name ASC
      `;

      res.status(200).json({
        status: 'success',
        data: {
          industries,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async createIndustry(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      // Using raw SQL query as fallback
      const industry = await prisma.$executeRaw`
        INSERT INTO "Industry" (name, description, status) 
        VALUES (${name}, ${description}, 'ACTIVE')
        RETURNING *
      `;

      res.status(201).json({
        status: 'success',
        data: {
          industry,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateIndustry(req: Request, res: Response, next: NextFunction) {
    try {
      const industryId = Number(req.params.id);
      const { name, description, status } = req.body;

      // Using raw SQL query as fallback
      const industry = await prisma.$executeRaw`
        UPDATE "Industry"
        SET 
          name = ${name},
          description = ${description},
          status = ${status}
        WHERE id = ${industryId}
        RETURNING *
      `;

      res.status(200).json({
        status: 'success',
        data: {
          industry,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Content management - Locations
  async getLocations(_req: Request, res: Response, next: NextFunction) {
    try {
      // Using raw SQL query as fallback
      const locations = await prisma.$queryRaw`
        SELECT 
          l.id, 
          l.name, 
          l.description, 
          l.status, 
          COUNT(DISTINCT c.id) as company_count,
          COUNT(DISTINCT j.id) as job_count
        FROM 
          "Location" l 
        LEFT JOIN 
          "Company" c ON l.id = c."locationId" 
        LEFT JOIN 
          "Job" j ON l.id = j."locationId" 
        GROUP BY 
          l.id 
        ORDER BY 
          l.name ASC
      `;

      res.status(200).json({
        status: 'success',
        data: {
          locations,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      // Using raw SQL query as fallback
      const location = await prisma.$executeRaw`
        INSERT INTO "Location" (name, description, status) 
        VALUES (${name}, ${description}, 'ACTIVE')
        RETURNING *
      `;

      res.status(201).json({
        status: 'success',
        data: {
          location,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const locationId = Number(req.params.id);
      const { name, description, status } = req.body;

      // Using raw SQL query as fallback
      const location = await prisma.$executeRaw`
        UPDATE "Location"
        SET 
          name = ${name},
          description = ${description},
          status = ${status}
        WHERE id = ${locationId}
        RETURNING *
      `;

      res.status(200).json({
        status: 'success',
        data: {
          location,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Settings
  async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      // Using raw SQL query as fallback
      const settings = await prisma.$queryRaw`
        SELECT * FROM "Setting"
      `;

      res.status(200).json({
        status: 'success',
        data: {
          settings,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { settings } = req.body;
      const updatedSettings = [];

      // Using raw SQL for each setting
      for (const setting of settings) {
        const result = await prisma.$executeRaw`
          INSERT INTO "Setting" (key, value)
          VALUES (${setting.key}, ${setting.value})
          ON CONFLICT (key) 
          DO UPDATE SET value = ${setting.value}
          RETURNING *
        `;
        updatedSettings.push(result);
      }

      res.status(200).json({
        status: 'success',
        data: {
          settings: updatedSettings,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};