import { Request, Response, NextFunction } from 'express';
import { verifyToken, getTokenFromRequest } from '../utils/auth';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};


