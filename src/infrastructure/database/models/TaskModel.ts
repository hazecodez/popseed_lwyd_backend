import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface StatusChange {
  status: 'brief_submitted' | 'rework_requested' | 'designer_assigned' | 'picked_up' | 'draft_submitted' | 'internal_approved' | 'sent_to_client' | 'client_approved' | 'client_feedback';
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

interface ActivityComment {
  byWho: string;
  comment: string;
  time: Date;
  type: 'brief_submitted' | 'brief_rework' | 'design_rework' | 'designer_feedback' | 'client_feedback' | 'internal_feedback' | 'rework_requested' | 'designer_assigned' | 'designer_changed';
  asset?: string;
}

export interface ITaskDocument extends Document {
  taskId: string;
  projectId: string;
  organizationId: string;
  taskName: string;
  description: string; // Keep for backward compatibility
  brief: string;
  taskType: 'graphic_design' | 'motion_graphic_design' | '3d_design' | 'ai_generation' | 'web_design' | 'copy_writing' | 'strategy_thinking';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedDesigner?: string;
  designers?: string[]; // All designers who worked on this task
  designLead?: string;
  reworkDesigner?: string;
  createdBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  starRate?: number;
  status: 'brief_submitted' | 'rework_requested' | 'designer_assigned' | 'picked_up' | 'draft_submitted' | 'internal_approved' | 'sent_to_client' | 'client_approved' | 'client_feedback';
  statusHistory: StatusChange[];
  dueDate: Date;
  dueTime?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  assets: string[];
  references: string[];
  attachments: string[]; // Keep for backward compatibility
  dependencies: string[];
  
  // Rework fields
  isRework: boolean;
  originalTaskId?: string;
  reworkSuggestions?: string;
  
  // Activity and comments
  activityAndComments: ActivityComment[];
  
  // Client review
  clientEmail?: string;
  deliverables: Array<{
    deliverable: string;
    submittedBy: string;
    submittedAt: Date;
  }>;
  
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StatusChangeSchema = new Schema({
  status: {
    type: String,
    required: true,
    enum: ['brief_submitted', 'rework_requested', 'designer_assigned', 'picked_up', 'draft_submitted', 'internal_approved', 'sent_to_client', 'client_approved', 'client_feedback']
  },
  changedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  changedBy: {
    type: String,
    required: true,
    index: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const ActivityCommentSchema = new Schema({
  byWho: {
    type: String,
    required: true,
    index: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true,
    enum: ['brief_submitted', 'brief_rework', 'design_rework', 'designer_feedback', 'client_feedback', 'internal_feedback', 'rework_requested', 'designer_assigned', 'designer_changed', 'clarification']
  },
  asset: {
    type: String,
    trim: true,
    required: false,
  }
}, { _id: false });

const TaskSchema = new Schema({
  taskId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
    index: true
  },
  projectId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  taskName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    default: '' // Keep for backward compatibility
  },
  brief: {
    type: String,
    required: true,
    trim: true
  },
  taskType: {
    type: String,
    required: true,
    enum: ['graphic_design', 'motion_graphic_design', '3d_design', 'ai_generation', 'web_design', 'copy_writing', 'strategy_thinking']
  },
  riskLevel: {
    type: String,
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH']
  },
  assignedDesigner: {
    type: String,
    index: true
  },
  designers: {
    type: [String],
    default: []
  },
  designLead: {
    type: String,
    index: true
  },
  reworkDesigner: {
    type: String,
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  starRate: {
    type: Number,
    min: 0,
    max: 5
  },
  status: {
    type: String,
    required: true,
    enum: ['brief_submitted', 'rework_requested', 'designer_assigned', 'picked_up', 'draft_submitted', 'internal_approved', 'sent_to_client', 'client_approved', 'client_feedback'],
    default: 'brief_submitted',
    index: true
  },
  statusHistory: {
    type: [StatusChangeSchema],
    default: function(): any[] {
      return [{
        status: 'brief_submitted',
        changedAt: new Date(),
        changedBy: (this as any).createdBy || ''
      }];
    }
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  dueTime: {
    type: String,
    required: false
  },
  estimatedHours: {
    type: Number,
    min: 0,
    max: 1000
  },
  actualHours: {
    type: Number,
    min: 0,
    max: 1000
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  assets: [{
    type: String,
    trim: true
  }],
  references: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: String,
    trim: true
  }], // Keep for backward compatibility
  dependencies: [{
    type: String,
    index: true
  }],
  
  // Rework fields
  isRework: {
    type: Boolean,
    default: false,
    index: true
  },
  originalTaskId: {
    type: String,
    index: true
  },
  reworkSuggestions: {
    type: String,
    trim: true
  },
  
  // Activity and comments
  activityAndComments: {
    type: [ActivityCommentSchema],
    default: []
  },
  
  // Client review
  clientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  deliverables: [{
    deliverable: {
      type: String,
      required: true,
      trim: true
    },
    submittedBy: {
      type: String,
      required: true
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  }],
  
  completedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'tasks'
});

// Compound indexes for efficient queries
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ assignedDesigner: 1, organizationId: 1 });
TaskSchema.index({ designLead: 1, organizationId: 1 });
TaskSchema.index({ organizationId: 1, status: 1 });
TaskSchema.index({ dueDate: 1, status: 1 });

// Pre-save middleware to update completedAt when status changes to client_approved
TaskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'client_approved' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'client_approved') {
      this.completedAt = undefined;
    }
  }
  next();
});

// Pre-update middleware for findOneAndUpdate operations
TaskSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update.status === 'client_approved') {
    update.completedAt = new Date();
  } else if (update.status && update.status !== 'client_approved') {
    update.completedAt = null;
  }
  next();
});

export const TaskModel = mongoose.model<ITaskDocument>('Task', TaskSchema);