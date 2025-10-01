import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  userId: string;
  username: string;
  socketId: string;
  roomId: string;
  team?: number;
  isHost: boolean;
  isReady: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  roomId: {
    type: String,
    required: true
  },
  team: {
    type: Number,
    default: null
  },
  isHost: {
    type: Boolean,
    default: false
  },
  isReady: {
    type: Boolean,
    default: false
  },
  connectionStatus: {
    type: String,
    enum: ['connected', 'disconnected', 'reconnecting'],
    default: 'connected'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

PlayerSchema.index({ userId: 1, roomId: 1 }, { unique: true });
PlayerSchema.index({ socketId: 1 });
PlayerSchema.index({ roomId: 1 });

export default mongoose.model<IPlayer>('Player', PlayerSchema);