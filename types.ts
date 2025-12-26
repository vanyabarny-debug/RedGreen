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
export type CurrencyType = 'TON' | 'COINS';

export interface GameHistoryItem {
  timestamp: number;
  outcome: 'WIN' | 'LOSS';
  amount: number; // Чистая прибыль/убыток (например, +0.9 или -1.0)
  currency: CurrencyType;
}

export interface UserProfile {
  id: string;
  username: string;
  tonBalance: number; // Реальный баланс из TON кошелька/базы
  coins: number;      // Виртуальные монеты (localStorage)
  walletAddress?: string;
  avatarColor: string;
  language: Language;
  gameHistory: GameHistoryItem[];
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
  currency: CurrencyType; // Добавлено: какую валюту принимает комната
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
  entryFee: number;      // Добавлено: стоимость входа для конкретной комнаты
  currency: CurrencyType; // Добавлено: тип валюты для отображения в списке
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
  currency: CurrencyType; // Добавлено: текущий тип валюты игры
  pot: number;
  winners: string[];
  winAmount: number;
  roomsList: RoomInfo[];
  config: DynamicGameConfig;
}

export const GAME_DEFAULTS = {
  PLAYER_SPEED: 0.35, 
  TICK_RATE: 60,
  ENTRY_FEE_TON: 1.0,  // 1 TON
  ENTRY_FEE_COINS: 100, // 100 Coins
  INITIAL_COINS: 1000, 
  MAX_WINNERS: 20,
  ZONE_TOLERANCE: 0.5,
};
