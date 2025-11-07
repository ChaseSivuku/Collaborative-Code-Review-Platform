import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../middleware/auth';

export const createSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { project_id, title, code_content, file_name } = req.body;

    if (!project_id || !title || !code_content) {
      const error: AppError = new Error('Project ID, title, and code content are required');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const projectId = parseInt(project_id);
    if (isNaN(projectId)) {
      const error: AppError = new Error('Invalid project ID');
      error.statusCode = 400;
      return next(error);
    }

    // Check if project exists
    const projectResult = await pool.query(
      'SELECT id, owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      const error: AppError = new Error('Project not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if user is project owner or member
    const isOwner = projectResult.rows[0].owner_id === req.user.userId;
    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );
    const isMember = memberCheck.rows.length > 0;

    if (!isOwner && !isMember) {
      const error: AppError = new Error('Unauthorized to create submissions for this project');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query(
      `INSERT INTO submissions (project_id, submitter_id, title, code_content, file_name, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, project_id, submitter_id, title, code_content, file_name, status, created_at, updated_at`,
      [projectId, req.user.userId, title, code_content, file_name || null]
    );

    res.status(201).json({
      status: 'success',
      message: 'Submission created successfully',
      data: {
        submission: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listSubmissionsByProject = async (
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

    // Check if project exists
    const projectResult = await pool.query(
      'SELECT id, owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      const error: AppError = new Error('Project not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if user is project owner or member
    const isOwner = projectResult.rows[0].owner_id === req.user.userId;
    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );
    const isMember = memberCheck.rows.length > 0;

    if (!isOwner && !isMember) {
      const error: AppError = new Error('Unauthorized to view submissions for this project');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query(
      `SELECT id, project_id, submitter_id, title, code_content, file_name, status, created_at, updated_at
       FROM submissions
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );

    res.json({
      status: 'success',
      data: {
        submissions: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submissionId = parseInt(req.params.id);

    if (isNaN(submissionId)) {
      const error: AppError = new Error('Invalid submission ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    // Get submission with project info
    const submissionResult = await pool.query(
      `SELECT s.id, s.project_id, s.submitter_id, s.title, s.code_content, s.file_name, 
              s.status, s.created_at, s.updated_at, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const submission = submissionResult.rows[0];

    // Check if user is project owner or member
    const isOwner = submission.owner_id === req.user.userId;
    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [submission.project_id, req.user.userId]
    );
    const isMember = memberCheck.rows.length > 0;

    if (!isOwner && !isMember) {
      const error: AppError = new Error('Unauthorized to view this submission');
      error.statusCode = 403;
      return next(error);
    }

    // Remove owner_id from response
    const { owner_id, ...submissionData } = submission;

    res.json({
      status: 'success',
      data: {
        submission: submissionData,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubmissionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submissionId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(submissionId)) {
      const error: AppError = new Error('Invalid submission ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!status) {
      const error: AppError = new Error('Status is required');
      error.statusCode = 400;
      return next(error);
    }

    const validStatuses = ['pending', 'in_review', 'approved', 'changes_requested'];
    if (!validStatuses.includes(status)) {
      const error: AppError = new Error('Invalid status. Must be one of: pending, in_review, approved, changes_requested');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    // Get submission with project info
    const submissionResult = await pool.query(
      `SELECT s.id, s.project_id, s.status, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const submission = submissionResult.rows[0];

    // Check if user is project owner or member with reviewer/admin role
    const isOwner = submission.owner_id === req.user.userId;
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [submission.project_id, req.user.userId]
    );
    const isMember = memberCheck.rows.length > 0;
    const isAdmin = isMember && memberCheck.rows[0].role === 'admin';
    
    // Also check if user is a reviewer (either in project_members or has reviewer role)
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
    const isReviewer = userCheck.rows.length > 0 && userCheck.rows[0].role === 'reviewer';

    if (!isOwner && !isAdmin && !(isMember && isReviewer)) {
      const error: AppError = new Error('Unauthorized to update submission status. Only reviewers, admins, or project owners can update status.');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query(
      `UPDATE submissions
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, project_id, submitter_id, title, code_content, file_name, status, created_at, updated_at`,
      [status, submissionId]
    );

    res.json({
      status: 'success',
      message: 'Submission status updated successfully',
      data: {
        submission: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submissionId = parseInt(req.params.id);

    if (isNaN(submissionId)) {
      const error: AppError = new Error('Invalid submission ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    // Get submission with project info
    const submissionResult = await pool.query(
      `SELECT s.id, s.submitter_id, s.project_id, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const submission = submissionResult.rows[0];

    // Check if user is the submitter, project owner, or project admin
    const isSubmitter = submission.submitter_id === req.user.userId;
    const isOwner = submission.owner_id === req.user.userId;
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [submission.project_id, req.user.userId]
    );
    const isAdmin = memberCheck.rows.length > 0 && memberCheck.rows[0].role === 'admin';

    if (!isSubmitter && !isOwner && !isAdmin) {
      const error: AppError = new Error('Unauthorized to delete this submission. Only the submitter, project owner, or project admin can delete submissions.');
      error.statusCode = 403;
      return next(error);
    }

    await pool.query('DELETE FROM submissions WHERE id = $1', [submissionId]);

    res.json({
      status: 'success',
      message: 'Submission deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

