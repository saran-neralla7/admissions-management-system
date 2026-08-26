import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';
import { sendReuploadRequestEmail } from '../utils/mailer.js';

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');

/**
 * POST /api/v1/documents/upload
 */
export async function uploadDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document file uploaded.' });
    }

    const { applicationId, documentType } = req.body;

    if (!applicationId || !documentType) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        error: 'applicationId and documentType are required.' 
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: String(applicationId) },
      include: {
        student: { include: { program: { select: { schoolId: true } } } },
      },
    });

    if (!application || !application.student) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    // Role check
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
      if (student?.id !== application.studentId) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with student application.' });
      }
    } else if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId && req.user?.schoolId !== application.student.program.schoolId) {
      if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with school scope.' });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const cleanDocType = String(documentType).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const formattedFileName = `${application.student.studentId}_${cleanDocType}${fileExt}`;
    const destinationPath = path.join(STORAGE_DIR, formattedFileName);

    let existingDoc = await prisma.studentDocument.findFirst({
      where: { applicationId: String(applicationId), documentType: cleanDocType },
      include: { versions: true },
    });

    if (existingDoc) {
      const nextVersionNum = existingDoc.versions.length + 1;
      const archiveFileName = `${application.student.studentId}_${cleanDocType}_v${nextVersionNum}${fileExt}`;
      const archivePath = path.join(STORAGE_DIR, archiveFileName);

      if (fs.existsSync(destinationPath)) {
        fs.copyFileSync(destinationPath, archivePath);
      }

      await prisma.documentVersion.create({
        data: {
          studentDocumentId: existingDoc.id,
          versionNumber: nextVersionNum,
          filePath: archiveFileName,
        },
      });

      fs.renameSync(req.file.path, destinationPath);

      await prisma.studentDocument.update({
        where: { id: existingDoc.id },
        data: {
          filePath: formattedFileName,
          isVerified: false,
          status: 'PENDING_VERIFICATION',
          remarks: null,
          updatedAt: new Date(),
        },
      });
    } else {
      fs.renameSync(req.file.path, destinationPath);

      existingDoc = await prisma.studentDocument.create({
        data: {
          applicationId: String(applicationId),
          documentType: cleanDocType,
          filePath: formattedFileName,
          isVerified: false,
          status: 'PENDING_VERIFICATION',
        },
        include: { versions: true },
      });
    }

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'STUDENT',
      action: 'DOCUMENT_UPLOADED',
      module: 'DOCUMENTS',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: application.student.studentId, documentType: cleanDocType, fileName: formattedFileName },
    });

    return res.json({
      success: true,
      message: 'Document uploaded successfully.',
      data: {
        documentId: existingDoc.id,
        filePath: formattedFileName,
      },
    });
  } catch (error: any) {
    console.error('Upload document error:', error);
    return res.status(500).json({ success: false, error: 'Failed to upload document.' });
  }
}

/**
 * PATCH /api/v1/documents/:id/status
 * Marks document VERIFIED or REJECTED_REUPLOAD_REQUIRED with officer remarks and sends email notification.
 */
export async function updateDocumentStatus(req: Request, res: Response) {
  try {
    const docId = String(req.params.id);
    const { status, remarks } = req.body;

    if (!status || (status !== 'VERIFIED' && status !== 'REJECTED_REUPLOAD_REQUIRED')) {
      return res.status(400).json({ success: false, error: 'Status must be VERIFIED or REJECTED_REUPLOAD_REQUIRED.' });
    }

    const doc = await prisma.studentDocument.findUnique({
      where: { id: docId },
      include: {
        application: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });

    if (!doc || !doc.application?.student) {
      return res.status(404).json({ success: false, error: 'Student document record not found.' });
    }

    const updatedDoc = await prisma.$transaction(async (tx) => {
      const updated = await tx.studentDocument.update({
        where: { id: docId },
        data: {
          status: status,
          isVerified: status === 'VERIFIED',
          remarks: remarks || null,
        },
      });

      if (status === 'REJECTED_REUPLOAD_REQUIRED') {
        await tx.application.update({
          where: { id: doc.applicationId },
          data: { status: 'CORRECTION_REQUIRED' },
        });

        await tx.statusHistory.create({
          data: {
            applicationId: doc.applicationId,
            fromStatus: doc.application.status,
            toStatus: 'CORRECTION_REQUIRED',
            changedBy: req.user?.email || 'Verification Officer',
            remarks: `Re-upload requested for certificate [${doc.documentType}]: ${remarks || 'Needs clear copy'}`,
          },
        });
      }

      return updated;
    });

    // Send email notification to student if re-upload is requested
    if (status === 'REJECTED_REUPLOAD_REQUIRED') {
      const student = doc.application.student;
      const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
      await sendReuploadRequestEmail({
        toEmail: student.user.email,
        studentName: student.fullName,
        studentId: student.studentId,
        itemType: `${doc.documentType.toUpperCase()} Certificate Scan`,
        remarks: remarks || 'Scan is unreadable or blurry, please re-upload clear original copy.',
        requestedBy: 'Admissions Verification Office',
        loginUrl: loginUrl,
      });
    }

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICER',
      action: status === 'VERIFIED' ? 'CERTIFICATE_VERIFIED' : 'CERTIFICATE_REUPLOAD_REQUESTED',
      module: 'VERIFICATION',
      ipAddress: req.ip || '127.0.0.1',
      details: { docId, documentType: doc.documentType, status, remarks },
    });

    return res.json({
      success: true,
      message: `Document status updated to ${status}. Email notification sent to student.`,
      data: updatedDoc,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update document status.' });
  }
}

/**
 * GET /api/v1/documents/stream/:fileName
 */
export async function streamDocument(req: Request, res: Response) {
  try {
    const fileName = String(req.params.fileName);
    const filePath = path.join(STORAGE_DIR, path.basename(fileName));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Document file not found.' });
    }

    return res.sendFile(filePath);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to stream document.' });
  }
}

/**
 * DELETE /api/v1/documents/versions/:versionId
 */
export async function deleteDocumentVersion(req: Request, res: Response) {
  try {
    const versionId = String(req.params.versionId);

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: {
        studentDocument: {
          include: {
            application: { include: { student: { include: { program: { select: { schoolId: true } } } } } },
          },
        },
      },
    });

    if (!version || !version.studentDocument?.application?.student) {
      return res.status(404).json({ success: false, error: 'Document version record not found.' });
    }

    const schoolId = version.studentDocument.application.student.program.schoolId;
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId && req.user?.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with school scope.' });
    }

    const archivePath = path.join(STORAGE_DIR, version.filePath);
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }

    await prisma.documentVersion.delete({ where: { id: versionId } });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'VERIFICATION_OFFICER',
      action: 'DOCUMENT_VERSION_DELETED',
      module: 'DOCUMENTS',
      ipAddress: req.ip || '127.0.0.1',
      details: { versionId, filePath: version.filePath },
    });

    return res.json({ success: true, message: 'Prior document version deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete document version.' });
  }
}
