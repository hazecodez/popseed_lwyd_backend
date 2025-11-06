import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IProjectDocument extends Document {
  projectId: string;
  organizationId: string;
  projectName: string;
  clientId: string;
  campaignName?: string;
  projectType?: string;
  dueDate: Date;
  dueTime?: string;
  poNumber?: string;
  estimateNumber?: string;
  assignedAM: string;
  assignedDesignLead?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  riskStatus: 'LOW' | 'MEDIUM' | 'HIGH';
  progress: number;
  budget: number;
  description: string;
  brief: string;
  assets: string[];
  status: 'ACTIVE' | 'REVIEW' | 'ONHOLD' | 'COMPLETED';
  projectLead: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>({
  projectId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  clientId: {
    type: String,
    required: true,
    index: true
  },
  campaignName: {
    type: String,
    required: false,
    trim: true
  },
  projectType: {
    type: String,
    required: false,
    enum: [
      'website_design',
      'mobile_app_design', 
      'branding_identity',
      'print_design',
      'video_production',
      'social_media_design',
      'marketing_campaign',
      'web_development',
      'motion_graphics',
      '3d_design',
      'ai_generation',
      'content_strategy',
      'other'
    ]
  },
  dueDate: {
    type: Date,
    required: true
  },
  dueTime: {
    type: String,
    required: false
  },
  poNumber: {
    type: String,
    trim: true
  },
  estimateNumber: {
    type: String,
    trim: true
  },
  assignedAM: {
    type: String,
    required: true,
    index: true
  },
  assignedDesignLead: {
    type: String,
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  riskStatus: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  },
  progress: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  brief: {
    type: String,
    required: true
  },
  assets: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    required: true,
    enum: ['ACTIVE', 'REVIEW', 'ONHOLD', 'COMPLETED'],
    default: 'ACTIVE'
  },
  projectLead: {
    type: String,
    required: true,
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
ProjectSchema.index({ organizationId: 1, status: 1 });
ProjectSchema.index({ organizationId: 1, assignedAM: 1 });
ProjectSchema.index({ organizationId: 1, assignedDesignLead: 1 });
ProjectSchema.index({ organizationId: 1, createdAt: -1 });

// Update the updatedAt field on save
ProjectSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

export const ProjectModel = mongoose.model<IProjectDocument>('Project', ProjectSchema);