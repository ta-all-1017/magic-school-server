import Game, { IGame } from '../models/Game';
import Player, { IPlayer } from '../models/Player';
import { GameState, PlayerAction, Card } from '../types/game.types';
import { getCache, setCache, deleteCache } from '../config/redis';

export class GameService {
  private static instance: GameService;
  
  private constructor() {}
  
  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }
  
  async createGame(roomId: string, hostId: string, settings?: any): Promise<IGame> {
    try {
      const game = new Game({
        roomId,
        players: [],
        gameType: settings?.gameType || 'solo',
        maxPlayers: settings?.maxPlayers || 4,
        settings: {
          turnTimeLimit: settings?.turnTimeLimit || 60,
          maxHealth: settings?.maxHealth || 100,
          startingMana: settings?.startingMana || 10,
          startingCards: settings?.startingCards || 5
        }
      });
      
      await game.save();
      await setCache(`game:${roomId}`, game, 3600);
      
      return game;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }
  
  async getGame(roomId: string): Promise<IGame | null> {
    try {
      const cached = await getCache(`game:${roomId}`);
      if (cached) return cached;
      
      const game = await Game.findOne({ roomId });
      if (game) {
        await setCache(`game:${roomId}`, game, 3600);
      }
      
      return game;
    } catch (error) {
      console.error('Error getting game:', error);
      throw error;
    }
  }
  
  async addPlayerToGame(roomId: string, playerId: string, username: string, team?: number): Promise<IGame | null> {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) return null;
      
      if (game.players.length >= game.maxPlayers) {
        throw new Error('Game is full');
      }
      
      const playerExists = game.players.some(p => p.userId === playerId);
      if (playerExists) {
        return game;
      }
      
      game.players.push({
        userId: playerId,
        username,
        team: team || undefined,
        cards: [],
        health: game.settings.maxHealth,
        mana: game.settings.startingMana,
        score: 0,
        isActive: true
      });
      
      await game.save();
      await deleteCache(`game:${roomId}`);
      
      return game;
    } catch (error) {
      console.error('Error adding player to game:', error);
      throw error;
    }
  }
  
  async removePlayerFromGame(roomId: string, playerId: string): Promise<IGame | null> {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) return null;
      
      game.players = game.players.filter(p => p.userId !== playerId);
      
      if (game.players.length === 0) {
        await Game.deleteOne({ roomId });
        await deleteCache(`game:${roomId}`);
        return null;
      }
      
      await game.save();
      await deleteCache(`game:${roomId}`);
      
      return game;
    } catch (error) {
      console.error('Error removing player from game:', error);
      throw error;
    }
  }
  
  async startGame(roomId: string): Promise<IGame | null> {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) return null;
      
      if (game.players.length < 2) {
        throw new Error('Not enough players to start');
      }
      
      game.gameState = 'in_progress';
      game.currentTurn = 1;
      game.currentPlayerIndex = 0;
      
      game.players.forEach(player => {
        player.cards = this.generateStartingCards(game.settings.startingCards);
      });
      
      await game.save();
      await deleteCache(`game:${roomId}`);
      
      return game;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }
  
  async endTurn(roomId: string, playerId: string): Promise<IGame | null> {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) return null;
      
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer.userId !== playerId) {
        throw new Error('Not your turn');
      }
      
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.filter(p => p.isActive).length;
      if (game.currentPlayerIndex === 0) {
        game.currentTurn++;
      }
      
      const nextPlayer = game.players[game.currentPlayerIndex];
      nextPlayer.mana = Math.min(nextPlayer.mana + 2, 10);
      
      await game.save();
      await deleteCache(`game:${roomId}`);
      
      return game;
    } catch (error) {
      console.error('Error ending turn:', error);
      throw error;
    }
  }
  
  async playCard(roomId: string, playerId: string, cardId: string, targetId?: string): Promise<IGame | null> {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) return null;
      
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer.userId !== playerId) {
        throw new Error('Not your turn');
      }
      
      game.turnHistory.push({
        playerId,
        action: 'play_card',
        timestamp: new Date(),
        data: { cardId, targetId }
      });
      
      await game.save();
      await deleteCache(`game:${roomId}`);
      
      return game;
    } catch (error) {
      console.error('Error playing card:', error);
      throw error;
    }
  }
  
  async endGame(roomId: string, winner: string | number): Promise<IGame | null> {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) return null;
      
      game.gameState = 'finished';
      game.winner = winner;
      
      await game.save();
      await deleteCache(`game:${roomId}`);
      
      return game;
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  }
  
  private generateStartingCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push({
        id: `card_${Math.random().toString(36).substr(2, 9)}`,
        name: `Card ${i + 1}`,
        cost: Math.floor(Math.random() * 5) + 1,
        attack: Math.floor(Math.random() * 5) + 1,
        defense: Math.floor(Math.random() * 5) + 1,
        effect: null
      });
    }
    return cards;
  }
}