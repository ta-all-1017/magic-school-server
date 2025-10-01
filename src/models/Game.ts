import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
  roomId: string;
  players: Array<{
    userId: string;
    username: string;
    team?: number;
    cards: Array<any>;
    health: number;
    mana: number;
    score: number;
    isActive: boolean;
  }>;
  gameType: 'solo' | 'team';
  maxPlayers: number;
  currentTurn: number;
  currentPlayerIndex: number;
  gameState: 'waiting' | 'in_progress' | 'finished';
  winner?: string | number;
  turnHistory: Array<{
    playerId: string;
    action: string;
    timestamp: Date;
    data?: any;
  }>;
  settings: {
    turnTimeLimit: number;
    maxHealth: number;
    startingMana: number;
    startingCards: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema: Schema = new Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  players: [{
    userId: String,
    username: String,
    team: Number,
    cards: Array,
    health: {
      type: Number,
      default: 100
    },
    mana: {
      type: Number,
      default: 10
    },
    score: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  gameType: {
    type: String,
    enum: ['solo', 'team'],
    default: 'solo'
  },
  maxPlayers: {
    type: Number,
    default: 4,
    min: 2,
    max: 8
  },
  currentTurn: {
    type: Number,
    default: 0
  },
  currentPlayerIndex: {
    type: Number,
    default: 0
  },
  gameState: {
    type: String,
    enum: ['waiting', 'in_progress', 'finished'],
    default: 'waiting'
  },
  winner: {
    type: Schema.Types.Mixed
  },
  turnHistory: [{
    playerId: String,
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    data: Schema.Types.Mixed
  }],
  settings: {
    turnTimeLimit: {
      type: Number,
      default: 60
    },
    maxHealth: {
      type: Number,
      default: 100
    },
    startingMana: {
      type: Number,
      default: 10
    },
    startingCards: {
      type: Number,
      default: 5
    }
  }
}, {
  timestamps: true
});

GameSchema.index({ roomId: 1 });
GameSchema.index({ gameState: 1 });
GameSchema.index({ 'players.userId': 1 });

export default mongoose.model<IGame>('Game', GameSchema);