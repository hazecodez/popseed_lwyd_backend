import { Request, Response } from 'express';
import { INotificationRepository } from '@/domain/repositories/INotificationRepository';

export class NotificationController {
  constructor(
    private notificationRepository: INotificationRepository
  ) {}

  // Get user's notifications
  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const { limit = 50 } = req.query;
      const notifications = await this.notificationRepository.findByUserId(userId, Number(limit));

      res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get unread notifications count
  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const unreadNotifications = await this.notificationRepository.findUnreadByUserId(userId);

      res.status(200).json({
        success: true,
        data: {
          count: unreadNotifications.length
        }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Mark notification as read
  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const notification = await this.notificationRepository.markAsRead(notificationId);

      if (!notification) {
        res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Mark all notifications as read
  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const count = await this.notificationRepository.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        data: {
          count
        }
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Delete notification
  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const deleted = await this.notificationRepository.delete(notificationId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}
