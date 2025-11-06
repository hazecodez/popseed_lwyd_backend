import mongoose, { Schema, Document } from 'mongoose';
import { User, UserRole, UserStatus } from '@/domain/entities/User';

export interface UserDocument extends Omit<User, 'userId'>, Document {
  _id: mongoose.Types.ObjectId;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      default: UserRole.NOT_DEFINED,
      required: true
    },
    team: {
      type: String,
      required: false
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.NOT_APPROVED,
      required: true
    },
    organizationId: {
      type: String,
      required: true,
      index: true
    },
    invitedBy: {
      type: String,
      required: false
    },
    approvedBy: {
      type: String,
      required: false
    },
    approvedAt: {
      type: Date,
      required: false
    },
    lastLoginAt: {
      type: Date,
      required: false
    },
    // OAuth fields
    googleId: {
      type: String,
      required: false,
      sparse: true
    },
    microsoftId: {
      type: String,
      required: false,
      sparse: true
    },
    // Workload tracking fields
    ongoingTasks: {
      type: Number,
      default: 0
    },
    workloadScore: {
      type: Number,
      default: 0
    },
    taskDifficulties: [{
      taskId: {
        type: String,
        required: true
      },
      starRating: {
        type: Number,
        required: true,
        min: 0,
        max: 5
      }
    }]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for unique email per organization
userSchema.index({ email: 1, organizationId: 1 }, { unique: true });

// Transform output
userSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    ret.userId = ret._id.toString();
    delete ret._id;
    delete ret.password; // Never return password in JSON
    return ret;
  }
});

export const UserModel = mongoose.model<UserDocument>('User', userSchema);