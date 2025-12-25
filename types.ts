export enum GameState {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export enum LightColor {
  GREEN = 'GREEN',
  RED = 'RED'
}

export interface Player {
  id: string;
  name?: string; // Имя игрока (из Telegram или бота)
  x: number;
  z: number;
  color: string;
  isEliminated: boolean;
  hasFinished: boolean;
  isBot: boolean;
  finishTime?: number;
  deathReason?: 'MOVEMENT' | 'OBSTACLE'; // Причина смерти
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
  playerBalance: number;
}

export const GAME_CONFIG = {
  FIELD_LENGTH: 200,
  FIELD_WIDTH: 60,
  PLAYER_SPEED: 0.25,
  TICK_RATE: 60,
  ENTRY_FEE: 10,
  INITIAL_BALANCE: 100,
  TOTAL_BOTS: 29,
  MAX_WINNERS: 20,
  ZONE_TOLERANCE: 0.5
};