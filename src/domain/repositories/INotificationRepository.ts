import { Notification, CreateNotificationRequest } from '../entities/Notification';

export interface INotificationRepository {
  create(notificationData: CreateNotificationRequest): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, limit?: number): Promise<Notification[]>;
  findUnreadByUserId(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification | null>;
  markAllAsRead(userId: string): Promise<number>; // Returns count of updated notifications
  delete(id: string): Promise<boolean>;
  deleteExpired(): Promise<number>; // Returns count of deleted notifications
}
