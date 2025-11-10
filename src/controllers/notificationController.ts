import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../middleware/auth';

export const getUserNotifications = async (
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

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    if (req.user.userId !== userId) {
      const error: AppError = new Error('Unauthorized to view these notifications');
      error.statusCode = 403;
      return next(error);
    }

    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (unread_only === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1' + (unread_only === 'true' ? ' AND is_read = false' : ''),
      [userId]
    );

    res.json({
      status: 'success',
      data: {
        notifications: result.rows,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      const error: AppError = new Error('Invalid notification ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, req.user.userId]
    );

    if (result.rows.length === 0) {
      const error: AppError = new Error('Notification not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      status: 'success',
      message: 'Notification marked as read',
      data: {
        notification: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

