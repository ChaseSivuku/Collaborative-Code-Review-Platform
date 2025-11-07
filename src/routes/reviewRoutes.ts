import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  approveSubmission,
  requestChanges,
  getReviewHistory,
} from '../controllers/reviewController';

const router = Router();

router.use(authenticate);

router.post('/submissions/:id/approve', approveSubmission);
router.post('/submissions/:id/request-changes', requestChanges);
router.get('/submissions/:id/reviews', getReviewHistory);

export default router;

