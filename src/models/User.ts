import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  socketId?: string;
  isOnline: boolean;
  currentRoom?: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  socketId: {
    type: String,
    sparse: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  currentRoom: {
    type: String,
    default: null
  },
  stats: {
    gamesPlayed: {
      type: Number,
      default: 0
    },
    gamesWon: {
      type: Number,
      default: 0
    },
    totalScore: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

UserSchema.index({ username: 1 });
UserSchema.index({ socketId: 1 });
UserSchema.index({ isOnline: 1 });

export default mongoose.model<IUser>('User', UserSchema);