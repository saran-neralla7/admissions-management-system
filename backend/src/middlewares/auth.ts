import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/crypto.js';

// Extend Express Request interface to hold authenticated user details
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware: Verify JWT Access Token from Cookie or Bearer Header
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired access token.' });
  }
}

/**
 * Middleware: Enforce Role-Based Access Control (RBAC)
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Forbidden. Role '${req.user.role}' is not authorized for this action.` 
      });
    }

    next();
  };
}

/**
 * Middleware: Enforce School Isolation
 * Non-Super-Admins can only access records matching their assigned schoolId.
 */
export function enforceSchoolIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  // Super Admin and Central Accounts bypass school isolation
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'CENTRAL_ACCOUNTS') {
    return next();
  }

  const userSchoolId = req.user.schoolId;
  if (!userSchoolId) {
    return res.status(403).json({ success: false, error: 'Forbidden. User is not assigned to any school.' });
  }

  // Inject school filter helper onto request object or validate requested schoolId
  const targetSchoolId = req.params.schoolId || req.query.schoolId || req.body.schoolId;

  if (targetSchoolId && targetSchoolId !== userSchoolId) {
    return res.status(403).json({ 
      success: false, 
      error: 'Forbidden. You do not have permission to access data outside your assigned school.' 
    });
  }

  next();
}
