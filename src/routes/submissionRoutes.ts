import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createSubmission,
  getSubmission,
  updateSubmissionStatus,
  deleteSubmission,
} from '../controllers/submissionController';

const router = Router();

router.use(authenticate);

router.post('/', createSubmission);
router.get('/:id', getSubmission);
router.put('/:id/status', updateSubmissionStatus);
router.delete('/:id', deleteSubmission);

export default router;

