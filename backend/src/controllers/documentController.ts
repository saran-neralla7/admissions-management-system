import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { sendConsolidatedReuploadEmail } from '../utils/mailer.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * POST /api/v1/documents/upload
 * Handles document upload, version archiving, and storage.
 */
export async function uploadDocument(req: Request, res: Response) {
  try {
    const { applicationId, documentType } = req.body;

    if (!applicationId || !documentType || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: applicationId, documentType, and file scan.',
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: String(applicationId) },
      include: { student: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Target application not found.' });
    }

    const storageBaseDir = path.resolve(process.env.STORAGE_DIR || './storage/documents');
    const studentDir = path.join(storageBaseDir, application.student.studentId);
    fs.mkdirSync(studentDir, { recursive: true });

    const cleanDocType = String(documentType).toUpperCase().trim();
    const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
    const formattedFileName = `${cleanDocType}${ext}`;
    const destinationPath = path.join(studentDir, formattedFileName);

    let existingDoc: any = await prisma.studentDocument.findUnique({
      where: { applicationId_documentType: { applicationId: String(applicationId), documentType: cleanDocType } },
      include: { versions: true },
    });

    if (existingDoc) {
      const nextVersionNum = existingDoc.versions.length + 1;
      const archiveFileName = `${cleanDocType}_v${existingDoc.versions.length}${ext}`;
      const archivePath = path.join(studentDir, archiveFileName);

      if (fs.existsSync(destinationPath)) {
        fs.renameSync(destinationPath, archivePath);
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
          status: 'UPLOADED',
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
          status: 'UPLOADED',
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
 * Marks document VERIFIED or CORRECTION_REQUIRED with officer remarks in DB.
 */
export async function updateDocumentStatus(req: Request, res: Response) {
  try {
    const docId = String(req.params.id);
    const { status, remarks } = req.body;

    if (!status || (status !== 'VERIFIED' && status !== 'CORRECTION_REQUIRED')) {
      return res.status(400).json({ success: false, error: 'Status must be VERIFIED or CORRECTION_REQUIRED.' });
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

    const updatedDoc = await prisma.studentDocument.update({
      where: { id: docId },
      data: {
        status: status,
        remarks: remarks || null,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICER',
      action: status === 'VERIFIED' ? 'CERTIFICATE_VERIFIED' : 'CERTIFICATE_REUPLOAD_FLAGGED',
      module: 'VERIFICATION',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: doc.application.student.studentId, documentType: doc.documentType, status, remarks },
    });

    return res.json({
      success: true,
      message: `Document status updated to ${status}.`,
      data: updatedDoc,
    });
  } catch (error: any) {
    console.error('Update document status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update document status.' });
  }
}

/**
 * POST /api/v1/documents/send-consolidated-reupload-request
 * Sends 1 single consolidated email notification to student listing all flagged certificates.
 */
export async function sendConsolidatedReuploadRequest(req: Request, res: Response) {
  try {
    const { applicationId, reuploadItems } = req.body;

    if (!applicationId || !Array.isArray(reuploadItems) || reuploadItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing applicationId or list of reupload items.' });
    }

    const application: any = await prisma.application.findUnique({
      where: { id: String(applicationId) },
      include: { student: { include: { user: true } } },
    });

    if (!application || !application.student) {
      return res.status(404).json({ success: false, error: 'Application or student record not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: application.id },
        data: { status: 'CORRECTION_REQUIRED' },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: application.status,
          toStatus: 'CORRECTION_REQUIRED',
          changedBy: req.user?.email || 'Verification Officer',
          remarks: `Requested re-upload for ${reuploadItems.length} document(s).`,
        },
      });

      for (const item of reuploadItems) {
        await tx.studentDocument.updateMany({
          where: { applicationId: application.id, documentType: item.itemType },
          data: { status: 'CORRECTION_REQUIRED', remarks: item.remarks },
        });
      }
    });

    const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
    await sendConsolidatedReuploadEmail({
      toEmail: application.student.user.email,
      studentName: application.student.fullName,
      studentId: application.student.studentId,
      reuploadItems: reuploadItems,
      requestedBy: req.user?.role === 'CENTRAL_OFFICE' ? 'Central Verification Office' : 'School Verification Office',
      loginUrl: loginUrl,
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICE_USER',
      action: 'CONSOLIDATED_REUPLOAD_EMAIL_SENT',
      module: 'VERIFICATION',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: application.student.studentId, count: reuploadItems.length },
    });

    return res.json({
      success: true,
      message: `Consolidated re-upload request sent successfully. Single email dispatched to ${application.student.user.email}.`,
    });
  } catch (error: any) {
    console.error('Send consolidated reupload request error:', error);
    return res.status(500).json({ success: false, error: 'Failed to send consolidated re-upload request.' });
  }
}

/**
 * GET /api/v1/documents/stream/:studentId/:fileName
 */
export async function streamDocument(req: Request, res: Response) {
  try {
    const { studentId, fileName } = req.params;
    const storageBaseDir = path.resolve(process.env.STORAGE_DIR || './storage/documents');
    const filePath = path.join(storageBaseDir, String(studentId), String(fileName));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Requested scan file not found on server.' });
    }

    return res.sendFile(filePath);
  } catch (error: any) {
    console.error('Stream document error:', error);
    return res.status(500).json({ success: false, error: 'Failed to stream document file.' });
  }
}

/**
 * DELETE /api/v1/documents/versions/:versionId
 */
export async function deleteDocumentVersion(req: Request, res: Response) {
  try {
    const { versionId } = req.params;
    const version = await prisma.documentVersion.findUnique({
      where: { id: String(versionId) },
    });

    if (!version) {
      return res.status(404).json({ success: false, error: 'Document version record not found.' });
    }

    await prisma.documentVersion.delete({ where: { id: String(versionId) } });
    return res.json({ success: true, message: 'Document version deleted successfully.' });
  } catch (error: any) {
    console.error('Delete document version error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete document version.' });
  }
}
