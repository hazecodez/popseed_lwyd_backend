import { INotificationRepository } from '@/domain/repositories/INotificationRepository';
import { Notification, CreateNotificationRequest } from '@/domain/entities/Notification';
import { NotificationModel } from '@/infrastructure/database/models/NotificationModel';

export class NotificationRepository implements INotificationRepository {
  async create(notificationData: CreateNotificationRequest): Promise<Notification> {
    try {
      // Set expiration date to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const notification = new NotificationModel({
        ...notificationData,
        isRead: false,
        expiresAt
      });

      const savedNotification = await notification.save();
      return this.mapToEntity(savedNotification);
    } catch (error) {
      throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<Notification | null> {
    try {
      const notification = await NotificationModel.findById(id);
      return notification ? this.mapToEntity(notification) : null;
    } catch (error) {
      throw new Error(`Failed to find notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const notifications = await NotificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      throw new Error(`Failed to find notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    try {
      const notifications = await NotificationModel
        .find({ userId, isRead: false })
        .sort({ createdAt: -1 });
      
      return notifications.map(notification => this.mapToEntity(notification));
    } catch (error) {
      throw new Error(`Failed to find unread notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markAsRead(id: string): Promise<Notification | null> {
    try {
      const notification = await NotificationModel.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      );
      
      return notification ? this.mapToEntity(notification) : null;
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await NotificationModel.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
      
      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await NotificationModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await NotificationModel.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      return result.deletedCount || 0;
    } catch (error) {
      throw new Error(`Failed to delete expired notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapToEntity(notificationDoc: any): Notification {
    return {
      notificationId: notificationDoc._id.toString(),
      userId: notificationDoc.userId,
      organizationId: notificationDoc.organizationId,
      type: notificationDoc.type,
      title: notificationDoc.title,
      message: notificationDoc.message,
      taskId: notificationDoc.taskId,
      projectId: notificationDoc.projectId,
      actionBy: notificationDoc.actionBy,
      isRead: notificationDoc.isRead,
      createdAt: notificationDoc.createdAt,
      expiresAt: notificationDoc.expiresAt
    };
  }
}
