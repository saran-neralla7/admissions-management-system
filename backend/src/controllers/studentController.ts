import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { hashPassword, generateTempPassword, encryptAadhaar, decryptAadhaar } from '../utils/crypto.js';
import { sendStudentCredentialsEmail, sendAdmissionConfirmationEmail } from '../utils/mailer.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * POST /api/v1/students
 * Creates a student profile + student user account + initial application.
 */
export async function createStudent(req: Request, res: Response) {
  try {
    const { fullName, email, dateOfBirth, gender, aadhaarNo, programId, admissionCycleId } = req.body;

    if (!fullName || !email || !dateOfBirth || !aadhaarNo || !programId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fullName, email, dateOfBirth, aadhaarNo, programId.',
      });
    }

    const cleanAadhaar = String(aadhaarNo).replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      return res.status(400).json({ success: false, error: 'Aadhaar Number must be exactly 12 digits.' });
    }

    const targetProgram = await prisma.program.findUnique({
      where: { id: String(programId) },
      include: { school: true },
    });

    if (!targetProgram) {
      return res.status(404).json({ success: false, error: 'Target academic program not found.' });
    }

    let selectedCycle;
    if (admissionCycleId) {
      selectedCycle = await prisma.admissionCycle.findUnique({ where: { id: String(admissionCycleId) } });
    } else {
      selectedCycle = await prisma.admissionCycle.findFirst({
        where: { programId: targetProgram.id, isActive: true },
        orderBy: { academicYear: 'desc' },
      });
    }

    if (!selectedCycle) {
      return res.status(400).json({
        success: false,
        error: `No active admission cycle open for ${targetProgram.name}. Please configure an academic cycle first.`,
      });
    }

    const currentYear = selectedCycle.academicYear;
    const yearShort = String(currentYear).slice(-2);
    const prefix = targetProgram.studentIdPrefix || 'GVP';

    const lastStudent = await prisma.student.findFirst({
      where: { studentId: { startsWith: `${prefix}${yearShort}` } },
      orderBy: { createdAt: 'desc' },
    });

    let sequenceNumber = 1;
    if (lastStudent && lastStudent.studentId) {
      const match = lastStudent.studentId.match(/-(\d+)$/);
      if (match) {
        sequenceNumber = parseInt(match[1], 10) + 1;
      }
    }

    const formattedSeq = String(sequenceNumber).padStart(3, '0');
    const studentId = `${prefix}${yearShort}-${formattedSeq}`;

    const temporaryPassword = generateTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const encryptedAadhaarStr = encryptAadhaar(cleanAadhaar);
    const aadhaarLast4 = cleanAadhaar.slice(-4);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: String(email).toLowerCase(),
          passwordHash: passwordHash,
          roleId: (await tx.role.findUnique({ where: { name: 'STUDENT' } }))!.id,
          mustChangePassword: true,
        },
      });

      const student = await tx.student.create({
        data: {
          studentId: studentId,
          encryptedAadhaar: encryptedAadhaarStr,
          aadhaarLast4: aadhaarLast4,
          fullName: String(fullName).trim(),
          gender: gender || 'MALE',
          dateOfBirth: new Date(dateOfBirth),
          userId: user.id,
          programId: targetProgram.id,
        },
      });

      const application = await tx.application.create({
        data: {
          applicationNo: `APP-${studentId}`,
          studentId: student.id,
          admissionCycleId: selectedCycle.id,
          status: 'STUDENT_INVITED',
        },
      });

      return { user, student, application };
    });

    const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
    await sendStudentCredentialsEmail({
      toEmail: String(email),
      studentName: String(fullName),
      studentId: studentId,
      tempPassword: temporaryPassword,
      programName: targetProgram.name,
      schoolName: targetProgram.school.name,
      loginUrl: loginUrl,
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICE_USER',
      action: 'STUDENT_CREATED',
      module: 'ADMISSIONS',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId, fullName, gender, programId: targetProgram.id, cycleId: selectedCycle.id },
    });

    return res.status(201).json({
      success: true,
      message: `Student registered successfully under ID ${studentId}. Welcome email with login credentials sent to ${email}.`,
      data: {
        studentId: result.student.studentId,
        fullName: result.student.fullName,
        email: result.user.email,
        temporaryPassword: temporaryPassword,
        programName: targetProgram.name,
        academicYear: selectedCycle.academicYear,
        cycleTitle: selectedCycle.title,
      },
    });
  } catch (error: any) {
    console.error('Create student error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create student.' });
  }
}

/**
 * GET /api/v1/students
 * Fetches all student profiles. Supports filtering by schoolId, programId, and status.
 */
