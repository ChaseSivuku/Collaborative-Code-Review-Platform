import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/error-handler';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      const error: AppError = new Error('Email, password, and name are required');
      error.statusCode = 400;
      return next(error);
    }

    const validRoles = ['submitter', 'reviewer'];
    const userRole = role && validRoles.includes(role) ? role : 'submitter';

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const error: AppError = new Error('User with this email already exists');
      error.statusCode = 409;
      return next(error);
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, display_picture, created_at',
      [email, passwordHash, name, userRole]
    );

    const user = result.rows[0];

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          display_picture: user.display_picture,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error: AppError = new Error('Email and password are required');
      error.statusCode = 400;
      return next(error);
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, display_picture FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      const error: AppError = new Error('Invalid email or password');
      error.statusCode = 401;
      return next(error);
    }

    const user = result.rows[0];

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      const error: AppError = new Error('Invalid email or password');
      error.statusCode = 401;
      return next(error);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          display_picture: user.display_picture,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

