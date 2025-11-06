export interface Notification {
  notificationId: string;
  userId: string; // Recipient user ID
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  actionBy?: string; // User ID who triggered the notification
  isRead: boolean;
  createdAt: Date;
  expiresAt: Date; // Auto-delete after 30 days
}

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_STATUS_CHANGED = 'task_status_changed',
  DESIGNER_CHANGED = 'designer_changed',
  COMMENT_ADDED = 'comment_added',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue'
}

export interface CreateNotificationRequest {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  actionBy?: string;
}
