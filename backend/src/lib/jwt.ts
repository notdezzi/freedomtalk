/**
 * JWT Utility Library
 * JSON Web Token Generation and Verification
 * FreedomTalk Backend - Discord Clone
 */

import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { TokenPayload } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export function generateToken(userId: string): { token: string; expires: number } {
  const payload: TokenPayload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const decoded = jwt.decode(token) as any;
  const expires = decoded.exp;

  return { token, expires };
}

export function generateRefreshToken(userId: string): { token: string; expires: number } {
  const payload: TokenPayload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    tokenType: 'refresh',
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  const decoded = jwt.decode(token) as any;
  const expires = decoded.exp;

  return { token, expires };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function decodeToken(token: string): any | null {
  try {
    const payload = jwt.decode(token) as any;
    return payload;
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    console.error('Token expiry check failed:', error);
    return true;
  }
}
