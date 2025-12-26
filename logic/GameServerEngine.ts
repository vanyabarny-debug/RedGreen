import { 
  GameSchema, GameState, LightColor, Player, Obstacle, 
  GAME_DEFAULTS, RoomInfo, Difficulty, MapLength, RoomSettings 
} from '../types';

const networkChannel = new BroadcastChannel('game_channel');

type NetworkMessage = 
  | { type: 'ROOM_CREATE', room: RoomInfo }
  | { type: 'ROOM_QUERY' } // Запрос списка комнат для новичков
  | { type: 'ROOM_JOIN', roomId: string, player: Player }
  | { type: 'ROOM_LEAVE', roomId: string, playerId: string }
  | { type: 'PLAYER_MOVE', roomId: string, playerId: string, x: number, z: number }
  | { type: 'STATE_UPDATE', roomId: string, partialState: Partial<GameSchema> }
  | { type: 'GAME_START', roomId: string }
  | { type: 'GAME_RESET', roomId: string };

export class GameServerEngine {
  public state: GameSchema;
  private loopId: any;
  private lastUpdate: number;
  private listeners: ((state: GameSchema) => void)[] = [];
  
  private lastLightSwitchTime: number = 0;
  private readonly GRACE_PERIOD_MS = 400;
  
  private myPlayerId: string = '';
  public isHost: boolean = false; // Публичный для UI

  constructor() {
    this.state = this.getInitialState(); 
    this.lastUpdate = Date.now();
    
    networkChannel.onmessage = (event) => {
      this.handleNetworkMessage(event.data as NetworkMessage);
    };

    // Как только зашли, спрашиваем, есть ли созданные комнаты
    this.broadcastNetwork({ type: 'ROOM_QUERY' });
  }

  public setPlayerId(id: string) {
      this.myPlayerId = id;
  }

  private getInitialState(): GameSchema {
    return {
      roomId: null,
      state: GameState.MENU,
      light: LightColor.RED,
      timeRemaining: 0,
      players: {},
      obstacles: [],
      entryFee: GAME_DEFAULTS.ENTRY_FEE_COINS,
      currency: 'COINS',
      pot: 0,
      winners: [],
      winAmount: 0,
      roomsList: [],
      config: {
        fieldLength: MapLength.MEDIUM,
        fieldWidth: 60,
        difficulty: Difficulty.MEDIUM
      }
    };
  }

  // --- ГЕНЕРАЦИЯ (ТОЛЬКО ДЛЯ ХОСТА) ---
  private generateObstacles(length: number, width: number, difficulty: Difficulty): Obstacle[] {
    const obstacles: Obstacle[] = [];
    // ... твоя логика генерации (оставляем без изменений, она хорошая)
    return obstacles; 
  }

  // --- ROOM MANAGEMENT ---
  public createRoom(name: string, settings: RoomSettings, hostPlayer: Player) {
      const roomId = `room_${Date.now()}`;
      const fee = settings.isTraining ? GAME_DEFAULTS.ENTRY_FEE_COINS : GAME_DEFAULTS.ENTRY_FEE_TON;

      this.isHost = true;
      this.state.roomId = roomId;
      this.state.state = GameState.LOBBY;
      this.state.currency = settings.isTraining ? 'COINS' : 'TON';
      this.state.entryFee = fee;
      this.state.pot = fee;
      
      this.state.config = {
          fieldLength: settings.length,
          fieldWidth: 60,
          difficulty: settings.difficulty
      };

      this.state.obstacles = this.generateObstacles(settings.length, 60, settings.difficulty);
      this.state.players = { [hostPlayer.id]: { ...hostPlayer, isHost: true } };

      const newRoomInfo: RoomInfo = {
          id: roomId,
          name: name,
          hostId: hostPlayer.id,
          playersCount: 1,
          maxPlayers: settings.maxPlayers,
          difficulty: settings.difficulty,
          status: 'WAITING',
          isTraining: settings.isTraining,
          entryFee: fee,
          currency: this.state.currency as any
      };

      this.broadcastNetwork({ type: 'ROOM_CREATE', room: newRoomInfo });
      this.broadcast();
  }

  public joinRoom(roomId: string, player: Player) {
      this.isHost = false;
      this.state.roomId = roomId;
      this.state.state = GameState.LOBBY;
      this.state.players = {}; // Очищаем, ждем STATE_UPDATE от хоста
      
      this.broadcastNetwork({ type: 'ROOM_JOIN', roomId, player });
  }

