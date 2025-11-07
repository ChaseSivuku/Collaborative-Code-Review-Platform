import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../middleware/auth';

export const approveSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submissionId = parseInt(req.params.id);
    const { notes } = req.body;

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

    if (req.user.role !== 'reviewer') {
      const error: AppError = new Error('Only reviewers can approve submissions');
      error.statusCode = 403;
      return next(error);
    }

    const submissionResult = await pool.query(
      'SELECT project_id, submitter_id, status FROM submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const submission = submissionResult.rows[0];
    const projectId = submission.project_id;

    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    const projectCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    const isOwner = projectCheck.rows.length > 0 && projectCheck.rows[0].owner_id === req.user.userId;
    const isMember = memberCheck.rows.length > 0;

    if (!isOwner && !isMember) {
      const error: AppError = new Error('Unauthorized to review this submission');
      error.statusCode = 403;
      return next(error);
    }

    await pool.query('BEGIN');

    try {
      await pool.query(
        'UPDATE submissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['approved', submissionId]
      );

      await pool.query(
        'INSERT INTO review_history (submission_id, reviewer_id, action, notes) VALUES ($1, $2, $3, $4)',
        [submissionId, req.user.userId, 'approved', notes || null]
      );

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
         VALUES ($1, 'submission_approved', 'Submission Approved', 
         'Your submission has been approved by a reviewer', 'submission', $2)`,
        [submission.submitter_id, submissionId]
      );

      await pool.query('COMMIT');

      const updatedSubmission = await pool.query(
        'SELECT id, project_id, submitter_id, title, status, created_at, updated_at FROM submissions WHERE id = $1',
        [submissionId]
      );

      res.json({
        status: 'success',
        message: 'Submission approved successfully',
        data: {
          submission: updatedSubmission.rows[0],
        },
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const requestChanges = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submissionId = parseInt(req.params.id);
    const { notes } = req.body;

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

    if (req.user.role !== 'reviewer') {
      const error: AppError = new Error('Only reviewers can request changes');
      error.statusCode = 403;
      return next(error);
    }

    const submissionResult = await pool.query(
      'SELECT project_id, submitter_id, status FROM submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const submission = submissionResult.rows[0];
    const projectId = submission.project_id;

    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    const projectCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    const isOwner = projectCheck.rows.length > 0 && projectCheck.rows[0].owner_id === req.user.userId;
    const isMember = memberCheck.rows.length > 0;

    if (!isOwner && !isMember) {
      const error: AppError = new Error('Unauthorized to review this submission');
      error.statusCode = 403;
      return next(error);
    }

    await pool.query('BEGIN');

    try {
      await pool.query(
        'UPDATE submissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['changes_requested', submissionId]
      );

      await pool.query(
        'INSERT INTO review_history (submission_id, reviewer_id, action, notes) VALUES ($1, $2, $3, $4)',
        [submissionId, req.user.userId, 'changes_requested', notes || null]
      );

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
         VALUES ($1, 'changes_requested', 'Changes Requested', 
         'A reviewer has requested changes to your submission', 'submission', $2)`,
        [submission.submitter_id, submissionId]
      );

      await pool.query('COMMIT');

      const updatedSubmission = await pool.query(
        'SELECT id, project_id, submitter_id, title, status, created_at, updated_at FROM submissions WHERE id = $1',
        [submissionId]
      );

      res.json({
        status: 'success',
        message: 'Changes requested successfully',
        data: {
          submission: updatedSubmission.rows[0],
        },
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const getReviewHistory = async (
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

    const submissionResult = await pool.query(
      'SELECT project_id, submitter_id FROM submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const submission = submissionResult.rows[0];
    const projectId = submission.project_id;

    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    const projectCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    const isOwner = projectCheck.rows.length > 0 && projectCheck.rows[0].owner_id === req.user.userId;
    const isMember = memberCheck.rows.length > 0;
    const isSubmitter = submission.submitter_id === req.user.userId;

    if (!isOwner && !isMember && !isSubmitter) {
      const error: AppError = new Error('Unauthorized to view review history for this submission');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query(
      `SELECT rh.id, rh.submission_id, rh.reviewer_id, rh.action, rh.notes, rh.created_at,
              u.name as reviewer_name, u.email as reviewer_email
       FROM review_history rh
       JOIN users u ON rh.reviewer_id = u.id
       WHERE rh.submission_id = $1
       ORDER BY rh.created_at DESC`,
      [submissionId]
    );

    res.json({
      status: 'success',
      data: {
        reviews: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