export async function getStudents(req: Request, res: Response) {
  try {
    const { schoolId, programId, status } = req.query;

    let whereClause: any = {};
    if (
      req.user?.role !== 'SUPER_ADMIN' &&
      req.user?.role !== 'CENTRAL_OFFICE' &&
      req.user?.role !== 'CENTRAL_ADMISSIONS' &&
      req.user?.schoolId
    ) {
      whereClause.program = { schoolId: req.user.schoolId };
    } else if (schoolId) {
      whereClause.program = { schoolId: String(schoolId) };
    }

    if (programId) {
      whereClause.programId = String(programId);
    }

    if (status) {
      if (status === 'ADMITTED') {
        whereClause.applications = {
          some: { status: 'ADMITTED' },
        };
      } else if (status === 'READY_FOR_ADMISSION') {
        whereClause.applications = {
          some: {
            status: { in: ['FEE_CLEARED', 'DOCUMENTS_VERIFIED'] },
          },
        };
      } else if (status === 'APPROVED') {
        whereClause.applications = {
          some: {
            status: { in: ['DOCUMENTS_VERIFIED', 'FEE_PENDING', 'FEE_CLEARED', 'ADMITTED'] },
          },
        };
      } else if (status === 'REUPLOAD_REQUESTED' || status === 'CORRECTION_REQUIRED') {
        whereClause.applications = {
          some: { status: 'CORRECTION_REQUIRED' },
        };
      } else if (status === 'PENDING') {
        whereClause.applications = {
          some: {
            status: { in: ['STUDENT_INVITED', 'APPLICATION_IN_PROGRESS', 'VERIFICATION_PENDING', 'SUBMITTED'] },
          },
        };
      } else {
        whereClause.applications = {
          some: { status: String(status) },
        };
      }
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        program: { select: { name: true, code: true, school: { select: { name: true } } } },
        user: { select: { email: true, isActive: true } },
        applications: {
          include: {
            admissionCycle: { select: { academicYear: true, title: true } },
            documents: { include: { versions: { orderBy: { versionNumber: 'desc' } } } },
            feeRecords: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = students.map((s: any) => {
      const activeApp = s.applications[0];
      return {
        id: s.id,
        studentId: s.studentId,
        fullName: s.fullName,
        gender: s.gender || 'MALE',
        email: s.user.email,
        maskedAadhaar: `XXXX-XXXX-${s.aadhaarLast4}`,
        programName: s.program.name,
        programCode: s.program.code,
        schoolName: s.program.school.name,
        applicationId: activeApp?.id || null,
        applicationStatus: activeApp?.status || 'STUDENT_INVITED',
        academicYear: activeApp?.admissionCycle.academicYear || null,
        cycleTitle: activeApp?.admissionCycle.title || null,
        documents: activeApp?.documents.map((d: any) => {
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
        }) || [],
        feeRecords: activeApp?.feeRecords || [],
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Get students error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch student roster.' });
  }
}

/**
 * GET /api/v1/students/:studentId
 */
export async function getStudentById(req: Request, res: Response) {
  try {
    const student: any = await prisma.student.findUnique({
      where: { id: String(req.params.studentId) },
      include: {
        program: { include: { school: true } },
        user: { select: { email: true, isActive: true } },
        applications: {
          include: {
            admissionCycle: true,
            documents: { include: { versions: { orderBy: { versionNumber: 'desc' } } } },
            feeRecords: { orderBy: { createdAt: 'desc' } },
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    const activeApp = student.applications[0];

    return res.json({
      success: true,
      data: {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        gender: student.gender || 'MALE',
        dateOfBirth: student.dateOfBirth,
        email: student.user.email,
        maskedAadhaar: `XXXX-XXXX-${student.aadhaarLast4}`,
        programName: student.program.name,
        schoolName: student.program.school.name,
        application: activeApp ? {
          id: activeApp.id,
          applicationNo: activeApp.applicationNo,
          status: activeApp.status,
          dynamicFormData: activeApp.dynamicFormData ? JSON.parse(activeApp.dynamicFormData) : {},
          documents: activeApp.documents.map((d: any) => {
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
          feeRecords: activeApp.feeRecords,
          statusHistory: activeApp.statusHistory,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get student by ID error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch student details.' });
  }
}

/**
 * POST /api/v1/students/:studentId/admit
 * Admissions Coordinator or Super Admin grants final admission, sets status to ADMITTED, and emails confirmation.
 */
export async function admitStudent(req: Request, res: Response) {
  try {
    const studentId = String(req.params.studentId);
    const { remarks } = req.body;

    const student: any = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        program: { include: { school: true } },
        applications: {
          include: { admissionCycle: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student || !student.applications[0]) {
      return res.status(404).json({ success: false, error: 'Student or active application record not found.' });
    }

    const activeApp = student.applications[0];

    const updatedApp = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: activeApp.id },
        data: { status: 'ADMITTED' },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: activeApp.id,
          fromStatus: activeApp.status,
          toStatus: 'ADMITTED',
          changedBy: req.user?.email || 'Admissions Coordinator',
          remarks: remarks || 'Official admission granted. Document verification and fee clearance confirmed.',
        },
      });

      return app;
    });

    const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
    await sendAdmissionConfirmationEmail({
      toEmail: student.user.email,
      studentName: student.fullName,
      studentId: student.studentId,
      programName: student.program.name,
      schoolName: student.program.school.name,
      academicYear: activeApp.admissionCycle.academicYear,
      loginUrl: loginUrl,
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'CENTRAL_ADMISSIONS',
      action: 'FINAL_ADMISSION_GRANTED',
      module: 'ADMISSIONS',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, email: student.user.email, program: student.program.name },
    });

    return res.json({
      success: true,
      message: `Final admission granted for ${student.fullName} (${student.studentId}). Official confirmation email sent to ${student.user.email}.`,
      data: updatedApp,
    });
  } catch (error: any) {
    console.error('Admit student error:', error);
    return res.status(500).json({ success: false, error: 'Failed to grant final admission.' });
  }
}

/**
 * POST /api/v1/students/:studentId/request-reverification
 * Admissions Coordinator requests Office or Accounts to re-verify details.
 */
export async function requestReverification(req: Request, res: Response) {
  try {
    const studentId = String(req.params.studentId);
    const { targetDepartment, remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({ success: false, error: 'Please enter specific re-verification remarks.' });
    }

    const student: any = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        applications: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!student || !student.applications[0]) {
      return res.status(404).json({ success: false, error: 'Student or active application not found.' });
    }

    const activeApp = student.applications[0];
    const targetStatus = targetDepartment === 'ACCOUNTS' ? 'FEE_PENDING' : 'VERIFICATION_PENDING';

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: activeApp.id },
        data: { status: targetStatus },
      });

      await tx.statusHistory.create({
        data: {
          applicationId: activeApp.id,
          fromStatus: activeApp.status,
          toStatus: targetStatus,
          changedBy: req.user?.email || 'Admissions Coordinator',
          remarks: `Re-verification requested for ${targetDepartment}: ${remarks}`,
        },
      });
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'CENTRAL_ADMISSIONS',
      action: 'REVERIFICATION_REQUESTED',
      module: 'ADMISSIONS',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, targetDepartment, remarks },
    });

    return res.json({
      success: true,
      message: `Re-verification request submitted for ${targetDepartment}. Application status updated.`,
    });
  } catch (error: any) {
    console.error('Request reverification error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit re-verification request.' });
  }
}

/**
 * POST /api/v1/students/:studentId/unmask-aadhaar
 */
export async function unmaskAadhaar(req: Request, res: Response) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: String(req.params.studentId) },
    });

    if (!student || !student.encryptedAadhaar) {
      return res.status(404).json({ success: false, error: 'Student Aadhaar record not found.' });
    }

    const unmaskedAadhaar = decryptAadhaar(student.encryptedAadhaar);

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICE_USER',
      action: 'AADHAAR_UNMASKED',
      module: 'SECURITY_AUDIT',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, accessedBy: req.user?.email },
    });

    return res.json({
      success: true,
      data: {
        studentId: student.studentId,
        unmaskedAadhaar: unmaskedAadhaar,
      },
    });
  } catch (error: any) {
    console.error('Unmask Aadhaar error:', error);
    return res.status(500).json({ success: false, error: 'Failed to unmask Aadhaar number.' });
  }
}

/**
 * POST /api/v1/students/:studentId/reset-password
 */
export async function resetStudentPassword(req: Request, res: Response) {
  try {
    const student: any = await prisma.student.findUnique({
      where: { id: String(req.params.studentId) },
      include: { user: true, program: { include: { school: true } } },
    });

    if (!student || !student.user) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash, mustChangePassword: true },
    });

    const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
    await sendStudentCredentialsEmail({
      toEmail: student.user.email,
      studentName: student.fullName,
      studentId: student.studentId,
      tempPassword: tempPassword,
      programName: student.program.name,
      schoolName: student.program.school.name,
      loginUrl: loginUrl,
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'STUDENT_PASSWORD_RESET',
      module: 'USER_MANAGEMENT',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, email: student.user.email },
    });

    return res.json({
      success: true,
      message: `Password reset successfully for student ${student.studentId}. New credentials sent to ${student.user.email}.`,
      data: { temporaryPassword: tempPassword },
    });
  } catch (error: any) {
    console.error('Reset student password error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset student password.' });
  }
}
