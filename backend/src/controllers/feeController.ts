import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';
import { sendReuploadRequestEmail } from '../utils/mailer.js';

const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR || './storage');
const ENCRYPTED_STORAGE_DIR = path.join(STORAGE_ROOT, 'encrypted');

if (!fs.existsSync(ENCRYPTED_STORAGE_DIR)) {
  fs.mkdirSync(ENCRYPTED_STORAGE_DIR, { recursive: true });
}

/**
 * POST /api/v1/fees/submit
 * Student uploads application / tuition fee receipt scan and transaction reference number.
 */
export async function submitFeePayment(req: Request, res: Response) {
  try {
    const { applicationId, amountPaid, transactionRefNo } = req.body;

    if (!req.file || !applicationId || !amountPaid || !transactionRefNo) {
      return res.status(400).json({
        success: false,
        error: 'Missing applicationId, amountPaid, transactionRefNo, or receipt file scan.',
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: String(applicationId) },
      include: { student: { include: { user: true } } },
    });

    if (!application || !application.student) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    const ext = path.extname(req.file.originalname) || '.pdf';
    const formattedFileName = `FEE_${application.student.studentId}_${Date.now()}${ext}`;
    const destinationPath = path.join(ENCRYPTED_STORAGE_DIR, formattedFileName);

    fs.renameSync(req.file.path, destinationPath);

    const feeRecord = await prisma.feeRecord.create({
      data: {
        applicationId: String(applicationId),
        amountPaid: parseFloat(amountPaid),
        transactionRefNo: String(transactionRefNo).trim(),
        receiptFilePath: formattedFileName,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Update application workflow status to FEE_PENDING
    await prisma.application.update({
      where: { id: String(applicationId) },
      data: { status: 'FEE_PENDING' },
    });

    await prisma.statusHistory.create({
      data: {
        applicationId: String(applicationId),
        fromStatus: application.status,
        toStatus: 'FEE_PENDING',
        changedBy: application.student.fullName,
        remarks: `Submitted fee payment receipt ₹${amountPaid} (Ref: ${transactionRefNo}).`,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: 'STUDENT',
      action: 'FEE_PAYMENT_SUBMITTED',
      module: 'FINANCE',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: application.student.studentId, amountPaid, transactionRefNo, fileName: formattedFileName },
    });

    return res.json({
      success: true,
      message: 'Fee payment receipt submitted successfully.',
      data: feeRecord,
    });
  } catch (error: any) {
    console.error('Submit fee payment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit fee payment receipt.' });
  }
}

/**
 * GET /api/v1/fees
 * Central Accounts / School Accounts fee roster. Supports status filtering (VERIFIED vs PENDING), school scoping, and program filtering.
 */
export async function getFees(req: Request, res: Response) {
  try {
    const { schoolId, programId, status } = req.query;

    let whereClause: any = {};
    if (status) {
      whereClause.status = String(status);
    }

    if (req.user?.schoolId) {
      whereClause.application = { student: { program: { schoolId: req.user.schoolId } } };
    } else if (schoolId) {
      whereClause.application = { student: { program: { schoolId: String(schoolId) } } };
    }

    if (programId) {
      const existingStudentFilter = whereClause.application?.student || {};
      whereClause.application = {
        student: {
          ...existingStudentFilter,
          programId: String(programId),
        },
      };
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
      updatedAt: f.updatedAt,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Get fees error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch fee records.' });
  }
}

/**
 * PATCH /api/v1/fees/:feeRecordId/verify
 * Central Accounts verifies fee receipt or requests re-upload with officer remarks and email notification.
 */
export async function verifyFeePayment(req: Request, res: Response) {
  try {
    const feeRecordId = String(req.params.feeRecordId);
    const { status, remarks } = req.body;

    if (!status || (status !== 'VERIFIED' && status !== 'REJECTED_REUPLOAD_REQUIRED')) {
      return res.status(400).json({ success: false, error: 'Status must be VERIFIED or REJECTED_REUPLOAD_REQUIRED.' });
    }

    const feeRecord = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        application: {
          include: { student: { include: { user: true } } },
        },
      },
    });

    if (!feeRecord || !feeRecord.application?.student) {
      return res.status(404).json({ success: false, error: 'Fee payment record not found.' });
    }

    const targetAppStatus = status === 'VERIFIED' ? 'FEE_CLEARED' : 'CORRECTION_REQUIRED';

    const updated = await prisma.$transaction(async (tx) => {
      const updatedFee = await tx.feeRecord.update({
        where: { id: feeRecordId },
        data: {
          status: status,
          remarks: remarks || null,
        },
      });

      await tx.application.update({
        where: { id: feeRecord.applicationId },
        data: { status: targetAppStatus },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: feeRecord.applicationId,
          fromStatus: feeRecord.application.status,
          toStatus: targetAppStatus,
          changedBy: req.user?.email || 'Central Accounts Officer',
          remarks: status === 'VERIFIED' 
            ? `Fee payment of ₹${feeRecord.amountPaid} verified and cleared.`
            : `Receipt re-upload requested by Central Accounts: ${remarks || 'Receipt illegible'}`,
        },
      });

      return updatedFee;
    });

    // Send email notification to student if receipt re-upload is requested by Accounts
    if (status === 'REJECTED_REUPLOAD_REQUIRED') {
      const student = feeRecord.application.student;
      const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
      await sendReuploadRequestEmail({
        toEmail: student.user.email,
        studentName: student.fullName,
        studentId: student.studentId,
        itemType: `Fee Payment Receipt (Ref: ${feeRecord.transactionRefNo})`,
        remarks: remarks || 'Payment receipt scan is illegible, please re-upload valid bank receipt.',
        requestedBy: 'Central Accounts Office',
        loginUrl: loginUrl,
      });
    }

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'CENTRAL_ACCOUNTS',
      action: status === 'VERIFIED' ? 'FEE_CLEARED' : 'FEE_REUPLOAD_REQUESTED',
      module: 'FINANCE',
      ipAddress: req.ip || '127.0.0.1',
      details: { feeRecordId, amountPaid: feeRecord.amountPaid, transactionRefNo: feeRecord.transactionRefNo, status, remarks },
    });

    return res.json({
      success: true,
      message: status === 'VERIFIED' ? 'Fee payment approved and marked Fee Cleared.' : 'Receipt re-upload requested and notification sent.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Verify fee payment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update fee verification status.' });
  }
}
