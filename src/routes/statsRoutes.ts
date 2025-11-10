import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getProjectStats } from '../controllers/statsController';

const router = Router();

router.use(authenticate);

router.get('/projects/:id/stats', getProjectStats);

export default router;

