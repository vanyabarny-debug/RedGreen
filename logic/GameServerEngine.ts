import { GameSchema, GameState, LightColor, Player, Obstacle, GAME_DEFAULTS, RoomInfo, Difficulty, MapLength, RoomSettings } from '../types';

const networkChannel = new BroadcastChannel('game_channel');

type NetworkMessage = 
  | { type: 'ROOM_CREATE', room: RoomInfo }
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
  private isHost: boolean = false;

  constructor() {
    this.state = this.getInitialState(); 
    this.lastUpdate = Date.now();
    
    networkChannel.onmessage = (event) => {
      this.handleNetworkMessage(event.data as NetworkMessage);
    };
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
      entryFee: GAME_DEFAULTS.ENTRY_FEE,
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

  private generateObstacles(length: number, width: number, difficulty: Difficulty): Obstacle[] {
    const obstacles: Obstacle[] = [];
    
    // Настройки сложности
    let sawDensity = 50; // Каждые 50 метров
    let sawSpeedMultiplier = 1;
    let ballCount = 3;

    if (difficulty === Difficulty.EASY) {
        sawDensity = 70;
        sawSpeedMultiplier = 0.7;
        ballCount = 2;
    } else if (difficulty === Difficulty.HARD) {
        sawDensity = 30;
        sawSpeedMultiplier = 1.5;
        ballCount = 5;
    }

    // Генерация Пил
    const sawZPositions = [];
    for(let z = 40; z < length - 20; z += sawDensity) {
        sawZPositions.push(z);
    }

    sawZPositions.forEach((z) => {
      // Рандомизация позиции Z, чтобы не было слишком линейно
      const actualZ = z + (Math.random() * 10 - 5);
      const count = Math.random() > 0.5 ? 2 : 1;
      
      for (let i = 0; i < count; i++) {
        obstacles.push({
          id: `saw_${actualZ}_${i}`,
          type: 'SAW',
          x: (Math.random() * (width - 15)) - ((width - 15) / 2),
          z: actualZ,
          radius: 2.0,
          speed: (4 + Math.random() * 2) * sawSpeedMultiplier, 
          direction: Math.random() > 0.5 ? 1 : -1
        });
      }
    });

    // Генерация Шаров (Индиана Джонс)
    for(let i = 0; i < ballCount; i++) {
       obstacles.push({
          id: `ball_${i}`,
          type: 'BALL',
          x: (Math.random() * (width - 10)) - ((width - 10) / 2),
          z: length + (i * 30), 
          radius: difficulty === Difficulty.HARD ? 4.5 : 3.5,
          speed: (2 + Math.random() * 1.5) * sawSpeedMultiplier, 
          direction: -1 
       });
    }
    return obstacles;
  }

  // --- ROOM MANAGEMENT ---

  public createRoom(name: string, settings: RoomSettings, hostPlayer: Player) {
      const roomId = `room_${Date.now()}`;
      
      const newRoomInfo: RoomInfo = {
          id: roomId,
          name: name,
          hostId: hostPlayer.id,
          playersCount: 1,
          maxPlayers: settings.maxPlayers,
          difficulty: settings.difficulty,
          status: 'WAITING'
      };

      this.isHost = true;
      this.state.roomId = roomId;
      this.state.state = GameState.LOBBY;
      
      // Применяем настройки
      this.state.config = {
          fieldLength: settings.length,
          fieldWidth: 60,
          difficulty: settings.difficulty
      };

      this.state.obstacles = this.generateObstacles(settings.length, 60, settings.difficulty);
      this.state.players = { [hostPlayer.id]: { ...hostPlayer, isHost: true } };
      this.state.pot = GAME_DEFAULTS.ENTRY_FEE;
      this.state.winners = [];

      networkChannel.postMessage({ type: 'ROOM_CREATE', room: newRoomInfo });
      
      this.broadcast();
  }

  public joinRoom(roomId: string, player: Player) {
      // Проверка на клиенте, есть ли место
      const room = this.state.roomsList.find(r => r.id === roomId);
      if (room && room.playersCount >= room.maxPlayers) {
          alert("Комната заполнена!");
          return;
      }

      this.isHost = false;
      this.state.roomId = roomId;
      this.state.state = GameState.LOBBY;
      this.state.players = {}; 
      
      networkChannel.postMessage({ type: 'ROOM_JOIN', roomId, player });
  }

  public leaveRoom() {
      if (!this.state.roomId) return;
      
      const roomId = this.state.roomId;
      const playerId = this.myPlayerId;

      // Локальный сброс
      this.state.roomId = null;
      this.state.state = GameState.MENU;
      this.state.players = {};
      this.isHost = false;

      // Уведомляем сеть
      networkChannel.postMessage({ type: 'ROOM_LEAVE', roomId, playerId });
      this.broadcast();
  }

  // --- GAME LOGIC ---

  public startGame() {
    if (!this.isHost) return;

    this.state.state = GameState.PLAYING;
    this.state.light = LightColor.RED;
    this.state.timeRemaining = 3000;
    this.lastUpdate = Date.now();
    this.lastLightSwitchTime = Date.now() - 10000; 
    
    // Обновляем статус комнаты в списке
    const roomIdx = this.state.roomsList.findIndex(r => r.id === this.state.roomId);
    if(roomIdx !== -1) {
        this.state.roomsList[roomIdx].status = 'PLAYING';
    }

    this.runGameLoop();
    this.broadcastNetwork({ type: 'GAME_START', roomId: this.state.roomId! });
    this.broadcast();
  }

  public playerMove(playerId: string, dx: number, dz: number) {
    if (this.state.state !== GameState.PLAYING) return;

    if (!this.isHost) {
        this.applyMove(playerId, dx, dz); 
        this.broadcast(); 
        
        if (this.state.roomId) {
            networkChannel.postMessage({ type: 'PLAYER_MOVE', roomId: this.state.roomId, playerId, x: dx, z: dz });
        }
        return;
    }

    this.applyMove(playerId, dx, dz);
    this.broadcast();
  }

  private applyMove(playerId: string, dx: number, dz: number) {
    const player = this.state.players[playerId];
    if (!player || player.isEliminated || player.hasFinished) return;

    if (this.isHost && this.state.light === LightColor.RED) {
        const timeSinceRed = Date.now() - this.lastLightSwitchTime;
        if (timeSinceRed > this.GRACE_PERIOD_MS) {
            if (dx !== 0 || dz !== 0) {
              this.eliminatePlayer(playerId, 'MOVEMENT');
              return;
            }
        }
    }

    if (dx !== 0 || dz !== 0) {
      let moveX = dx * GAME_DEFAULTS.PLAYER_SPEED;
      let moveZ = dz * GAME_DEFAULTS.PLAYER_SPEED;

      let newX = player.x + moveX;
      let newZ = player.z + moveZ;

      const boundary = this.state.config.fieldWidth / 2 - 1;
      if (newX > boundary) newX = boundary;
      if (newX < -boundary) newX = -boundary;

      this.state.players[playerId].x = newX;
      this.state.players[playerId].z = newZ;

      if (this.isHost && newZ >= this.state.config.fieldLength) {
        this.finishPlayer(playerId);
      }
    }
  }

  public reset() {
    if (!this.isHost) return;
    this.stopGameLoop();
    
    Object.keys(this.state.players).forEach(key => {
        this.state.players[key].x = (Math.random() - 0.5) * (this.state.config.fieldWidth - 10);
        this.state.players[key].z = Math.random() * -2;
        this.state.players[key].isEliminated = false;
        this.state.players[key].hasFinished = false;
        this.state.players[key].deathReason = undefined;
    });

    this.state.state = GameState.LOBBY;
    this.state.winners = [];
    this.state.pot = Object.keys(this.state.players).length * GAME_DEFAULTS.ENTRY_FEE;
    
    // Сброс статуса комнаты
    const roomIdx = this.state.roomsList.findIndex(r => r.id === this.state.roomId);
    if(roomIdx !== -1) {
        this.state.roomsList[roomIdx].status = 'WAITING';
    }

    this.broadcastNetwork({ type: 'GAME_RESET', roomId: this.state.roomId! });
    this.broadcast();
  }

  // --- NETWORK HANDLING ---

  private handleNetworkMessage(msg: NetworkMessage) {
      switch(msg.type) {
          case 'ROOM_CREATE':
              if (!this.state.roomsList.find(r => r.id === msg.room.id)) {
                  this.state.roomsList = [...this.state.roomsList, msg.room];
                  this.broadcast();
              }
              break;

          case 'ROOM_JOIN':
              if (this.isHost && this.state.roomId === msg.roomId) {
                  this.state.players[msg.player.id] = { ...msg.player, isHost: false };
                  this.state.pot += GAME_DEFAULTS.ENTRY_FEE;
                  
                  // Обновляем счетчик в списке (локально у хоста, потом расшарится)
                  const r = this.state.roomsList.find(rm => rm.id === this.state.roomId);
                  if (r) r.playersCount++;

                  this.broadcast();
              }
              break;

          case 'ROOM_LEAVE':
              if (this.isHost && this.state.roomId === msg.roomId) {
                  delete this.state.players[msg.playerId];
                  this.state.pot -= GAME_DEFAULTS.ENTRY_FEE;
                  const r = this.state.roomsList.find(rm => rm.id === this.state.roomId);
                  if (r) r.playersCount--;
                  this.broadcast();
              }
              // Если это клиент, и комната, в которой он был, обновилась (например, ушли другие)
              if (!this.isHost && this.state.roomId !== msg.roomId) {
                 // Обновление счетчиков в списке комнат
                 const r = this.state.roomsList.find(rm => rm.id === msg.roomId);
                 if (r && r.playersCount > 0) r.playersCount--;
                 this.broadcast();
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
                  // Особое внимание конфигу, он должен синхронизироваться
                  if (msg.partialState.config) {
                      this.state.config = msg.partialState.config;
                  }
                  this.broadcast();
              }
              break;
            
          case 'GAME_START':
              if (!this.isHost && this.state.roomId === msg.roomId) {
                  this.state.state = GameState.PLAYING;
                  this.broadcast();
              }
              break;
            
          case 'GAME_RESET':
             if (!this.isHost && this.state.roomId === msg.roomId) {
                  this.state.state = GameState.LOBBY;
                  this.broadcast();
              }
              break;
      }
  }

  private broadcastNetwork(msg: NetworkMessage) {
      networkChannel.postMessage(msg);
  }

  // --- HOST LOGIC ---

  private eliminatePlayer(playerId: string, reason: 'MOVEMENT' | 'OBSTACLE' = 'OBSTACLE') {
    if (this.state.players[playerId].isEliminated) return;
    this.state.players[playerId].isEliminated = true;
    this.state.players[playerId].deathReason = reason;
    this.broadcast();
  }

  private finishPlayer(playerId: string) {
    if (this.state.winners.length >= GAME_DEFAULTS.MAX_WINNERS) {
        this.eliminatePlayer(playerId, 'OBSTACLE'); 
        return;
    }

    this.state.players[playerId].hasFinished = true;
    this.state.players[playerId].z = this.state.config.fieldLength;
    this.state.players[playerId].finishTime = Date.now();
    this.state.winners.push(playerId);
    this.broadcast();
  }

  private runGameLoop() {
    this.loopId = setInterval(() => {
      this.update(1000 / GAME_DEFAULTS.TICK_RATE);
    }, 1000 / GAME_DEFAULTS.TICK_RATE);
  }

  private stopGameLoop() {
    if (this.loopId) clearInterval(this.loopId);
  }

  private update(dt: number) {
    if (this.state.state !== GameState.PLAYING) return;

    const now = Date.now();
    const delta = now - this.lastUpdate;
    this.lastUpdate = now;

    this.state.timeRemaining -= delta;

    if (this.state.timeRemaining <= 0) {
      this.switchLight();
    }

    // Движение препятствий
    this.state.obstacles.forEach(obs => {
        if (obs.type === 'SAW') {
            obs.x += obs.speed * obs.direction * (delta / 1000) * 4;
            const limit = this.state.config.fieldWidth / 2 - 2;
            if (obs.x > limit) { obs.x = limit; obs.direction = -1; } 
            else if (obs.x < -limit) { obs.x = -limit; obs.direction = 1; }
        } else if (obs.type === 'BALL') {
            obs.z -= obs.speed * (delta / 1000) * 4;
            if (obs.z < -20) {
                obs.z = this.state.config.fieldLength + 20;
                obs.x = (Math.random() * (this.state.config.fieldWidth - 6)) - ((this.state.config.fieldWidth - 6) / 2);
            }
        }
    });

    Object.values(this.state.players).forEach(p => {
      if (p.isEliminated || p.hasFinished) return;

      for (const obs of this.state.obstacles) {
        const dist = Math.sqrt(Math.pow(p.x - obs.x, 2) + Math.pow(p.z - obs.z, 2));
        const hitRadius = obs.type === 'BALL' ? obs.radius - 0.5 : obs.radius + 0.4;
        
        if (dist < hitRadius) {
            this.eliminatePlayer(p.id, 'OBSTACLE'); 
            break;
        }
      }
    });

    const activePlayers = Object.values(this.state.players).filter(p => !p.isEliminated && !p.hasFinished);
    const allFinishedOrDead = Object.values(this.state.players).every(p => p.isEliminated || p.hasFinished);
    
    if (Object.keys(this.state.players).length > 0 && allFinishedOrDead) {
      this.endGame();
    }
    
    if (this.isHost && this.state.roomId) {
        this.broadcastNetwork({ 
            type: 'STATE_UPDATE', 
            roomId: this.state.roomId, 
            partialState: {
                players: this.state.players,
                obstacles: this.state.obstacles,
                light: this.state.light,
                timeRemaining: this.state.timeRemaining,
                state: this.state.state,
                winners: this.state.winners,
                winAmount: this.state.winAmount,
                config: this.state.config // Важно слать конфиг, чтобы клиенты знали длину карты
            }
        });
    }
    
    this.broadcast();
  }

  private switchLight() {
    this.lastLightSwitchTime = Date.now();
    // Хардкор: меньше времени на бег, быстрее светофор
    let greenTime = 3000;
    let redTime = 2500;
    
    if (this.state.config.difficulty === Difficulty.HARD) {
        greenTime = 2000;
        redTime = 2000;
    }

    if (this.state.light === LightColor.RED) {
      this.state.light = LightColor.GREEN;
      this.state.timeRemaining = greenTime + Math.random() * 2000; 
    } else {
      this.state.light = LightColor.RED;
      this.state.timeRemaining = redTime + Math.random() * 2000;
    }
  }

  private endGame() {
    this.state.state = GameState.FINISHED;
    const survivors = this.state.winners.length;
    const winAmount = survivors > 0 
        ? Math.floor(this.state.pot / survivors) 
        : 0;
    
    this.state.winAmount = winAmount;
    this.stopGameLoop();
  }

  public subscribe(listener: (state: GameSchema) => void) {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private broadcast() {
    this.state = { ...this.state }; 
    this.listeners.forEach(l => l(this.state));
  }
}

export const serverInstance = new GameServerEngine();