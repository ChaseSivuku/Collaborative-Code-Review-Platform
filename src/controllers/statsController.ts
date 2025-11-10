import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../middleware/auth';

export const getProjectStats = async (
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

    const projectCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      const error: AppError = new Error('Project not found');
      error.statusCode = 404;
      return next(error);
    }

    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    const isOwner = projectCheck.rows[0].owner_id === req.user.userId;
    const isMember = memberCheck.rows.length > 0;

    if (!isOwner && !isMember) {
      const error: AppError = new Error('Unauthorized to view project statistics');
      error.statusCode = 403;
      return next(error);
    }

    const submissionsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'changes_requested' THEN 1 END) as changes_requested_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'in_review' THEN 1 END) as in_review_count
       FROM submissions
       WHERE project_id = $1`,
      [projectId]
    );

    const avgReviewTimeResult = await pool.query(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (rh.created_at - s.created_at)) / 3600) as avg_review_hours
       FROM review_history rh
       JOIN submissions s ON rh.submission_id = s.id
       WHERE s.project_id = $1 AND rh.action IN ('approved', 'changes_requested')`,
      [projectId]
    );

    const reviewerActivityResult = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT rh.submission_id) as reviews_count,
        COUNT(DISTINCT c.id) as comments_count
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       LEFT JOIN review_history rh ON rh.reviewer_id = u.id
       LEFT JOIN submissions s ON rh.submission_id = s.id AND s.project_id = $1
       LEFT JOIN comments c ON c.reviewer_id = u.id
       LEFT JOIN submissions s2 ON c.submission_id = s2.id AND s2.project_id = $1
       WHERE pm.project_id = $1
       GROUP BY u.id, u.name, u.email
       ORDER BY reviews_count DESC, comments_count DESC`,
      [projectId]
    );

    const mostCommentedSubmissionResult = await pool.query(
      `SELECT 
        s.id,
        s.title,
        s.status,
        COUNT(c.id) as comment_count
       FROM submissions s
       LEFT JOIN comments c ON c.submission_id = s.id
       WHERE s.project_id = $1
       GROUP BY s.id, s.title, s.status
       ORDER BY comment_count DESC
       LIMIT 1`,
      [projectId]
    );

    const stats = {
      total_submissions: parseInt(submissionsResult.rows[0].total_submissions || '0'),
      approved_count: parseInt(submissionsResult.rows[0].approved_count || '0'),
      changes_requested_count: parseInt(submissionsResult.rows[0].changes_requested_count || '0'),
      pending_count: parseInt(submissionsResult.rows[0].pending_count || '0'),
      in_review_count: parseInt(submissionsResult.rows[0].in_review_count || '0'),
      approval_rate: submissionsResult.rows[0].total_submissions > 0
        ? ((parseInt(submissionsResult.rows[0].approved_count || '0') / parseInt(submissionsResult.rows[0].total_submissions)) * 100).toFixed(2)
        : '0.00',
      rejection_rate: submissionsResult.rows[0].total_submissions > 0
        ? ((parseInt(submissionsResult.rows[0].changes_requested_count || '0') / parseInt(submissionsResult.rows[0].total_submissions)) * 100).toFixed(2)
        : '0.00',
      avg_review_time_hours: avgReviewTimeResult.rows[0].avg_review_hours
        ? parseFloat(avgReviewTimeResult.rows[0].avg_review_hours).toFixed(2)
        : '0.00',
      reviewer_activity: reviewerActivityResult.rows,
      most_commented_submission: mostCommentedSubmissionResult.rows.length > 0
        ? mostCommentedSubmissionResult.rows[0]
        : null,
    };

    res.json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

