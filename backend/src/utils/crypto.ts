import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const AADHAAR_KEY = process.env.AADHAAR_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Must be 32 bytes
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

/**
 * Encrypt Sensitive Aadhaar Number using AES-256-GCM
 */
export function encryptAadhaar(aadhaarNumber: string): string {
  const iv = crypto.randomBytes(12); // 12 bytes IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(AADHAAR_KEY, 'utf-8'), iv);
  
  let encrypted = cipher.update(aadhaarNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedHex
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt Sensitive Aadhaar Number (Verification Officers only)
 */
export function decryptAadhaar(encryptedString: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(AADHAAR_KEY, 'utf-8'), iv);
  
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function generateTempPassword(): string {
  return crypto.randomBytes(4).toString('hex') + '!2026';
}

/**
 * Hash password securely using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify password against Argon2id hash
 */
export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

/**
 * JWT Token Interfaces & Helpers
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  schoolId?: string | null;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
