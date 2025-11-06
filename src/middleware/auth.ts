import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from './error-handler';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authentication required');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    const err: AppError = new Error('Invalid or expired token');
    err.statusCode = 401;
    next(err);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const err: AppError = new Error('Authentication required');
      err.statusCode = 401;
      return next(err);
    }

    if (!roles.includes(req.user.role)) {
      const err: AppError = new Error('Insufficient permissions');
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
};

