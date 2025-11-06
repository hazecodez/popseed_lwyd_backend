import { INotificationRepository } from '@/domain/repositories/INotificationRepository';
import { NotificationType, CreateNotificationRequest } from '@/domain/entities/Notification';
import { SocketService } from './SocketService';
import { IUserRepository } from '@/domain/repositories/IUserRepository';

export class NotificationService {
  constructor(
    private notificationRepository: INotificationRepository,
    private socketService: SocketService,
    private userRepository: IUserRepository
  ) {}

  // Send notification when task is assigned
  async notifyTaskAssigned(
    taskId: string,
    taskName: string,
    projectName: string,
    assignedDesignerId: string,
    designLeadId: string | null,
    assignedBy: string,
    organizationId: string
  ): Promise<void> {
    const recipientIds: string[] = [assignedDesignerId];
    if (designLeadId) {
      recipientIds.push(designLeadId);
    }

    const assignedByUser = await this.userRepository.findById(assignedBy);
    const assignedByName = assignedByUser?.fullName || 'Someone';

    for (const userId of recipientIds) {
      const notification = await this.notificationRepository.create({
        userId,
        organizationId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned',
        message: `${assignedByName} assigned you to "${taskName}" in project "${projectName}"`,
        taskId,
        actionBy: assignedBy
      });

      // Send real-time notification
      this.socketService.sendNotificationToUser(userId, notification);
    }
  }

  // Send notification when task status changes
  async notifyStatusChange(
    taskId: string,
    taskName: string,
    projectName: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    assignedDesignerId: string | null,
    designLeadId: string | null,
    assignedAM: string | null,
    organizationId: string
  ): Promise<void> {
    const recipientIds: string[] = [];
    
    // Determine who should be notified based on who changed the status
    const changedByUser = await this.userRepository.findById(changedBy);
    const changedByRole = changedByUser?.role || '';
    const changedByName = changedByUser?.fullName || 'Someone';

    // If AM changed status, notify designer and design lead
    if (changedByRole.includes('AM')) {
      if (assignedDesignerId) recipientIds.push(assignedDesignerId);
      if (designLeadId) recipientIds.push(designLeadId);
    }
    // If Designer changed status, notify AM and design lead
    else if (changedByRole.toLowerCase().includes('design') && !changedByRole.includes('Lead') && !changedByRole.includes('Head')) {
      if (assignedAM) recipientIds.push(assignedAM);
      if (designLeadId) recipientIds.push(designLeadId);
    }
    // If Design Lead/Head changed status, notify AM and designer
    else if (changedByRole.includes('Lead') || changedByRole.includes('Head')) {
      if (assignedAM) recipientIds.push(assignedAM);
      if (assignedDesignerId) recipientIds.push(assignedDesignerId);
    }

    // Remove the person who made the change from recipients
    const filteredRecipientIds = recipientIds.filter(id => id !== changedBy);

    for (const userId of filteredRecipientIds) {
      const notification = await this.notificationRepository.create({
        userId,
        organizationId,
        type: NotificationType.TASK_STATUS_CHANGED,
        title: 'Task Status Updated',
        message: `${changedByName} changed status of "${taskName}" from ${oldStatus.replace(/_/g, ' ')} to ${newStatus.replace(/_/g, ' ')}`,
        taskId,
        actionBy: changedBy
      });

      // Send real-time notification
      this.socketService.sendNotificationToUser(userId, notification);
    }
  }

  // Send notification when designer is changed
  async notifyDesignerChange(
    taskId: string,
    taskName: string,
    projectName: string,
    oldDesignerId: string,
    newDesignerId: string,
    designLeadId: string | null,
    changedBy: string,
    organizationId: string
  ): Promise<void> {
    const recipientIds: string[] = [oldDesignerId, newDesignerId];
    if (designLeadId && designLeadId !== changedBy) {
      recipientIds.push(designLeadId);
    }

    const changedByUser = await this.userRepository.findById(changedBy);
    const changedByName = changedByUser?.fullName || 'Someone';

    const oldDesignerUser = await this.userRepository.findById(oldDesignerId);
    const newDesignerUser = await this.userRepository.findById(newDesignerId);

    // Notify old designer
    const oldDesignerNotification = await this.notificationRepository.create({
      userId: oldDesignerId,
      organizationId,
      type: NotificationType.DESIGNER_CHANGED,
      title: 'Task Reassigned',
      message: `${changedByName} reassigned "${taskName}" from you to ${newDesignerUser?.fullName || 'another designer'}`,
      taskId,
      actionBy: changedBy
    });
    this.socketService.sendNotificationToUser(oldDesignerId, oldDesignerNotification);

    // Notify new designer
    const newDesignerNotification = await this.notificationRepository.create({
      userId: newDesignerId,
      organizationId,
      type: NotificationType.DESIGNER_CHANGED,
      title: 'Task Assigned to You',
      message: `${changedByName} reassigned "${taskName}" from ${oldDesignerUser?.fullName || 'another designer'} to you`,
      taskId,
      actionBy: changedBy
    });
    this.socketService.sendNotificationToUser(newDesignerId, newDesignerNotification);

    // Notify design lead if applicable
    if (designLeadId && designLeadId !== changedBy) {
      const leadNotification = await this.notificationRepository.create({
        userId: designLeadId,
        organizationId,
        type: NotificationType.DESIGNER_CHANGED,
        title: 'Designer Changed',
        message: `${changedByName} reassigned "${taskName}" from ${oldDesignerUser?.fullName} to ${newDesignerUser?.fullName}`,
        taskId,
        actionBy: changedBy
      });
      this.socketService.sendNotificationToUser(designLeadId, leadNotification);
    }
  }

  // Send notification when comment is added
  async notifyCommentAdded(
    taskId: string,
    taskName: string,
    commentText: string,
    commentType: string,
    commentBy: string,
    assignedDesignerId: string | null,
    designLeadId: string | null,
    assignedAM: string | null,
    organizationId: string
  ): Promise<void> {
    const recipientIds: string[] = [];
    
    const commentByUser = await this.userRepository.findById(commentBy);
    const commentByName = commentByUser?.fullName || 'Someone';
    const commentByRole = commentByUser?.role || '';

    // Determine recipients based on who commented
    if (commentByRole.includes('AM')) {
      if (assignedDesignerId) recipientIds.push(assignedDesignerId);
      if (designLeadId) recipientIds.push(designLeadId);
    } else if (commentByRole.toLowerCase().includes('design')) {
      if (assignedAM) recipientIds.push(assignedAM);
      if (designLeadId && commentBy !== designLeadId) recipientIds.push(designLeadId);
    }

    // Remove the person who made the comment from recipients
    const filteredRecipientIds = recipientIds.filter(id => id !== commentBy);

    for (const userId of filteredRecipientIds) {
      const notification = await this.notificationRepository.create({
        userId,
        organizationId,
        type: NotificationType.COMMENT_ADDED,
        title: 'New Comment',
        message: `${commentByName} commented on "${taskName}": ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`,
        taskId,
        actionBy: commentBy
      });

      // Send real-time notification
      this.socketService.sendNotificationToUser(userId, notification);
    }
  }
}
