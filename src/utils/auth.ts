import { Request } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  return jwt.verify(token, secret) as TokenPayload;
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const getTokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};


