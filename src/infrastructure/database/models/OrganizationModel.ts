import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Organization, CompanySize, Industry } from '@/domain/entities/Organization';

export interface OrganizationDocument extends Omit<Organization, 'organizationId'>, Document {
  _id: mongoose.Types.ObjectId;
  organizationId: string;
}

const organizationSchema = new Schema<OrganizationDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    planType: {
      type: String,
      required: true,
      default: 'freetrial' // Simplified for now
    },
    adminUserId: {
      type: String,
      required: true,
      index: true
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
      index: true
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
      index: true
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
    },
    maxUsers: {
      type: Number,
      default: 50
    },
    currentUsers: {
      type: Number,
      default: 1
    },
    contactPhone: {
      type: String,
      trim: true
    },
    companySize: {
      type: String,
      enum: Object.values(CompanySize)
    },
    industry: {
      type: String,
      enum: Object.values(Industry)
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Transform output
organizationSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const OrganizationModel = mongoose.model<OrganizationDocument>('Organization', organizationSchema);