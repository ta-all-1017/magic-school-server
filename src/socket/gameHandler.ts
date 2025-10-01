import { Server, Socket } from 'socket.io';
import { GameService } from '../services/GameService';
import { RoomService } from '../services/RoomService';

const gameService = GameService.getInstance();
const roomService = RoomService.getInstance();

export const registerGameHandlers = (io: Server, socket: Socket) => {
  socket.on('game:start', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      
      const allReady = await roomService.areAllPlayersReady(roomId);
      if (!allReady) {
        socket.emit('error', { message: 'Not all players are ready' });
        return;
      }
      
      const game = await gameService.startGame(roomId);
      if (!game) {
        socket.emit('error', { message: 'Failed to start game' });
        return;
      }
      
      io.to(roomId).emit('game:started', {
        game,
        message: 'Game has started!'
      });
    } catch (error: any) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: error.message || 'Failed to start game' });
    }
  });
  
  socket.on('game:play_card', async (data: {
    roomId: string;
    playerId: string;
    cardId: string;
    targetId?: string;
  }) => {
    try {
      const { roomId, playerId, cardId, targetId } = data;
      
      const game = await gameService.playCard(roomId, playerId, cardId, targetId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      io.to(roomId).emit('game:card_played', {
        playerId,
        cardId,
        targetId,
        gameState: game
      });
    } catch (error: any) {
      console.error('Error playing card:', error);
      socket.emit('error', { message: error.message || 'Failed to play card' });
    }
  });
  
  socket.on('game:end_turn', async (data: { roomId: string; playerId: string }) => {
    try {
      const { roomId, playerId } = data;
      
      const game = await gameService.endTurn(roomId, playerId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      io.to(roomId).emit('game:turn_ended', {
        previousPlayer: playerId,
        currentPlayer: game.players[game.currentPlayerIndex].userId,
        turn: game.currentTurn,
        gameState: game
      });
    } catch (error: any) {
      console.error('Error ending turn:', error);
      socket.emit('error', { message: error.message || 'Failed to end turn' });
    }
  });
  
  socket.on('game:surrender', async (data: { roomId: string; playerId: string }) => {
    try {
      const { roomId, playerId } = data;
      
      const game = await gameService.getGame(roomId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      const player = game.players.find(p => p.userId === playerId);
      if (player) {
        player.isActive = false;
      }
      
      const activePlayers = game.players.filter(p => p.isActive);
      if (activePlayers.length === 1) {
        await gameService.endGame(roomId, activePlayers[0].userId);
        io.to(roomId).emit('game:ended', {
          winner: activePlayers[0].userId,
          reason: 'surrender'
        });
      } else {
        io.to(roomId).emit('game:player_surrendered', {
          playerId,
          remainingPlayers: activePlayers.length
        });
      }
    } catch (error: any) {
      console.error('Error surrendering:', error);
      socket.emit('error', { message: error.message || 'Failed to surrender' });
    }
  });
  
  socket.on('game:get_state', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      
      const game = await gameService.getGame(roomId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      socket.emit('game:state', game);
    } catch (error: any) {
      console.error('Error getting game state:', error);
      socket.emit('error', { message: error.message || 'Failed to get game state' });
    }
  });
  
  socket.on('game:action', async (data: {
    roomId: string;
    playerId: string;
    action: string;
    payload: any;
  }) => {
    try {
      const { roomId, action, payload } = data;
      
      io.to(roomId).emit('game:action_received', {
        action,
        payload,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Error handling game action:', error);
      socket.emit('error', { message: error.message || 'Failed to process action' });
    }
  });
};