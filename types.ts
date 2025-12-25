export enum GameState {
  LOBBY = 'LOBBY',
  WAITING = 'WAITING', // New state for room assembly
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export enum LightColor {
  GREEN = 'GREEN',
  RED = 'RED'
}

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  avatarColor: string; // Цвет лего-головы/фона
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

export interface GameSchema {
  state: GameState;
  light: LightColor;
  timeRemaining: number;
  players: Record<string, Player>;
  obstacles: Obstacle[];
  entryFee: number;
  pot: number;
  winners: string[];
  winAmount: number;
}

export const GAME_CONFIG = {
  FIELD_LENGTH: 200,
  FIELD_WIDTH: 60,
  PLAYER_SPEED: 0.25,
  TICK_RATE: 60,
  ENTRY_FEE: 50, // Stars
  INITIAL_BALANCE: 300, // Changed to 300 as requested
  MAX_WINNERS: 20,
  ZONE_TOLERANCE: 0.5,
  TARGET_PLAYERS: 30 // Target room size
};