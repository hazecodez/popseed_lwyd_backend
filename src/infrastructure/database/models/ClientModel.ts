import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IClientDocument extends Document {
  clientId: string;
  organizationId: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  clientType: 'retainer' | 'standard';
  accountBalance?: number;
  contactPerson: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema({
  clientId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  clientType: {
    type: String,
    required: true,
    enum: ['retainer', 'standard'],
    default: 'standard',
    index: true
  },
  accountBalance: {
    type: Number,
    min: 0
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'clients'
});

// Compound indexes for efficient queries
ClientSchema.index({ organizationId: 1, isActive: 1 });
ClientSchema.index({ organizationId: 1, clientType: 1 });
ClientSchema.index({ organizationId: 1, clientName: 1 });

// Pre-save middleware to handle retainer account balance
ClientSchema.pre('save', function(next) {
  const doc = this as IClientDocument;
  if (doc.clientType === 'retainer' && doc.accountBalance === undefined) {
    doc.accountBalance = 0;
  } else if (doc.clientType === 'standard') {
    doc.accountBalance = null as any; // Use null instead of undefined for MongoDB
  }
  next();
});

export const ClientModel = mongoose.model<IClientDocument>('Client', ClientSchema);