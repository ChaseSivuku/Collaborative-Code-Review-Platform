import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }
    next();
  };
};

