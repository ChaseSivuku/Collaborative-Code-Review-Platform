import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUserNotifications, markNotificationAsRead } from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

router.get('/users/:id/notifications', getUserNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);

export default router;

