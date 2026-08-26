import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { hashPassword } from '../utils/crypto.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * GET /api/v1/users
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        userSchools: { select: { school: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      roleName: u.role.name,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      schoolName: u.userSchools[0]?.school?.name || 'Global System',
      schoolId: u.userSchools[0]?.school?.id || null,
      createdAt: u.createdAt,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
}

/**
 * POST /api/v1/users
 */
export async function createUser(req: Request, res: Response) {
  try {
    const { email, roleName, schoolId, password } = req.body;

    if (!email || !roleName) {
      return res.status(400).json({ success: false, error: 'Email and roleName are required.' });
    }

    const targetRole = await prisma.role.findUnique({ where: { name: String(roleName).toUpperCase() } });
    if (!targetRole) {
      return res.status(400).json({ success: false, error: 'Invalid role specified.' });
    }

    const tempPassword = password || crypto.randomBytes(5).toString('hex') + '!2026';
    const passwordHash = await hashPassword(tempPassword);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: String(email).toLowerCase().trim(),
          passwordHash: passwordHash,
          mustChangePassword: true,
          roleId: targetRole.id,
        },
      });

      if (schoolId && targetRole.name !== 'SUPER_ADMIN') {
        await tx.userSchool.create({
          data: {
            userId: u.id,
            schoolId: String(schoolId),
          },
        });
      }

      return u;
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'USER_CREATED',
      module: 'USER_MANAGEMENT',
      ipAddress: req.ip || '127.0.0.1',
      details: { createdUserId: newUser.id, email: newUser.email, role: targetRole.name, schoolId },
    });

    return res.status(210).json({
      success: true,
      message: 'System user account created successfully.',
      data: {
        userId: newUser.id,
        email: newUser.email,
        role: targetRole.name,
        temporaryPassword: tempPassword,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'User email already exists.' });
    }
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create user account.' });
  }
}

/**
 * PUT /api/v1/users/:id (Super Admin Edit User)
 */
export async function updateUser(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { email, roleName, schoolId, isActive, password } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    let roleId = user.roleId;
    if (roleName) {
      const targetRole = await prisma.role.findUnique({ where: { name: String(roleName).toUpperCase() } });
      if (targetRole) roleId = targetRole.id;
    }

    let newPasswordHash: string | undefined;
    if (password && password.length >= 8) {
      newPasswordHash = await hashPassword(password);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(email && { email: String(email).toLowerCase().trim() }),
          ...(roleId && { roleId }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(newPasswordHash && { passwordHash: newPasswordHash, mustChangePassword: false }),
        },
      });

      if (schoolId) {
        await tx.userSchool.deleteMany({ where: { userId: id } });
        await tx.userSchool.create({
          data: {
            userId: id,
            schoolId: String(schoolId),
          },
        });
      }
    });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'USER_UPDATED',
      module: 'USER_MANAGEMENT',
      ipAddress: req.ip || '127.0.0.1',
      details: { updatedUserId: id, email, roleName, isActive },
    });

    return res.json({ success: true, message: 'User account updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to update user account.' });
  }
}

/**
 * DELETE /api/v1/users/:id (Super Admin Delete User)
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    // Prevent Super Admin from deleting self
    if (req.user?.userId === id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own active Super Admin account.' });
    }

    const user = await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.userId,
      roleName: req.user?.role || 'SUPER_ADMIN',
      action: 'USER_DELETED',
      module: 'USER_MANAGEMENT',
      ipAddress: req.ip || '127.0.0.1',
      details: { deletedUserId: id, email: user.email },
    });

    return res.json({ success: true, message: 'User account deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete user account.' });
  }
}

/**
 * GET /api/v1/roles
 */
export async function getRoles(req: Request, res: Response) {
  try {
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    return res.json({ success: true, data: roles });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch roles.' });
  }
}
