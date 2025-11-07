import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  addComment,
  listComments,
  updateComment,
  deleteComment,
} from '../controllers/commentController';

const router = Router();

router.use(authenticate);

router.post('/submissions/:id/comments', addComment);
router.get('/submissions/:id/comments', listComments);
router.put('/comments/:id', updateComment);
router.delete('/comments/:id', deleteComment);

export default router;

