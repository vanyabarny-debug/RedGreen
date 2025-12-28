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

export type Language = 'RU' | 'EN';

export interface GameHistoryItem {
  timestamp: number;
  outcome: 'WIN' | 'LOSS';
  amount: number; // Net amount (e.g. +200 or -100)
  currency: 'TON' | 'COINS';
}

export interface UserProfile {
  id: string;
  username: string;
  tonBalance: number; // Real TON Balance
  coins: number;      // Virtual Currency
  walletAddress?: string;
  avatarColor: string;
  language: Language;
  gameHistory: GameHistoryItem[];
  lastDailyBonusClaim?: number; // Timestamp of last claim
}

export interface Friend {
  id: string;
  username: string;
  avatarColor: string;
  status: 'ONLINE' | 'OFFLINE' | 'IN_GAME';
  currentRoomId?: string; 
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
  isTraining: boolean; 
}

export interface RoomInfo {
  id: string;
  name: string;
  hostId: string;
  playersCount: number;
  maxPlayers: number;
  difficulty: Difficulty;
  status: 'WAITING' | 'PLAYING';
  isTraining: boolean;
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
  config: DynamicGameConfig;
}

export const GAME_DEFAULTS = {
  PLAYER_SPEED: 0.35, 
  TICK_RATE: 60,
  ENTRY_FEE_TON: 1.0, 
  ENTRY_FEE_COINS: 100,
  INITIAL_COINS: 1000, 
  DAILY_BONUS: 500,
  MAX_WINNERS: 20,
  ZONE_TOLERANCE: 0.5,
};