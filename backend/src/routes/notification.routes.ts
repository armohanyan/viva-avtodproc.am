import { Router } from 'express';
import { NotificationController } from '../controllers';

const router = Router();

router.get('/', NotificationController.list);
router.get('/unread-count', NotificationController.unreadCount);
router.patch('/:id/read', NotificationController.markRead);
router.patch('/read-all', NotificationController.markAllRead);
router.delete('/:id', NotificationController.remove);

export default router;
