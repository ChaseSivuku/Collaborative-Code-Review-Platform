import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createProject,
  listProjects,
  getProject,
  addMember,
  removeMember,
} from '../controllers/projectController';
import { listSubmissionsByProject } from '../controllers/submissionController';

const router = Router();

router.use(authenticate);

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id/submissions', listSubmissionsByProject);
router.get('/:id', getProject);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

export default router;

