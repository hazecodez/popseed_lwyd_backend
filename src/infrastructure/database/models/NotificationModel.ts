import mongoose, { Schema, Document } from 'mongoose';
import { Notification, NotificationType } from '@/domain/entities/Notification';

export interface NotificationDocument extends Omit<Notification, 'notificationId'>, Document {
  _id: mongoose.Types.ObjectId;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    organizationId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    taskId: {
      type: String,
      required: false
    },
    projectId: {
      type: String,
      required: false
    },
    actionBy: {
      type: String,
      required: false
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true // For efficient deletion of expired notifications
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });

// TTL index to auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Transform output
notificationSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    ret.notificationId = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

export const NotificationModel = mongoose.model<NotificationDocument>('Notification', notificationSchema);
