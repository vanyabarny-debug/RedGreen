import { 
  GameSchema, GameState, LightColor, Player, Obstacle, 
  GAME_DEFAULTS, RoomInfo, Difficulty, MapLength, RoomSettings 
} from '../types';

// Канал связи между вкладками/окнами Telegram
const networkChannel = new BroadcastChannel('game_channel');

type NetworkMessage = 
  | { type: 'ROOM_CREATE', room: RoomInfo, obstacles: Obstacle[] }
  | { type: 'ROOM_QUERY' } 
  | { type: 'ROOM_JOIN', roomId: string, player: Player }
  | { type: 'ROOM_LEAVE', roomId: string, playerId: string }
  | { type: 'PLAYER_MOVE', roomId: string, playerId: string, x: number, z: number }
  | { type: 'STATE_UPDATE', roomId: string, partialState: Partial<GameSchema> }
  | { type: 'GAME_START', roomId: string }
  | { type: 'GAME_RESET', roomId: string }
  | { type: 'HEARTBEAT', roomId: string, playerId: string };

export class GameServerEngine {
  public state: GameSchema;
  private loopId: any = null;
  private lastUpdate: number = Date.now();
  private listeners: ((state: GameSchema) => void)[] = [];
  
  // Логика таймаутов
  private lastSeen: Map<string, number> = new Map();
  private readonly TIMEOUT_MS = 15000; 
  private readonly HEARTBEAT_INTERVAL = 5000;

  // Игровые тайминги
  private lastLightSwitchTime: number = 0;
  private readonly GRACE_PERIOD_MS = 400;
  
  public myPlayerId: string = '';
  public isHost: boolean = false;

