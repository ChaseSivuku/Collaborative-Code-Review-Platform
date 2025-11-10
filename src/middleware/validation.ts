import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const err: AppError = new Error(error.details[0].message);
      err.statusCode = 400;
      return next(err);
    }
    next();
  };
};

export const validateId = (id: string): number | null => {
  const parsed = parseInt(id);
  return isNaN(parsed) ? null : parsed;
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  if (isNaN(limit) || limit < 1 || limit > 100) {
    const error: AppError = new Error('Invalid limit. Must be between 1 and 100');
    error.statusCode = 400;
    return next(error);
  }

  if (isNaN(offset) || offset < 0) {
    const error: AppError = new Error('Invalid offset. Must be >= 0');
    error.statusCode = 400;
    return next(error);
  }

  req.query.limit = limit.toString();
  req.query.offset = offset.toString();
  next();
};
