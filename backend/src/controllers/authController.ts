import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { verifyPassword, hashPassword, generateAccessToken, generateRefreshToken } from '../utils/crypto.js';
import { createAuditLog } from '../services/auditService.js';

/**
 * POST /api/v1/auth/login
 * Supports login via EITHER Email Address OR Student ID (e.g. GVPCSE2026-001)!
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email / Student ID and password are required.' });
    }

    const loginInput = String(email).trim();
    const inputLower = loginInput.toLowerCase();

    // Map short User IDs (admin, office, accounts) to system email accounts
    let searchEmails: string[] = [inputLower];
    if (inputLower === 'admin') {
      searchEmails.push('admin@gvpihlr.edu.in', 'admin@gvp.edu.in');
    } else if (inputLower === 'admissions' || inputLower === 'central.admissions') {
      searchEmails.push('admissions@gvpihlr.edu.in', 'admissions@gvp.edu.in');
    } else if (inputLower === 'schooladmissions' || inputLower === 'school.admissions') {
      searchEmails.push('school.admissions@gvpihlr.edu.in', 'school.admissions@gvp.edu.in');
    } else if (inputLower === 'centraloffice' || inputLower === 'central.office') {
      searchEmails.push('central.office@gvpihlr.edu.in', 'central.office@gvp.edu.in');
    } else if (inputLower === 'office') {
      searchEmails.push('office@gvpihlr.edu.in', 'office@gvp.edu.in');
    } else if (inputLower === 'accounts' || inputLower === 'central.accounts') {
      searchEmails.push('accounts@gvpihlr.edu.in', 'accounts@gvp.edu.in');
    } else if (inputLower === 'schoolaccounts' || inputLower === 'school.accounts') {
      searchEmails.push('school.accounts@gvpihlr.edu.in', 'school.accounts@gvp.edu.in');
    } else if (inputLower === 'schooladmin' || inputLower === 'school.admin') {
      searchEmails.push('school.admin@gvpihlr.edu.in', 'school.admin@gvp.edu.in');
    }

    // Query user by email OR User ID alias OR Student ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { in: searchEmails } },
          { student: { studentId: loginInput } },
        ],
      },
      include: {
        role: true,
        userSchools: { select: { schoolId: true } },
        student: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid login ID or password.' });
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid login ID or password.' });
    }

    // Determine school binding for non-Super Admin
    const assignedSchoolId = user.userSchools.length > 0 ? user.userSchools[0].schoolId : null;

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      schoolId: assignedSchoolId,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    // Write audit log
    await createAuditLog({
      userId: user.id,
      roleName: user.role.name,
      action: 'USER_LOGIN',
      module: 'AUTH',
      ipAddress: req.ip || '127.0.0.1',
      details: { loginInput, email: user.email, studentId: user.student?.studentId },
    });

    // Set HTTP-Only SameSite Cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        studentId: user.student?.studentId,
        role: user.role.name,
        mustChangePassword: user.mustChangePassword,
        schoolId: assignedSchoolId,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
}

/**
 * POST /api/v1/auth/change-password
 */
export async function changePassword(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters long.' 
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const isValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Incorrect current password.' });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    await createAuditLog({
      userId: user.id,
      roleName: req.user.role,
      action: 'PASSWORD_CHANGED',
      module: 'AUTH',
      ipAddress: req.ip || '127.0.0.1',
      details: { email: user.email },
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to change password.' });
  }
}

/**
 * GET /api/v1/auth/me
 */
export async function getMe(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        mustChangePassword: true,
        role: { select: { name: true, permissions: true } },
        userSchools: { select: { school: { select: { id: true, name: true, code: true } } } },
        student: {
          select: {
            studentId: true,
            fullName: true,
            program: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!user) return res.status(404).json({ success: false, error: 'User profile not found.' });

    return res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch profile.' });
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logout(req: Request, res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  if (req.user) {
    await createAuditLog({
      userId: req.user.userId,
      roleName: req.user.role,
      action: 'USER_LOGOUT',
      module: 'AUTH',
      ipAddress: req.ip || '127.0.0.1',
      details: {},
    });
  }

  return res.json({ success: true, message: 'Logged out successfully.' });
}
