import { prisma } from '../config/prisma.js';

export interface AuditLogParams {
  userId?: string | null;
  roleName: string;
  action: string;
  module: string;
  ipAddress: string;
  details: Record<string, any>;
}

/**
 * Record an immutable audit log entry in the database.
 * Gracefully verifies user existence to prevent stale JWT cookie FK errors.
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    let validUserId = params.userId || null;
    if (validUserId) {
      const userExists = await prisma.user.findUnique({ where: { id: validUserId }, select: { id: true } });
      if (!userExists) {
        validUserId = null;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        roleName: params.roleName,
        action: params.action,
        module: params.module,
        ipAddress: params.ipAddress,
        details: JSON.stringify(params.details),
      },
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
  }
}
