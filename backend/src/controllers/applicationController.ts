import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * GET /api/v1/applications/my-application
 * Fetches current authenticated student's profile, dynamic form values, documents, fees, and history.
 */
export async function getMyApplication(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const student: any = await prisma.student.findUnique({
      where: { userId: userId },
      include: {
        program: {
          include: {
            school: true,
            formFields: { orderBy: { displayOrder: 'asc' } },
            documentRules: { orderBy: { displayOrder: 'asc' } },
          },
        },
        applications: {
          include: {
            documents: { include: { versions: { orderBy: { versionNumber: 'desc' } } } },
            feeRecords: { orderBy: { createdAt: 'desc' } },
            statusHistory: { orderBy: { createdAt: 'desc' } },
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

    return res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          studentId: student.studentId,
          fullName: student.fullName,
          gender: student.gender || 'MALE',
          dateOfBirth: student.dateOfBirth,
          maskedAadhaar: `XXXX-XXXX-${student.aadhaarLast4}`,
          program: {
            ...student.program,
            formFields: parsedFields,
            documentRules: student.program.documentRules || [],
          },
        },
        application: {
          id: currentApp.id,
          applicationNo: currentApp.applicationNo,
          status: currentApp.status,
          dynamicFormData: currentApp.dynamicFormData ? JSON.parse(currentApp.dynamicFormData) : {},
          documents: currentApp.documents.map((d: any) => {
            const latestVersion = d.versions[0];
            return {
              id: d.id,
              documentType: d.documentType,
              status: d.status,
              remarks: d.remarks,
              filePath: latestVersion?.filePath || d.filePath,
              versionNumber: latestVersion?.versionNumber || 1,
              uploadedAt: d.createdAt,
            };
          }),
          feeRecords: currentApp.feeRecords,
          statusHistory: currentApp.statusHistory,
        },
      },
    });
  } catch (error: any) {
    console.error('Get my-application error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve application profile.' });
  }
}

/**
 * PATCH /api/v1/applications/my-application/draft
 * Saves progressive draft of dynamic form. Status remains APPLICATION_IN_PROGRESS.
 */
export async function updateApplicationDraft(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { formData } = req.body;

    const student: any = await prisma.student.findUnique({
      where: { userId: userId },
      include: { applications: true },
    });

    if (!student || student.applications.length === 0) {
      return res.status(404).json({ success: false, error: 'Student application record not found.' });
    }

    const currentApp = student.applications[0];

    const updatedApp = await prisma.application.update({
      where: { id: currentApp.id },
      data: {
        dynamicFormData: JSON.stringify(formData || {}),
        status: currentApp.status === 'STUDENT_INVITED' ? 'APPLICATION_IN_PROGRESS' : currentApp.status,
      },
    });

    return res.json({
      success: true,
      message: 'Draft application saved successfully.',
      data: {
        id: updatedApp.id,
        status: updatedApp.status,
        dynamicFormData: JSON.parse(updatedApp.dynamicFormData || '{}'),
      },
    });
  } catch (error: any) {
    console.error('Update draft error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save application draft.' });
  }
}

/**
 * POST /api/v1/applications/my-application/submit
 * Locks application and moves status to VERIFICATION_PENDING.
 */
export async function submitApplication(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { formData } = req.body;

    const student: any = await prisma.student.findUnique({
      where: { userId: userId },
      include: { applications: true },
    });

    if (!student || student.applications.length === 0) {
      return res.status(404).json({ success: false, error: 'Student application record not found.' });
    }

    const currentApp = student.applications[0];

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: currentApp.id },
        data: {
          dynamicFormData: JSON.stringify(formData || {}),
          status: 'VERIFICATION_PENDING',
        },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: currentApp.id,
          fromStatus: currentApp.status,
          toStatus: 'VERIFICATION_PENDING',
          changedBy: student.studentId,
          remarks: 'Student finalized and submitted application form.',
        },
      });

      return app;
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: 'STUDENT',
      action: 'APPLICATION_SUBMITTED',
      module: 'ADMISSIONS',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, applicationId: currentApp.id },
    });

    return res.json({
      success: true,
      message: 'Application submitted successfully and routed to Verification Office.',
      data: {
        id: updatedApp.id,
        status: updatedApp.status,
      },
    });
  } catch (error: any) {
    console.error('Submit application error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit application.' });
  }
}

/**
 * PATCH /api/v1/applications/:id/status
 * Administrative status override endpoint.
 */
export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { targetStatus, remarks } = req.body;

    const currentApp = await prisma.application.findUnique({
      where: { id: String(id) },
    });

    if (!currentApp) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: String(id) },
        data: { status: String(targetStatus) },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: String(id),
          fromStatus: currentApp.status,
          toStatus: String(targetStatus),
          changedBy: req.user?.email || 'SYSTEM_ADMIN',
          remarks: remarks || 'Status updated via administrative override.',
        },
      });

      return app;
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'APPLICATION_STATUS_UPDATED',
      module: 'ADMISSIONS',
      ipAddress: req.ip || '127.0.0.1',
      details: { applicationId: id, fromStatus: currentApp.status, toStatus: targetStatus, remarks },
    });

    return res.json({
      success: true,
      message: `Application status updated to ${targetStatus}.`,
      data: updatedApp,
    });
  } catch (error: any) {
    console.error('Update application status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update application status.' });
  }
}
