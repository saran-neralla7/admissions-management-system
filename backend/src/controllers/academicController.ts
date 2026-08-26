import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * GET /api/v1/academics/schools
 */
export async function getSchools(req: Request, res: Response) {
  try {
    const userRole = req.user?.role;
    const userSchoolId = req.user?.schoolId;

    let whereClause = {};
    if (userRole !== 'SUPER_ADMIN' && userSchoolId) {
      whereClause = { id: userSchoolId };
    }

    const schools = await prisma.school.findMany({
      where: whereClause,
      include: {
        programs: {
          include: {
            admissionCycles: { orderBy: { academicYear: 'desc' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: schools });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch schools.' });
  }
}

/**
 * POST /api/v1/academics/schools (Super Admin only)
 */
export async function createSchool(req: Request, res: Response) {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'School name and unique code are required.' });
    }

    const school = await prisma.school.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'SCHOOL_CREATED',
      module: 'ACADEMICS',
      ipAddress: req.ip || '127.0.0.1',
      details: { schoolId: school.id, name: school.name, code: school.code },
    });

    return res.status(210).json({ success: true, data: school });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'School code already exists.' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create school.' });
  }
}

/**
 * PUT /api/v1/academics/schools/:id (Super Admin Edit)
 */
export async function updateSchool(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { name, code } = req.body;

    const school = await prisma.school.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'SCHOOL_UPDATED',
      module: 'ACADEMICS',
      ipAddress: req.ip || '127.0.0.1',
      details: { schoolId: school.id, name: school.name, code: school.code },
    });

    return res.json({ success: true, message: 'School updated successfully.', data: school });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update school.' });
  }
}

/**
 * DELETE /api/v1/academics/schools/:id (Super Admin Delete)
 */
export async function deleteSchool(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const school = await prisma.school.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'SCHOOL_DELETED',
      module: 'ACADEMICS',
      ipAddress: req.ip || '127.0.0.1',
      details: { schoolId: id, name: school.name, code: school.code },
    });

    return res.json({ success: true, message: 'School deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete school.' });
  }
}

/**
 * POST /api/v1/academics/programs
 */
export async function createProgram(req: Request, res: Response) {
  try {
    const { schoolId, name, code, studentIdPrefix, applicationFee } = req.body;

    if (!schoolId || !name || !code || !studentIdPrefix) {
      return res.status(400).json({ 
        success: false, 
        error: 'School ID, Program name, code, and Student ID prefix are required.' 
      });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.schoolId !== schoolId) {
      return res.status(403).json({ success: false, error: 'Forbidden. Cannot create program in another school.' });
    }

    const program = await prisma.program.create({
      data: {
        schoolId: String(schoolId),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        studentIdPrefix: studentIdPrefix.trim().toUpperCase(),
        applicationFee: applicationFee ? parseFloat(applicationFee) : 1000.0,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'ADMIN',
      action: 'PROGRAM_CREATED',
      module: 'ACADEMICS',
      ipAddress: req.ip || '127.0.0.1',
      details: { programId: program.id, name: program.name, code: program.code },
    });

    return res.status(210).json({ success: true, data: program });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Program code already exists in this school.' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create program.' });
  }
}

/**
 * PUT /api/v1/academics/programs/:id (Super Admin / School Admin Edit)
 */
export async function updateProgram(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { name, code, studentIdPrefix, applicationFee } = req.body;

    const program = await prisma.program.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(studentIdPrefix && { studentIdPrefix: studentIdPrefix.trim().toUpperCase() }),
        ...(applicationFee !== undefined && { applicationFee: parseFloat(applicationFee) }),
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'ADMIN',
      action: 'PROGRAM_UPDATED',
      module: 'ACADEMICS',
      ipAddress: req.ip || '127.0.0.1',
      details: { programId: program.id, name: program.name, code: program.code },
    });

    return res.json({ success: true, message: 'Program updated successfully.', data: program });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update program.' });
  }
}

/**
 * DELETE /api/v1/academics/programs/:id
 */
export async function deleteProgram(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const program = await prisma.program.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'PROGRAM_DELETED',
      module: 'ACADEMICS',
      ipAddress: req.ip || '127.0.0.1',
      details: { programId: id, name: program.name, code: program.code },
    });

    return res.json({ success: true, message: 'Program deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete program.' });
  }
}

/**
 * GET /api/v1/academics/cycles
 */
export async function getAdmissionCycles(req: Request, res: Response) {
  try {
    const cycles = await prisma.admissionCycle.findMany({
      include: { program: { select: { name: true, code: true, school: { select: { name: true } } } } },
      orderBy: { academicYear: 'desc' },
    });
    return res.json({ success: true, data: cycles });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch admission cycles.' });
  }
}

/**
 * POST /api/v1/academics/cycles (Create Academic Year / Admission Cycle)
 */
export async function createAdmissionCycle(req: Request, res: Response) {
  try {
    const { programId, academicYear, title, isActive } = req.body;

    if (!programId || !academicYear || !title) {
      return res.status(400).json({ success: false, error: 'programId, academicYear, and title are required.' });
    }

    const cycle = await prisma.admissionCycle.create({
      data: {
        programId: String(programId),
        academicYear: parseInt(String(academicYear), 10),
        title: String(title).trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'ADMIN',
      action: 'ADMISSION_CYCLE_CREATED',
      module: 'ACADEMICS',
      ipAddress: req.ip || '127.0.0.1',
      details: { cycleId: cycle.id, academicYear: cycle.academicYear, title: cycle.title },
    });

    return res.status(210).json({ success: true, data: cycle });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to create admission cycle.' });
  }
}

/**
 * PUT /api/v1/academics/cycles/:id
 */
export async function updateAdmissionCycle(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { academicYear, title, isActive } = req.body;

    const cycle = await prisma.admissionCycle.update({
      where: { id },
      data: {
        ...(academicYear && { academicYear: parseInt(String(academicYear), 10) }),
        ...(title && { title: String(title).trim() }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return res.json({ success: true, message: 'Admission cycle updated successfully.', data: cycle });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update admission cycle.' });
  }
}

/**
 * DELETE /api/v1/academics/cycles/:id
 */
export async function deleteAdmissionCycle(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    await prisma.admissionCycle.delete({ where: { id } });

    return res.json({ success: true, message: 'Admission cycle deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete admission cycle.' });
  }
}
