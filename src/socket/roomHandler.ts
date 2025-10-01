import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/RoomService';

const roomService = RoomService.getInstance();

export const registerRoomHandlers = (io: Server, socket: Socket) => {
  socket.on('room:create', async (data: {
    roomId: string;
    userId: string;
    username: string;
    settings?: {
      maxPlayers?: number;
      gameType?: 'solo' | 'team';
      isPublic?: boolean;
    };
  }) => {
    try {
      const { roomId, userId, username, settings } = data;
      
      const room = await roomService.createRoom(roomId, userId, username, socket.id, settings);
      
      socket.join(roomId);
      
      socket.emit('room:created', {
        room: {
          id: room.id,
          host: room.host,
          players: Array.from(room.players.values()),
          maxPlayers: room.maxPlayers,
          gameType: room.gameType,
          isPublic: room.isPublic
        }
      });
      
      io.emit('room:list_updated');
    } catch (error: any) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: error.message || 'Failed to create room' });
    }
  });
  
  socket.on('room:join', async (data: {
    roomId: string;
    userId: string;
    username: string;
    team?: number;
  }) => {
    try {
      const { roomId, userId, username, team } = data;
      
      const existingRoom = await roomService.getRoomBySocketId(socket.id);
      if (existingRoom) {
        await roomService.leaveRoom(existingRoom.id, userId);
        socket.leave(existingRoom.id);
      }
      
      const room = await roomService.getRoom(roomId);
      if (!room) {
        const newRoom = await roomService.createRoom(roomId, userId, username, socket.id);
        socket.join(roomId);
        
        socket.emit('room:joined', {
          room: {
            id: newRoom.id,
            host: newRoom.host,
            players: Array.from(newRoom.players.values()),
            maxPlayers: newRoom.maxPlayers,
            gameType: newRoom.gameType,
            isPublic: newRoom.isPublic
          },
          isHost: true
        });
        
        io.emit('room:list_updated');
        return;
      }
      
      const joinedRoom = await roomService.joinRoom(roomId, userId, username, socket.id, team);
      if (!joinedRoom) {
        socket.emit('error', { message: 'Failed to join room' });
        return;
      }
      
      socket.join(roomId);
      
      const roomData = {
        id: joinedRoom.id,
        host: joinedRoom.host,
        players: Array.from(joinedRoom.players.values()),
        maxPlayers: joinedRoom.maxPlayers,
        gameType: joinedRoom.gameType,
        isPublic: joinedRoom.isPublic
      };
      
      socket.emit('room:joined', {
        room: roomData,
        isHost: userId === joinedRoom.host
      });
      
      socket.to(roomId).emit('room:player_joined', {
        player: {
          userId,
          username,
          team
        },
        room: roomData
      });
      
      io.emit('room:list_updated');
    } catch (error: any) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: error.message || 'Failed to join room' });
    }
  });
  
  socket.on('room:leave', async (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;
      
      const room = await roomService.leaveRoom(roomId, userId);
      
      socket.leave(roomId);
      
      if (room) {
        const roomData = {
          id: room.id,
          host: room.host,
          players: Array.from(room.players.values()),
          maxPlayers: room.maxPlayers,
          gameType: room.gameType,
          isPublic: room.isPublic
        };
        
        io.to(roomId).emit('room:player_left', {
          playerId: userId,
          room: roomData
        });
      }
      
      socket.emit('room:left', { roomId });
      io.emit('room:list_updated');
    } catch (error: any) {
      console.error('Error leaving room:', error);
      socket.emit('error', { message: error.message || 'Failed to leave room' });
    }
  });
  
  socket.on('room:ready', async (data: { roomId: string; userId: string; isReady: boolean }) => {
    try {
      const { roomId, userId, isReady } = data;
      
      const success = await roomService.setPlayerReady(roomId, userId, isReady);
      if (!success) {
        socket.emit('error', { message: 'Failed to update ready status' });
        return;
      }
      
      io.to(roomId).emit('room:player_ready', {
        playerId: userId,
        isReady
      });
      
      const allReady = await roomService.areAllPlayersReady(roomId);
      if (allReady) {
        io.to(roomId).emit('room:all_ready');
      }
    } catch (error: any) {
      console.error('Error setting ready status:', error);
      socket.emit('error', { message: error.message || 'Failed to update ready status' });
    }
  });
  
  socket.on('room:chat', async (data: { roomId: string; userId: string; message: string }) => {
    try {
      const { roomId, userId, message } = data;
      
      io.to(roomId).emit('room:chat_message', {
        userId,
        message,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Error sending chat:', error);
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  });
  
  socket.on('room:settings', async (data: {
    roomId: string;
    settings: {
      maxPlayers?: number;
      gameType?: 'solo' | 'team';
      isPublic?: boolean;
    };
  }) => {
    try {
      const { roomId, settings } = data;
      
      const room = await roomService.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (settings.maxPlayers) room.maxPlayers = settings.maxPlayers;
      if (settings.gameType) room.gameType = settings.gameType;
      if (settings.isPublic !== undefined) room.isPublic = settings.isPublic;
      
      io.to(roomId).emit('room:settings_updated', { settings });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      socket.emit('error', { message: error.message || 'Failed to update settings' });
    }
  });
  
  socket.on('disconnect', async () => {
    try {
      const room = await roomService.getRoomBySocketId(socket.id);
      if (room) {
        const player = Array.from(room.players.values()).find(p => p.socketId === socket.id);
        if (player) {
          player.connectionStatus = 'disconnected';
          
          io.to(room.id).emit('room:player_disconnected', {
            playerId: player.userId
          });
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
  
  socket.on('room:reconnect', async (data: { userId: string; roomId: string }) => {
    try {
      const { userId, roomId } = data;
      
      const success = await roomService.updatePlayerSocket(socket.id, socket.id);
      if (success) {
        socket.join(roomId);
        
        io.to(roomId).emit('room:player_reconnected', {
          playerId: userId
        });
      }
    } catch (error: any) {
      console.error('Error reconnecting:', error);
      socket.emit('error', { message: error.message || 'Failed to reconnect' });
    }
  });
};