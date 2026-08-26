import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

/**
 * GET /api/v1/reports/summary
 */
export async function getSummaryReport(req: Request, res: Response) {
  try {
    const userRole = req.user?.role;
    const userSchoolId = req.user?.schoolId;

    let schoolFilter: any = {};
    if (userRole !== 'SUPER_ADMIN' && userSchoolId) {
      schoolFilter = { program: { schoolId: userSchoolId } };
    }

    const totalStudents = await prisma.student.count({ where: schoolFilter });
    const totalApplications = await prisma.application.count({ where: { student: schoolFilter } });

    const statusCounts = await prisma.application.groupBy({
      by: ['status'],
      where: { student: schoolFilter },
      _count: { status: true },
    });

    const feeCounts = await prisma.feeRecord.groupBy({
      by: ['status'],
      where: { application: { student: schoolFilter } },
      _count: { status: true },
      _sum: { amountPaid: true },
    });

    return res.json({
      success: true,
      data: {
        totalStudents,
        totalApplications,
        statusBreakdown: statusCounts.reduce((acc: any, curr) => {
          acc[curr.status] = curr._count.status;
          return acc;
        }, {}),
        feeBreakdown: feeCounts.reduce((acc: any, curr) => {
          acc[curr.status] = {
            count: curr._count.status,
            totalAmount: curr._sum.amountPaid || 0,
          };
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to generate summary report.' });
  }
}

/**
 * GET /api/v1/audit-logs
 */
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { action, module, userId, startDate, endDate, limit = 50, page = 1 } = req.query;

    let whereClause: any = {};

    if (action) whereClause.action = String(action);
    if (module) whereClause.module = String(module);
    if (userId) whereClause.userId = String(userId);

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(String(startDate));
      if (endDate) whereClause.createdAt.lte = new Date(String(endDate));
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: skip,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    const parsedLogs = logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : {},
    }));

    return res.json({
      success: true,
      data: parsedLogs,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs.' });
  }
}
