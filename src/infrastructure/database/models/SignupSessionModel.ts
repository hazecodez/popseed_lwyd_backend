import mongoose, { Schema, Document } from 'mongoose';
import { SignupSession, SignupStatus } from '@/domain/entities/SignupSession';

export interface SignupSessionDocument extends Omit<SignupSession, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const signupSessionSchema = new Schema<SignupSessionDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      default: '',
      trim: true
    },
    lastName: {
      type: String,
      default: '',
      trim: true
    },
    organizationName: {
      type: String,
      default: '',
      trim: true
    },
    subdomain: {
      type: String,
      default: '',
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    companySize: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    planType: {
      type: String,
      default: 'ENTERPRISE'
    },
    stripeSessionId: {
      type: String,
      sparse: true
    },
    status: {
      type: String,
      enum: Object.values(SignupStatus),
      default: SignupStatus.EMAIL_CREATED,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Transform output
signupSessionSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password; // Never return password in JSON
    return ret;
  }
});

export const SignupSessionModel = mongoose.model<SignupSessionDocument>('SignupSession', signupSessionSchema);