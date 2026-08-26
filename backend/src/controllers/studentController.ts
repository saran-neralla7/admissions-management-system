import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { encryptAadhaar, decryptAadhaar, hashPassword } from '../utils/crypto.js';
import { generateUniqueStudentId } from '../services/studentIdService.js';
import { sendStudentInviteEmail } from '../utils/mailer.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * POST /api/v1/students
 * Enforces strict rule: Student can ONLY be created if an active Academic Year & Admission Phase exists!
 */
export async function createStudent(req: Request, res: Response) {
  try {
    const { fullName, aadhaarNumber, dateOfBirth, email, programId, admissionCycleId } = req.body;

    if (!fullName || !aadhaarNumber || !dateOfBirth || !email || !programId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Full Name, Aadhaar Number, Date of Birth, Email, and Program ID are required.' 
      });
    }

    const cleanAadhaar = String(aadhaarNumber).replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      return res.status(400).json({ success: false, error: 'Aadhaar Number must be exactly 12 digits.' });
    }

    const targetProgram = await prisma.program.findUnique({
      where: { id: String(programId) },
      include: { admissionCycles: { where: { isActive: true } } },
    });

    if (!targetProgram) {
      return res.status(404).json({ success: false, error: 'Target Program not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId && req.user?.schoolId !== targetProgram.schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Cannot create student for another school.' });
    }

    // STRICT CHECK: Verify active admission cycle
    let selectedCycle: any = null;
    if (admissionCycleId) {
      selectedCycle = targetProgram.admissionCycles.find((c) => c.id === String(admissionCycleId));
    } else {
      selectedCycle = targetProgram.admissionCycles[0];
    }

    if (!selectedCycle) {
      return res.status(400).json({
        success: false,
        error: 'No active Academic Year & Admission Phase configured for this program. Super Admin / School Admin must create an Academic Cycle under System Management before enrolling students.',
      });
    }

    const year = selectedCycle.academicYear;
    const studentId = await generateUniqueStudentId(String(programId), year);

    const temporaryPassword = crypto.randomBytes(5).toString('hex') + '!2026';
    const passwordHash = await hashPassword(temporaryPassword);

    const encryptedAadhaar = encryptAadhaar(cleanAadhaar);
    const aadhaarLast4 = cleanAadhaar.slice(-4);

    const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
    if (!studentRole) {
      return res.status(500).json({ success: false, error: 'STUDENT role not initialized in system database.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: String(email).toLowerCase().trim(),
          passwordHash: passwordHash,
          mustChangePassword: true,
          roleId: studentRole.id,
        },
      });

      const student = await tx.student.create({
        data: {
          studentId: studentId,
          encryptedAadhaar: encryptedAadhaar,
          aadhaarLast4: aadhaarLast4,
          fullName: String(fullName).trim(),
          dateOfBirth: new Date(dateOfBirth),
          userId: user.id,
          programId: String(programId),
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
    await sendStudentInviteEmail({
      toEmail: String(email),
      studentName: String(fullName),
      studentId: studentId,
      temporaryPassword: temporaryPassword,
      loginUrl: loginUrl,
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICE_USER',
      action: 'STUDENT_CREATED',
      module: 'ADMISSIONS',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId, email, programId, admissionCycleId: selectedCycle.id, cycleTitle: selectedCycle.title },
    });

    return res.status(210).json({
      success: true,
      message: 'Student account created and invitation email dispatched.',
      data: {
        studentId: result.student.studentId,
        fullName: result.student.fullName,
        email: result.user.email,
        temporaryPassword: temporaryPassword,
        cycleTitle: selectedCycle.title,
        academicYear: selectedCycle.academicYear,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Student email or ID already registered.' });
    }
    console.error('Create student error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create student account.' });
  }
}

/**
 * GET /api/v1/students
 */
export async function getStudents(req: Request, res: Response) {
  try {
    const { schoolId, programId } = req.query;

    let whereClause: any = {};
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId) {
      whereClause.program = { schoolId: req.user.schoolId };
    } else if (schoolId) {
      whereClause.program = { schoolId: String(schoolId) };
    }

    if (programId) {
      whereClause.programId = String(programId);
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

    const maskedStudents = students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      email: s.user.email,
      dateOfBirth: s.dateOfBirth,
      maskedAadhaar: `XXXX-XXXX-${s.aadhaarLast4}`,
      programName: s.program.name,
      schoolName: s.program.school.name,
      academicYear: s.applications[0]?.admissionCycle?.academicYear || 'N/A',
      cycleTitle: s.applications[0]?.admissionCycle?.title || 'N/A',
      applicationStatus: s.applications[0]?.status || 'ADMISSION_CREATED',
      applicationId: s.applications[0]?.id,
      customFormData: s.applications[0]?.customFormData ? JSON.parse(s.applications[0].customFormData) : {},
      documents: s.applications[0]?.documents || [],
      feeRecords: s.applications[0]?.feeRecords || [],
      createdAt: s.createdAt,
    }));

    return res.json({ success: true, data: maskedStudents });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch student roster.' });
  }
}

/**
 * POST /api/v1/students/:id/unmask-aadhaar
 * Audited endpoint to view unmasked Aadhaar
 */
export async function unmaskAadhaar(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const student = await prisma.student.findUnique({
      where: { id },
      include: { program: { select: { schoolId: true } } },
    });

    if (!student || !student.program) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId && req.user?.schoolId !== student.program.schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with student school.' });
    }

    const decrypted = decryptAadhaar(student.encryptedAadhaar);

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICE_USER',
      action: 'AADHAAR_UNMASKED',
      module: 'SECURITY',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, studentDbId: student.id },
    });

    return res.json({
      success: true,
      data: {
        studentId: student.studentId,
        unmaskedAadhaar: decrypted,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to unmask Aadhaar number.' });
  }
}

/**
 * POST /api/v1/students/:id/reset-password
 * Resets student temporary password, dispatches invitation email, and returns new password.
 */
export async function resetStudentPassword(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        program: { select: { schoolId: true } },
      },
    });

    if (!student || !student.user) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId && req.user?.schoolId !== student.program.schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Mismatch with student school.' });
    }

    const temporaryPassword = crypto.randomBytes(5).toString('hex') + '!2026';
    const passwordHash = await hashPassword(temporaryPassword);

    await prisma.user.update({
      where: { id: student.user.id },
      data: {
        passwordHash: passwordHash,
        mustChangePassword: true,
      },
    });

    const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000/login';
    await sendStudentInviteEmail({
      toEmail: student.user.email,
      studentName: student.fullName,
      studentId: student.studentId,
      temporaryPassword: temporaryPassword,
      loginUrl: loginUrl,
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'OFFICE_USER',
      action: 'PASSWORD_RESET',
      module: 'SECURITY',
      ipAddress: req.ip || '127.0.0.1',
      details: { studentId: student.studentId, email: student.user.email },
    });

    return res.json({
      success: true,
      message: 'Student temporary password reset successfully.',
      data: {
        studentId: student.studentId,
        email: student.user.email,
        temporaryPassword: temporaryPassword,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to reset student password.' });
  }
}
