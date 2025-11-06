import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { hashPassword } from '../utils/password';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../middleware/auth';

export const getUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      const error: AppError = new Error('Invalid user ID');
      error.statusCode = 400;
      return next(error);
    }

    if (req.user?.userId !== userId && req.user?.role !== 'reviewer') {
      const error: AppError = new Error('Unauthorized to view this profile');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query(
      'SELECT id, email, name, role, display_picture, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    const user = result.rows[0];

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          display_picture: user.display_picture,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      const error: AppError = new Error('Invalid user ID');
      error.statusCode = 400;
      return next(error);
    }

    if (req.user?.userId !== userId) {
      const error: AppError = new Error('Unauthorized to update this profile');
      error.statusCode = 403;
      return next(error);
    }

    const { name, display_picture, password } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (display_picture !== undefined) {
      updateFields.push(`display_picture = $${paramIndex}`);
      values.push(display_picture);
      paramIndex++;
    }

    if (password !== undefined) {
      const passwordHash = await hashPassword(password);
      updateFields.push(`password_hash = $${paramIndex}`);
      values.push(passwordHash);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      const error: AppError = new Error('No fields to update');
      error.statusCode = 400;
      return next(error);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, display_picture, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    const user = result.rows[0];

    res.json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          display_picture: user.display_picture,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      const error: AppError = new Error('Invalid user ID');
      error.statusCode = 400;
      return next(error);
    }

    if (req.user?.userId !== userId && req.user?.role !== 'reviewer') {
      const error: AppError = new Error('Unauthorized to delete this user');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    if (result.rows.length === 0) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

