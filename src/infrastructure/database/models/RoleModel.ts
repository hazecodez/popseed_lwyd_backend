import mongoose, { Schema, Document } from 'mongoose';
import { Role } from '@/domain/entities/Role';

export interface RoleDocument extends Omit<Role, 'roleId'>, Document {
  _id: mongoose.Types.ObjectId;
}

const roleSchema = new Schema<RoleDocument>(
  {
    roleName: {
      type: String,
      required: true,
      trim: true,
      index: true
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
    }]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Transform output
roleSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    ret.roleId = ret._id.toString();
    delete ret._id;
    return ret;
  }
});

export const RoleModel = mongoose.model<RoleDocument>('Role', roleSchema);