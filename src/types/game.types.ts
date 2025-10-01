export interface Card {
  id: string;
  name: string;
  cost: number;
  attack: number;
  defense: number;
  effect: CardEffect | null;
  description?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  type?: 'creature' | 'spell' | 'artifact';
}

export interface CardEffect {
  type: 'damage' | 'heal' | 'draw' | 'buff' | 'debuff' | 'summon';
  value: number;
  target: 'self' | 'enemy' | 'all_enemies' | 'all_allies' | 'all';
  duration?: number;
  condition?: string;
}

export interface Player {
  id: string;
  username: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hand: Card[];
  deck: Card[];
  field: Card[];
  graveyard: Card[];
  team?: number;
  isActive: boolean;
  score: number;
  buffs: Buff[];
  debuffs: Debuff[];
}

export interface Buff {
  id: string;
  type: string;
  value: number;
  duration: number;
  source: string;
}

export interface Debuff {
  id: string;
  type: string;
  value: number;
  duration: number;
  source: string;
}

export interface GameState {
  id: string;
  roomId: string;
  players: Player[];
  currentTurn: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: string | null;
  turnTimer: number;
  lastAction: GameAction | null;
}

export enum GamePhase {
  WAITING = 'waiting',
  STARTING = 'starting',
  DRAW = 'draw',
  MAIN = 'main',
  COMBAT = 'combat',
  END = 'end',
  FINISHED = 'finished'
}

export interface GameAction {
  type: ActionType;
  playerId: string;
  timestamp: Date;
  data: any;
}

export enum ActionType {
  DRAW_CARD = 'draw_card',
  PLAY_CARD = 'play_card',
  ATTACK = 'attack',
  USE_ABILITY = 'use_ability',
  END_TURN = 'end_turn',
  SURRENDER = 'surrender'
}

export interface PlayerAction {
  playerId: string;
  action: ActionType;
  cardId?: string;
  targetId?: string;
  position?: number;
}

export interface GameSettings {
  maxPlayers: number;
  gameType: 'solo' | 'team';
  turnTimeLimit: number;
  startingHealth: number;
  startingMana: number;
  startingCards: number;
  maxHandSize: number;
  maxFieldSize: number;
  allowSpectators: boolean;
}

export interface RoomSettings {
  roomId: string;
  hostId: string;
  maxPlayers: number;
  gameType: 'solo' | 'team';
  isPublic: boolean;
  password?: string;
  gameSettings: GameSettings;
}

export interface TurnResult {
  success: boolean;
  message?: string;
  gameState: GameState;
  animations?: Animation[];
}

export interface Animation {
  type: string;
  duration: number;
  from: Position;
  to: Position;
  effectId?: string;
}

export interface Position {
  x: number;
  y: number;
  zone: 'hand' | 'field' | 'graveyard' | 'deck';
}

export interface MatchResult {
  winner: string | number;
  players: PlayerResult[];
  duration: number;
  turns: number;
}

export interface PlayerResult {
  playerId: string;
  username: string;
  placement: number;
  score: number;
  cardsPlayed: number;
  damageDealt: number;
  healingDone: number;
}