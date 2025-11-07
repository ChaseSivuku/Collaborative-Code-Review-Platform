import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../middleware/auth';

export const addComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const submissionId = parseInt(req.params.id);
    const { content, line_number } = req.body;

    if (isNaN(submissionId)) {
      const error: AppError = new Error('Invalid submission ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!content) {
      const error: AppError = new Error('Comment content is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    if (req.user.role !== 'reviewer') {
      const error: AppError = new Error('Only reviewers can add comments');
      error.statusCode = 403;
      return next(error);
    }

    const submissionResult = await pool.query(
      'SELECT project_id FROM submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const projectId = submissionResult.rows[0].project_id;

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
      const error: AppError = new Error('Unauthorized to comment on this submission');
      error.statusCode = 403;
      return next(error);
    }

    const isInline = line_number !== undefined && line_number !== null;
    const lineNum = isInline ? parseInt(line_number) : null;

    if (isInline && (isNaN(lineNum as number) || lineNum! < 1)) {
      const error: AppError = new Error('Invalid line number');
      error.statusCode = 400;
      return next(error);
    }

    const result = await pool.query(
      'INSERT INTO comments (submission_id, reviewer_id, content, line_number, is_inline) VALUES ($1, $2, $3, $4, $5) RETURNING id, submission_id, reviewer_id, content, line_number, is_inline, created_at, updated_at',
      [submissionId, req.user.userId, content, lineNum, isInline]
    );

    res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: {
        comment: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listComments = async (
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
      'SELECT project_id FROM submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const projectId = submissionResult.rows[0].project_id;

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

    const submissionCheck = await pool.query(
      'SELECT submitter_id FROM submissions WHERE id = $1',
      [submissionId]
    );
    const isSubmitter = submissionCheck.rows.length > 0 && submissionCheck.rows[0].submitter_id === req.user.userId;

    if (!isOwner && !isMember && !isSubmitter) {
      const error: AppError = new Error('Unauthorized to view comments for this submission');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query(
      `SELECT c.id, c.submission_id, c.reviewer_id, c.content, c.line_number, c.is_inline, c.created_at, c.updated_at,
              u.name as reviewer_name, u.email as reviewer_email
       FROM comments c
       JOIN users u ON c.reviewer_id = u.id
       WHERE c.submission_id = $1
       ORDER BY c.created_at ASC`,
      [submissionId]
    );

    res.json({
      status: 'success',
      data: {
        comments: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commentId = parseInt(req.params.id);
    const { content } = req.body;

    if (isNaN(commentId)) {
      const error: AppError = new Error('Invalid comment ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!content) {
      const error: AppError = new Error('Comment content is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const commentResult = await pool.query(
      'SELECT reviewer_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      const error: AppError = new Error('Comment not found');
      error.statusCode = 404;
      return next(error);
    }

    if (commentResult.rows[0].reviewer_id !== req.user.userId) {
      const error: AppError = new Error('Unauthorized to update this comment');
      error.statusCode = 403;
      return next(error);
    }

    const result = await pool.query(
      'UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, submission_id, reviewer_id, content, line_number, is_inline, created_at, updated_at',
      [content, commentId]
    );

    res.json({
      status: 'success',
      message: 'Comment updated successfully',
      data: {
        comment: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commentId = parseInt(req.params.id);

    if (isNaN(commentId)) {
      const error: AppError = new Error('Invalid comment ID');
      error.statusCode = 400;
      return next(error);
    }

    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const commentResult = await pool.query(
      'SELECT reviewer_id, submission_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      const error: AppError = new Error('Comment not found');
      error.statusCode = 404;
      return next(error);
    }

    const comment = commentResult.rows[0];
    const isCommentOwner = comment.reviewer_id === req.user.userId;

    const submissionResult = await pool.query(
      'SELECT project_id FROM submissions WHERE id = $1',
      [comment.submission_id]
    );

    if (submissionResult.rows.length === 0) {
      const error: AppError = new Error('Submission not found');
      error.statusCode = 404;
      return next(error);
    }

    const projectId = submissionResult.rows[0].project_id;
    const projectCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    const isProjectOwner = projectCheck.rows.length > 0 && projectCheck.rows[0].owner_id === req.user.userId;

    if (!isCommentOwner && !isProjectOwner) {
      const error: AppError = new Error('Unauthorized to delete this comment');
      error.statusCode = 403;
      return next(error);
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({
      status: 'success',
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