  // --- ИГРОВОЙ ЦИКЛ ---
  public startGame() {
    if (!this.isHost) return;
    this.state.state = GameState.PLAYING;
    this.runGameLoop();
    this.broadcastNetwork({ type: 'GAME_START', roomId: this.state.roomId! });
  }

  private runGameLoop() {
    this.stopGameLoop(); // На всякий случай
    this.lastUpdate = Date.now();
    this.loopId = setInterval(() => {
      this.update();
    }, 1000 / GAME_DEFAULTS.TICK_RATE);
  }

  private stopGameLoop() {
    if (this.loopId) clearInterval(this.loopId);
    this.loopId = null;
  }

  private update() {
    if (this.state.state !== GameState.PLAYING || !this.isHost) return;
    
    const now = Date.now();
    const delta = now - this.lastUpdate;
    this.lastUpdate = now;
    
    this.state.timeRemaining -= delta;
    if (this.state.timeRemaining <= 0) this.switchLight();

    // 1. Движение препятствий (Только хост)
    this.state.obstacles.forEach(obs => {
        if (obs.type === 'SAW') {
            obs.x += obs.speed * obs.direction * (delta / 1000) * 4;
            const limit = this.state.config.fieldWidth / 2 - 2;
            if (obs.x > limit) { obs.x = limit; obs.direction = -1; } 
            else if (obs.x < -limit) { obs.x = -limit; obs.direction = 1; }
        }
        // ... логика BALL
    });

    // 2. Коллизии (Только хост)
    Object.values(this.state.players).forEach(p => {
      if (p.isEliminated || p.hasFinished) return;
      for (const obs of this.state.obstacles) {
        const dist = Math.sqrt(Math.pow(p.x - obs.x, 2) + Math.pow(p.z - obs.z, 2));
        if (dist < obs.radius) {
            this.eliminatePlayer(p.id, 'OBSTACLE');
        }
      }
    });

    // 3. Рассылка состояния всем игрокам
    this.broadcastNetwork({ 
        type: 'STATE_UPDATE', 
        roomId: this.state.roomId!, 
        partialState: {
            players: this.state.players,
            obstacles: this.state.obstacles,
            light: this.state.light,
            timeRemaining: this.state.timeRemaining,
            state: this.state.state,
            winners: this.state.winners,
            pot: this.state.pot
        }
    });
    this.broadcast();
  }

  // --- ОБРАБОТКА СЕТИ ---
  private handleNetworkMessage(msg: NetworkMessage) {
      switch(msg.type) {
          case 'ROOM_QUERY':
              // Если я хост, я должен заявить о своей комнате новичку
              if (this.isHost && this.state.roomId) {
                  const myRoom = this.state.roomsList.find(r => r.id === this.state.roomId);
                  if (myRoom) this.broadcastNetwork({ type: 'ROOM_CREATE', room: myRoom });
              }
              break;

          case 'ROOM_CREATE':
              if (!this.state.roomsList.find(r => r.id === msg.room.id)) {
                  this.state.roomsList = [...this.state.roomsList, msg.room];
                  this.broadcast();
              }
              break;

          case 'ROOM_JOIN':
              if (this.isHost && this.state.roomId === msg.roomId) {
                  this.state.players[msg.player.id] = { ...msg.player, isHost: false };
                  this.state.pot += this.state.entryFee;
                  this.broadcast();
              }
              break;

          case 'STATE_UPDATE':
              if (!this.isHost && this.state.roomId === msg.roomId) {
                  // Обновляем состояние из данных хоста
                  this.state = { ...this.state, ...msg.partialState };
                  this.broadcast();
              }
              break;
          
          case 'PLAYER_MOVE':
              if (this.isHost && this.state.roomId === msg.roomId) {
                  this.applyMove(msg.playerId, msg.x, msg.z);
              }
              break;
          
          // ... остальные кейсы (GAME_START, RESET) оставляем
      }
  }

  public playerMove(playerId: string, dx: number, dz: number) {
    if (this.state.state !== GameState.PLAYING) return;
    
    // Если я не хост — отправляю запрос хосту
    if (!this.isHost) {
        this.broadcastNetwork({ type: 'PLAYER_MOVE', roomId: this.state.roomId!, playerId, x: dx, z: dz });
    } else {
        this.applyMove(playerId, dx, dz);
    }
  }

  private broadcastNetwork(msg: NetworkMessage) {
      networkChannel.postMessage(msg);
  }

  public subscribe(listener: (state: GameSchema) => void) {
    this.listeners.push(listener);
    listener(this.state);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private broadcast() {
    this.listeners.forEach(l => l({ ...this.state }));
  }
}

export const serverInstance = new GameServerEngine();
