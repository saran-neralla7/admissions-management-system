import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * GET /api/v1/applications/my-application
 */
export async function getMyApplication(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      include: {
        program: {
          include: {
            school: true,
            formFields: { orderBy: { displayOrder: 'asc' } },
          },
        },
        applications: {
          include: {
            documents: { include: { versions: { orderBy: { versionNumber: 'desc' } } } },
            feeRecords: { orderBy: { createdAt: 'desc' } },
            history: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!student || student.applications.length === 0) {
      return res.status(404).json({ success: false, error: 'No application record found.' });
    }

    const currentApp = student.applications[0];

    const parsedFields = student.program.formFields.map((f: any) => ({
      ...f,
      options: f.options ? JSON.parse(f.options) : null,
      validation: f.validation ? JSON.parse(f.validation) : { required: false },
      conditional: f.conditional ? JSON.parse(f.conditional) : null,
    }));

    const parsedDocRequirements = student.program.docRequirements
      ? JSON.parse(student.program.docRequirements)
      : [];

    return res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          fullName: student.fullName,
          dateOfBirth: student.dateOfBirth,
          maskedAadhaar: `XXXX-XXXX-${student.aadhaarLast4}`,
          program: {
            ...student.program,
            formFields: parsedFields,
            docRequirements: parsedDocRequirements,
          },
        },
        application: {
          ...currentApp,
          customFormData: currentApp.customFormData ? JSON.parse(currentApp.customFormData) : {},
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch application.' });
  }
}

/**
 * PATCH /api/v1/applications/my-application/draft
 */
export async function updateApplicationDraft(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const { customFormData } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      include: { applications: true },
    });

    if (!student || student.applications.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const app = student.applications[0];
    if (app.status !== 'STUDENT_INVITED' && app.status !== 'APPLICATION_IN_PROGRESS' && app.status !== 'CORRECTION_REQUIRED') {
      return res.status(400).json({ success: false, error: 'Application is locked and cannot be edited.' });
    }

    const updatedApp = await prisma.application.update({
      where: { id: app.id },
      data: {
        customFormData: JSON.stringify(customFormData || {}),
        status: 'APPLICATION_IN_PROGRESS',
      },
    });

    return res.json({ success: true, message: 'Draft saved successfully.', data: updatedApp });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to save application draft.' });
  }
}

/**
 * POST /api/v1/applications/my-application/submit
 */
export async function submitApplication(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      include: { applications: true },
    });

    if (!student || student.applications.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const app = student.applications[0];
    const fromStatus = app.status;

    const updatedApp = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: app.id },
        data: { status: 'VERIFICATION_PENDING' },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: app.id,
          fromStatus: fromStatus,
          toStatus: 'VERIFICATION_PENDING',
          changedBy: student.fullName,
          remarks: 'Submitted by student',
        },
      });

      return updated;
    });

    await createAuditLog({
      userId: req.user.userId,
      roleName: 'STUDENT',
      action: 'APPLICATION_SUBMITTED',
      module: 'ADMISSIONS',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, applicationId: app.id },
    });

    return res.json({ success: true, message: 'Application submitted successfully.', data: updatedApp });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to submit application.' });
  }
}

/**
 * PATCH /api/v1/applications/:id/status
 */
export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { targetStatus, remarks } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ success: false, error: 'Valid targetStatus is required.' });
    }

    const app = await prisma.application.findUnique({
      where: { id },
      include: { student: { include: { program: { select: { schoolId: true } } } } },
    });

    if (!app || !app.student) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId && req.user?.schoolId !== app.student.program.schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with school scope.' });
    }

    const fromStatus = app.status;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { status: targetStatus },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: id,
          fromStatus: fromStatus,
          toStatus: targetStatus,
          changedBy: req.user?.email || 'Officer',
          remarks: remarks || `Status changed from ${fromStatus} to ${targetStatus}`,
        },
      });

      return updated;
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICER',
      action: 'STATUS_UPDATED',
      module: 'WORKFLOW',
      ipAddress: req.ip || '127.0.0.1',
      details: { applicationId: id, fromStatus, targetStatus, remarks },
    });

    return res.json({ success: true, message: `Application status updated to ${targetStatus}.`, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update application status.' });
  }
}
