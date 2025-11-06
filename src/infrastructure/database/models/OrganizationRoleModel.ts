import mongoose, { Schema, Document } from 'mongoose';
import { OrganizationRole } from '@/domain/entities/OrganizationRole';

export interface OrganizationRoleDocument extends Omit<OrganizationRole, 'organizationRoleId'>, Document {
  _id: mongoose.Types.ObjectId;
}

const organizationRoleSchema = new Schema<OrganizationRoleDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true
    },
    roleId: {
      type: String,
      required: true,
      index: true // reference to master role
    },
    roleName: {
      type: String,
      required: true,
      trim: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      required: true,
      enum: ['L1', 'L2', 'L3']
    },
    team: {
      type: String,
      required: true,
      trim: true
    },
    permissions: [{
      type: String,
      required: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    isCustomized: {
      type: Boolean,
      default: false
    },
    customizedAt: {
      type: Date,
      required: false
    },
    customizedBy: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for unique role per organization
organizationRoleSchema.index({ organizationId: 1, roleId: 1 }, { unique: true });

// Index for efficient queries
organizationRoleSchema.index({ organizationId: 1, isActive: 1 });

// Transform output
organizationRoleSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    ret.organizationRoleId = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

export const OrganizationRoleModel = mongoose.model<OrganizationRoleDocument>('OrganizationRole', organizationRoleSchema);