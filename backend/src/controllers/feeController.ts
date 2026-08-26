import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';
import { sendReuploadRequestEmail } from '../utils/mailer.js';

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');

/**
 * POST /api/v1/fees/submit
 * Allows student to submit multiple fee receipts (1st payment, 2nd payment, 3rd payment, etc.)
 */
export async function submitFeePayment(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Fee receipt image or PDF file is required.' });
    }

    const { applicationId, amountPaid, transactionRefNo } = req.body;

    if (!applicationId || !amountPaid || !transactionRefNo) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        error: 'applicationId, amountPaid, and transactionRefNo are required.' 
      });
    }

    const app = await prisma.application.findUnique({
      where: { id: String(applicationId) },
      include: { student: { select: { studentId: true, userId: true } } },
    });

    if (!app) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    if (req.user?.role === 'STUDENT' && app.student.userId !== req.user.userId) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with student account.' });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const formattedFileName = `${app.student.studentId}_fee_${Date.now()}${fileExt}`;
    const destinationPath = path.join(STORAGE_DIR, formattedFileName);

    fs.renameSync(req.file.path, destinationPath);

    const feeRecord = await prisma.feeRecord.create({
      data: {
        applicationId: String(applicationId),
        amountPaid: parseFloat(amountPaid),
        transactionRefNo: String(transactionRefNo).trim(),
        receiptFilePath: formattedFileName,
        status: 'PENDING',
      },
    });

    await prisma.application.update({
      where: { id: String(applicationId) },
      data: { status: 'FEE_PENDING' },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'STUDENT',
      action: 'FEE_RECEIPT_SUBMITTED',
      module: 'FINANCE',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: app.student.studentId, amountPaid, transactionRefNo, receiptId: feeRecord.id },
    });

    return res.json({
      success: true,
      message: 'Fee receipt and payment details submitted for verification.',
      data: feeRecord,
    });
  } catch (error: any) {
    console.error('Fee submit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit fee payment.' });
  }
}

/**
 * GET /api/v1/fees
 * Lists all fee records across applications for Central Accounts workspace
 */
export async function getFees(req: Request, res: Response) {
  try {
    const { schoolId } = req.query;

    let whereClause: any = {};
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'CENTRAL_ACCOUNTS' && req.user?.schoolId) {
      whereClause.application = { student: { program: { schoolId: req.user.schoolId } } };
    } else if (schoolId) {
      whereClause.application = { student: { program: { schoolId: String(schoolId) } } };
    }

    const feeRecords = await prisma.feeRecord.findMany({
      where: whereClause,
      include: {
        application: {
          include: {
            student: {
              include: {
                program: { select: { name: true, code: true, school: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = feeRecords.map((f) => ({
      id: f.id,
      applicationId: f.applicationId,
      studentId: f.application.student.studentId,
      studentName: f.application.student.fullName,
      programName: f.application.student.program.name,
      schoolName: f.application.student.program.school.name,
      amountPaid: f.amountPaid,
      transactionRefNo: f.transactionRefNo,
      receiptFilePath: f.receiptFilePath,
      status: f.status,
      remarks: f.remarks,
      createdAt: f.createdAt,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch fee records.' });
  }
}

/**
 * PATCH /api/v1/fees/:feeRecordId/verify
 * Central Accounts verifies fee receipt or requests re-upload with officer remarks and email notification
 */
export async function verifyFeePayment(req: Request, res: Response) {
  try {
    const feeRecordId = String(req.params.feeRecordId);
    const { status, remarks } = req.body;

    if (!status || (status !== 'VERIFIED' && status !== 'REJECTED_REUPLOAD_REQUIRED' && status !== 'REJECTED')) {
      return res.status(400).json({ success: false, error: 'Valid status required (VERIFIED, REJECTED_REUPLOAD_REQUIRED, or REJECTED).' });
    }

    const feeRecord = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        application: {
          include: {
            student: {
              include: {
                user: true,
                program: { select: { schoolId: true } },
              },
            },
          },
        },
      },
    });

    if (!feeRecord || !feeRecord.application?.student) {
      return res.status(404).json({ success: false, error: 'Fee record not found.' });
    }

    const schoolId = feeRecord.application.student.program.schoolId;
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'CENTRAL_ACCOUNTS' && req.user?.schoolId && req.user?.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with school scope.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedFee = await tx.feeRecord.update({
        where: { id: feeRecordId },
        data: {
          status: status,
          remarks: remarks || null,
        },
      });

      let nextAppStatus = 'FEE_PENDING';
      if (status === 'VERIFIED') {
        nextAppStatus = 'FEE_CLEARED';
      } else if (status === 'REJECTED_REUPLOAD_REQUIRED' || status === 'REJECTED') {
        nextAppStatus = 'CORRECTION_REQUIRED';
      }

      await tx.application.update({
        where: { id: feeRecord.applicationId },
        data: { status: nextAppStatus },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: feeRecord.applicationId,
          fromStatus: feeRecord.application.status,
          toStatus: nextAppStatus,
          changedBy: req.user?.email || 'Central Accounts Officer',
          remarks: `Fee receipt verification update: ${status}. ${remarks || ''}`,
        },
      });

      return updatedFee;
    });

    // Send email notification to student if fee receipt re-upload is requested
    if (status === 'REJECTED_REUPLOAD_REQUIRED' || status === 'REJECTED') {
      const student = feeRecord.application.student;
      const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
      await sendReuploadRequestEmail({
        toEmail: student.user.email,
        studentName: student.fullName,
        studentId: student.studentId,
        itemType: 'Fee Payment Receipt',
        remarks: remarks || 'Fee receipt image is illegible or bank reference does not match statement. Please re-upload.',
        requestedBy: 'Central Accounts Office',
        loginUrl: loginUrl,
      });
    }

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'FINANCE_OFFICER',
      action: status === 'VERIFIED' ? 'FEE_APPROVED' : 'FEE_REJECTED',
      module: 'FINANCE',
      ipAddress: req.ip || '127.0.0.1',
      details: { feeRecordId, status, remarks },
    });

    return res.json({ success: true, message: `Fee verification status updated to ${status}. Email notification sent to student.`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update fee verification status.' });
  }
}
