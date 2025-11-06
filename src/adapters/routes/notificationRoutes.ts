import { Router } from 'express';
import { userAuthMiddleware } from '../middleware/userAuthMiddleware';
import { Container } from '@/container';

const router = Router();
const container = new Container();
const notificationController = container.notificationController;

// All routes require authentication
router.use(userAuthMiddleware);

// Get user notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread/count', notificationController.getUnreadCount);

// Mark notification as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// Mark all as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

export default router;
