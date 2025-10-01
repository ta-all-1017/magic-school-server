import Player, { IPlayer } from '../models/Player';
import { GameService } from './GameService';
import { getCache, setCache, deleteCache } from '../config/redis';

interface Room {
  id: string;
  host: string;
  players: Map<string, IPlayer>;
  maxPlayers: number;
  gameType: 'solo' | 'team';
  isPublic: boolean;
  createdAt: Date;
}

export class RoomService {
  private static instance: RoomService;
  private rooms: Map<string, Room>;
  private gameService: GameService;
  
  private constructor() {
    this.rooms = new Map();
    this.gameService = GameService.getInstance();
  }
  
  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }
  
  async createRoom(roomId: string, hostId: string, hostUsername: string, socketId: string, settings?: any): Promise<Room> {
    try {
      if (this.rooms.has(roomId)) {
        throw new Error('Room already exists');
      }
      
      const hostPlayer = new Player({
        userId: hostId,
        username: hostUsername,
        socketId,
        roomId,
        isHost: true,
        isReady: false
      });
      
      await hostPlayer.save();
      
      const room: Room = {
        id: roomId,
        host: hostId,
        players: new Map([[hostId, hostPlayer]]),
        maxPlayers: settings?.maxPlayers || 4,
        gameType: settings?.gameType || 'solo',
        isPublic: settings?.isPublic !== false,
        createdAt: new Date()
      };
      
      this.rooms.set(roomId, room);
      await setCache(`room:${roomId}`, room, 3600);
      
      await this.gameService.createGame(roomId, hostId, settings);
      
      return room;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }
  
  async joinRoom(roomId: string, playerId: string, username: string, socketId: string, team?: number): Promise<Room | null> {
    try {
      let room = this.rooms.get(roomId);
      
      if (!room) {
        const cachedRoom = await getCache(`room:${roomId}`);
        if (cachedRoom) {
          room = cachedRoom;
          this.rooms.set(roomId, room!);
        } else {
          return null;
        }
      }
      
      if (room!.players.size >= room!.maxPlayers) {
        throw new Error('Room is full');
      }
      
      const existingPlayer = await Player.findOne({ userId: playerId, roomId });
      
      const player = existingPlayer || new Player({
        userId: playerId,
        username,
        socketId,
        roomId,
        team,
        isHost: false,
        isReady: false
      });
      
      if (!existingPlayer) {
        await player.save();
      } else {
        player.socketId = socketId;
        player.connectionStatus = 'connected';
        await player.save();
      }
      
      room!.players.set(playerId, player);
      await setCache(`room:${roomId}`, room!, 3600);
      
      await this.gameService.addPlayerToGame(roomId, playerId, username, team);
      
      return room!;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }
  
  async leaveRoom(roomId: string, playerId: string): Promise<Room | null> {
    try {
      const room = this.rooms.get(roomId);
      if (!room) return null;
      
      room.players.delete(playerId);
      await Player.deleteOne({ userId: playerId, roomId });
      
      if (room.players.size === 0) {
        this.rooms.delete(roomId);
        await deleteCache(`room:${roomId}`);
        await this.gameService.removePlayerFromGame(roomId, playerId);
        return null;
      }
      
      if (room.host === playerId && room.players.size > 0) {
        const newHost = room.players.values().next().value as IPlayer;
        room.host = newHost.userId;
        newHost.isHost = true;
        await newHost.save();
      }
      
      await setCache(`room:${roomId}`, room, 3600);
      await this.gameService.removePlayerFromGame(roomId, playerId);
      
      return room;
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }
  
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      let room = this.rooms.get(roomId);
      
      if (!room) {
        const cachedRoom = await getCache(`room:${roomId}`);
        if (cachedRoom) {
          room = cachedRoom;
          this.rooms.set(roomId, room!);
        }
      }
      
      return room ?? null;
    } catch (error) {
      console.error('Error getting room:', error);
      return null;
    }
  }
  
  async setPlayerReady(roomId: string, playerId: string, isReady: boolean): Promise<boolean> {
    try {
      const player = await Player.findOne({ userId: playerId, roomId });
      if (!player) return false;
      
      player.isReady = isReady;
      await player.save();
      
      const room = await this.getRoom(roomId);
      if (room && room.players.has(playerId)) {
        room.players.set(playerId, player);
        await setCache(`room:${roomId}`, room, 3600);
      }
      
      return true;
    } catch (error) {
      console.error('Error setting player ready:', error);
      return false;
    }
  }
  
  async areAllPlayersReady(roomId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      if (!room || room.players.size < 2) return false;
      
      for (const player of room.players.values()) {
        if (!player.isReady) return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking if players ready:', error);
      return false;
    }
  }
  
  async getRoomBySocketId(socketId: string): Promise<Room | null> {
    try {
      const player = await Player.findOne({ socketId });
      if (!player) return null;
      
      return await this.getRoom(player.roomId);
    } catch (error) {
      console.error('Error getting room by socket:', error);
      return null;
    }
  }
  
  async updatePlayerSocket(oldSocketId: string, newSocketId: string): Promise<boolean> {
    try {
      const player = await Player.findOne({ socketId: oldSocketId });
      if (!player) return false;
      
      player.socketId = newSocketId;
      player.connectionStatus = 'connected';
      await player.save();
      
      const room = await this.getRoom(player.roomId);
      if (room && room.players.has(player.userId)) {
        room.players.set(player.userId, player);
        await setCache(`room:${player.roomId}`, room, 3600);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating player socket:', error);
      return false;
    }
  }
}