  constructor() {
    this.state = this.getInitialState();
    
    networkChannel.onmessage = (event) => {
      this.handleNetworkMessage(event.data as NetworkMessage);
    };

    // Фоновые процессы
    setInterval(() => this.checkAlivePlayers(), 5000);
    setInterval(() => this.sendHeartbeat(), this.HEARTBEAT_INTERVAL);
    
    // Запрос списка комнат при входе
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

  // --- СИСТЕМА ЖИЗНЕСПОСОБНОСТИ (ANTIPHOST) ---

  private sendHeartbeat() {
    if (this.state.roomId && this.myPlayerId) {
      this.broadcastNetwork({ 
        type: 'HEARTBEAT', 
        roomId: this.state.roomId, 
        playerId: this.myPlayerId 
      });
    }
  }

  private checkAlivePlayers() {
    if (!this.isHost || !this.state.roomId) return;
    const now = Date.now();
    
    Object.keys(this.state.players).forEach(pid => {
      if (pid !== this.myPlayerId) {
        const lastPing = this.lastSeen.get(pid) || 0;
        if (now - lastPing > this.TIMEOUT_MS) {
          console.warn(`Игрок ${pid} отключился (таймаут)`);
          this.removePlayer(pid);
        }
      }
    });
  }

  private removePlayer(pid: string) {
    delete this.state.players[pid];
    this.lastSeen.delete(pid);
    const r = this.state.roomsList.find(rm => rm.id === this.state.roomId);
    if (r) r.playersCount = Object.keys(this.state.players).length;
    this.broadcast();
  }

  // --- УПРАВЛЕНИЕ КОМНАТАМИ ---

  public createRoom(name: string, settings: RoomSettings, hostPlayer: Player) {
    const roomId = `room_${Date.now()}`;
    this.isHost = true;
    
    this.state.roomId = roomId;
    this.state.state = GameState.LOBBY;
    this.state.config = {
      fieldLength: settings.length,
      fieldWidth: 60,
      difficulty: settings.difficulty
    };

    // Генерируем препятствия ОДИН РАЗ на хосте
    this.state.obstacles = this.generateObstacles(settings.length, 60, settings.difficulty);
    this.state.players = { [hostPlayer.id]: { ...hostPlayer, isHost: true } };
    this.state.currency = settings.isTraining ? 'COINS' : 'TON';
    this.state.entryFee = settings.isTraining ? GAME_DEFAULTS.ENTRY_FEE_COINS : GAME_DEFAULTS.ENTRY_FEE_TON;
    this.state.pot = this.state.entryFee;

    const roomInfo: RoomInfo = {
      id: roomId,
      name,
      hostId: hostPlayer.id,
      playersCount: 1,
      maxPlayers: settings.maxPlayers,
      difficulty: settings.difficulty,
      status: 'WAITING',
      isTraining: settings.isTraining,
      entryFee: this.state.entryFee,
      currency: this.state.currency as any
    };

    this.broadcastNetwork({ type: 'ROOM_CREATE', room: roomInfo, obstacles: this.state.obstacles });
    this.broadcast();
  }

  public joinRoom(roomId: string, player: Player) {
    this.isHost = false;
    this.state.roomId = roomId;
    this.state.state = GameState.LOBBY;
    this.state.players = {}; 
    this.broadcastNetwork({ type: 'ROOM_JOIN', roomId, player });
  }

  public leaveRoom() {
    if (!this.state.roomId) return;
    this.broadcastNetwork({ 
      type: 'ROOM_LEAVE', 
      roomId: this.state.roomId, 
      playerId: this.myPlayerId 
    });
    this.state = this.getInitialState();
    this.isHost = false;
    this.stopGameLoop();
    this.broadcast();
  }

  // --- ИГРОВАЯ ЛОГИКА (АВТОРИТАРНАЯ) ---

  public startGame() {
    if (!this.isHost) return;
    if (Object.keys(this.state.players).length < 1) return;

    this.state.state = GameState.PLAYING;
    this.state.light = LightColor.RED;
    this.state.timeRemaining = 3000;
    this.runGameLoop();
    this.broadcastNetwork({ type: 'GAME_START', roomId: this.state.roomId! });
    this.broadcast();
  }

  private runGameLoop() {
    this.stopGameLoop();
    this.lastUpdate = Date.now();
    this.loopId = setInterval(() => this.update(), 1000 / GAME_DEFAULTS.TICK_RATE);
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

    // Движение препятствий
    this.state.obstacles.forEach(obs => {
      if (obs.type === 'SAW') {
        obs.x += obs.speed * obs.direction * (delta / 1000) * 4;
        const limit = this.state.config.fieldWidth / 2 - 2;
        if (obs.x > limit) { obs.x = limit; obs.direction = -1; }
        else if (obs.x < -limit) { obs.x = -limit; obs.direction = 1; }
      }
    });

    // Коллизии и проверка финиша
    Object.values(this.state.players).forEach(p => {
      if (p.isEliminated || p.hasFinished) return;
      
      // Коллизии
      for (const obs of this.state.obstacles) {
        const dist = Math.sqrt(Math.pow(p.x - obs.x, 2) + Math.pow(p.z - obs.z, 2));
        if (dist < obs.radius) {
          this.eliminatePlayer(p.id, 'OBSTACLE');
        }
      }

      // Финиш
      if (p.z >= this.state.config.fieldLength) {
        this.finishPlayer(p.id);
      }
    });

    // Проверка завершения матча
    const activePlayers = Object.values(this.state.players).filter(p => !p.isEliminated && !p.hasFinished);
    if (activePlayers.length === 0 && Object.keys(this.state.players).length > 0) {
      this.endGame();
    }

    // Рассылка состояния
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

  private switchLight() {
    this.lastLightSwitchTime = Date.now();
    const isRed = this.state.light === LightColor.RED;
    this.state.light = isRed ? LightColor.GREEN : LightColor.RED;
    this.state.timeRemaining = isRed ? (3000 + Math.random() * 2000) : (2000 + Math.random() * 1500);
  }

  public playerMove(playerId: string, dx: number, dz: number) {
    if (this.state.state !== GameState.PLAYING) return;
    if (!this.isHost) {
      this.broadcastNetwork({ type: 'PLAYER_MOVE', roomId: this.state.roomId!, playerId, x: dx, z: dz });
    } else {
      this.applyMove(playerId, dx, dz);
    }
  }

  private applyMove(playerId: string, dx: number, dz: number) {
    const p = this.state.players[playerId];
    if (!p || p.isEliminated || p.hasFinished) return;

    // Проверка Красного Света
    if (this.state.light === LightColor.RED) {
      const grace = Date.now() - this.lastLightSwitchTime;
      if (grace > this.GRACE_PERIOD_MS && (dx !== 0 || dz !== 0)) {
        this.eliminatePlayer(playerId, 'MOVEMENT');
        return;
      }
    }

    p.x += dx * GAME_DEFAULTS.PLAYER_SPEED;
    p.z += dz * GAME_DEFAULTS.PLAYER_SPEED;
    
    // Ограничение границ
    const bound = this.state.config.fieldWidth / 2 - 1;
    p.x = Math.max(-bound, Math.min(bound, p.x));
  }

  private eliminatePlayer(pid: string, reason: 'MOVEMENT' | 'OBSTACLE') {
    if (this.state.players[pid]) {
      this.state.players[pid].isEliminated = true;
      this.state.players[pid].deathReason = reason;
    }
  }

  private finishPlayer(pid: string) {
    if (!this.state.winners.includes(pid)) {
      this.state.players[pid].hasFinished = true;
      this.state.winners.push(pid);
    }
  }

  private endGame() {
    this.state.state = GameState.FINISHED;
    const count = this.state.winners.length;
    this.state.winAmount = count > 0 ? Math.floor(this.state.pot / count) : 0;
    this.stopGameLoop();
  }

  // --- СЕТЕВАЯ ОБРАБОТКА ---

  private handleNetworkMessage(msg: NetworkMessage) {
    switch (msg.type) {
      case 'ROOM_QUERY':
        if (this.isHost && this.state.roomId) {
          const r = this.state.roomsList.find(rm => rm.id === this.state.roomId);
          if (r) this.broadcastNetwork({ type: 'ROOM_CREATE', room: r, obstacles: this.state.obstacles });
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
          this.lastSeen.set(msg.player.id, Date.now());
          this.broadcast();
        }
        break;
      case 'HEARTBEAT':
        if (this.isHost && this.state.roomId === msg.roomId) {
          this.lastSeen.set(msg.playerId, Date.now());
        }
        break;
      case 'PLAYER_MOVE':
        if (this.isHost && this.state.roomId === msg.roomId) {
          this.applyMove(msg.playerId, msg.x, msg.z);
        }
        break;
      case 'STATE_UPDATE':
        if (!this.isHost && this.state.roomId === msg.roomId) {
          this.state = { ...this.state, ...msg.partialState };
          this.broadcast();
        }
        break;
      case 'GAME_START':
        if (!this.isHost && this.state.roomId === msg.roomId) {
          this.state.state = GameState.PLAYING;
          this.broadcast();
        }
        break;
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

  private generateObstacles(len: number, wid: number, diff: Difficulty): Obstacle[] {
    const obs: Obstacle[] = [];
    // Простая генерация для примера (можно расширить как в предыдущем коде)
    for(let z = 20; z < len - 10; z += 30) {
      obs.push({
        id: `saw_${z}`, type: 'SAW', x: 0, z, radius: 2, speed: 5, direction: 1
      });
    }
    return obs;
  }
}

export const serverInstance = new GameServerEngine();
