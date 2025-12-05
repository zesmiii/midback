import { AuthRequest } from '../middleware/auth';
import { getTokenFromRequest, verifyToken } from '../utils/auth';

export interface Context {
  req: AuthRequest;
  userId?: string;
  userEmail?: string;
}

export const createContext = async ({ req }: { req: AuthRequest }): Promise<Context> => {
  const token = getTokenFromRequest(req);
  
  if (token) {
    try {
      const payload = verifyToken(token);
      return {
        req,
        userId: payload.userId,
        userEmail: payload.email,
      };
    } catch (error) {
      // Токен невалидный, но продолжаем без аутентификации
    }
  }

  return {
    req,
  };
};


