import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Admin } from '@/domain/entities/Admin';

export interface AdminDocument extends Omit<Admin, 'adminId'>, Document {
  _id: mongoose.Types.ObjectId;
  adminId: string;
}

const adminSchema = new Schema<AdminDocument>(
  {
    adminId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      default: 'Admin'
    },
    organizationId: {
      type: String,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Create compound index for email + organization (for multi-tenant uniqueness)
adminSchema.index({ email: 1, organizationId: 1 }, { unique: true });

// Transform output (exclude sensitive data)
adminSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash; // Never expose password hash
    return ret;
  }
});

export const AdminModel = mongoose.model<AdminDocument>('Admin', adminSchema);