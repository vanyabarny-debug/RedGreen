export enum GameState {
  MENU = 'MENU', 
  LOBBY = 'LOBBY', 
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export enum LightColor {
  GREEN = 'GREEN',
  RED = 'RED'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum MapLength {
  SHORT = 100,
  MEDIUM = 200,
  LONG = 400
}

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  walletAddress?: string;
  avatarColor: string;
}

export interface Friend {
  id: string;
  username: string;
  avatarColor: string;
  status: 'ONLINE' | 'OFFLINE' | 'IN_GAME';
  currentRoomId?: string; // Если друг в игре, знаем ID комнаты
}

export interface Player {
  id: string;
  name?: string; 
  x: number;
  z: number;
  color: string;
  isEliminated: boolean;
  hasFinished: boolean;
  isBot: boolean;
  finishTime?: number;
  deathReason?: 'MOVEMENT' | 'OBSTACLE';
  isHost?: boolean;
}

export interface Obstacle {
  id: string;
  type: 'SAW' | 'BALL';
  x: number;
  z: number;
  radius: number;
  speed: number;
  direction: number; 
}

export interface RoomSettings {
  difficulty: Difficulty;
  length: MapLength;
  maxPlayers: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  hostId: string;
  playersCount: number;
  maxPlayers: number;
  difficulty: Difficulty; // Для отображения в списке
  status: 'WAITING' | 'PLAYING';
}

export interface DynamicGameConfig {
  fieldLength: number;
  fieldWidth: number;
  difficulty: Difficulty;
}

export interface GameSchema {
  roomId: string | null;
  state: GameState;
  light: LightColor;
  timeRemaining: number;
  players: Record<string, Player>;
  obstacles: Obstacle[];
  entryFee: number;
  pot: number;
  winners: string[];
  winAmount: number;
  roomsList: RoomInfo[];
  config: DynamicGameConfig; // Текущая конфигурация активной игры
}

export const GAME_DEFAULTS = {
  PLAYER_SPEED: 0.35, 
  TICK_RATE: 60,
  ENTRY_FEE: 1.0, 
  INITIAL_BALANCE: 5.0, 
  MAX_WINNERS: 20,
  ZONE_TOLERANCE: 0.5,
};