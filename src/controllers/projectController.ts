import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../middleware/auth';

export const createProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name) {
      const error: AppError = new Error('Project name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const result = await pool.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id, name, description, owner_id, created_at, updated_at',
      [name, description || null, req.user.userId]
    );

    const project = result.rows[0];

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, req.user.userId, 'admin']
    );

    res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          owner_id: project.owner_id,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listProjects = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const result = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at, p.updated_at
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      status: 'success',
      data: {
        projects: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      const error: AppError = new Error('Invalid project ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const projectResult = await pool.query(
      'SELECT id, name, description, owner_id, created_at, updated_at FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      const error: AppError = new Error('Project not found');
      error.statusCode = 404;
      return next(error);
    }

    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    const isOwner = projectResult.rows[0].owner_id === req.user.userId;
    const isMember = memberCheck.rows.length > 0;

    if (!isOwner && !isMember) {
      const error: AppError = new Error('Unauthorized to view this project');
      error.statusCode = 403;
      return next(error);
    }

    const membersResult = await pool.query(
      `SELECT pm.id, pm.user_id, pm.role, pm.joined_at, u.name, u.email
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [projectId]
    );

    res.json({
      status: 'success',
      data: {
        project: {
          ...projectResult.rows[0],
          members: membersResult.rows,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = parseInt(req.params.id);
    const { user_id, role } = req.body;

    if (isNaN(projectId)) {
      const error: AppError = new Error('Invalid project ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!user_id) {
      const error: AppError = new Error('User ID is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const projectResult = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      const error: AppError = new Error('Project not found');
      error.statusCode = 404;
      return next(error);
    }

    const isOwner = projectResult.rows[0].owner_id === req.user.userId;
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );
    const isAdmin = memberCheck.rows.length > 0 && memberCheck.rows[0].role === 'admin';

    if (!isOwner && !isAdmin) {
      const error: AppError = new Error('Unauthorized to add members to this project');
      error.statusCode = 403;
      return next(error);
    }

    const userCheck = await pool.query('SELECT id, role FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    const existingMember = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, user_id]
    );

    if (existingMember.rows.length > 0) {
      const error: AppError = new Error('User is already a member of this project');
      error.statusCode = 409;
      return next(error);
    }

    const memberRole = role && (role === 'admin' || role === 'reviewer') ? role : 'reviewer';

    const result = await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) RETURNING id, project_id, user_id, role, joined_at',
      [projectId, user_id, memberRole]
    );

    res.status(201).json({
      status: 'success',
      message: 'Member added to project successfully',
      data: {
        member: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    if (isNaN(projectId) || isNaN(userId)) {
      const error: AppError = new Error('Invalid project ID or user ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const projectResult = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      const error: AppError = new Error('Project not found');
      error.statusCode = 404;
      return next(error);
    }

    const isOwner = projectResult.rows[0].owner_id === req.user.userId;
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );
    const isAdmin = memberCheck.rows.length > 0 && memberCheck.rows[0].role === 'admin';

    if (!isOwner && !isAdmin) {
      const error: AppError = new Error('Unauthorized to remove members from this project');
      error.statusCode = 403;
      return next(error);
    }

    if (projectResult.rows[0].owner_id === userId) {
      const error: AppError = new Error('Cannot remove project owner');
      error.statusCode = 400;
      return next(error);
    }

    const result = await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING id',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      const error: AppError = new Error('Member not found in this project');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      status: 'success',
      message: 'Member removed from project successfully',
    });
  } catch (error) {
    next(error);
  }
};

