import { GameSchema, GameState, LightColor, Player, Obstacle, GAME_CONFIG } from '../types';

export class GameServerEngine {
  public state: GameSchema;
  private loopId: any;
  private lastUpdate: number;
  private listeners: ((state: GameSchema) => void)[] = [];
  
  private lastLightSwitchTime: number = 0;
  private readonly GRACE_PERIOD_MS = 400;

  constructor() {
    this.state = this.getInitialState(0); 
    this.lastUpdate = Date.now();
  }

  private getInitialState(currentBalance: number): GameSchema {
    const obstacles: Obstacle[] = [];
    
    const sawZPositions = [50, 100, 150]; 
    sawZPositions.forEach((z) => {
      const count = Math.random() > 0.5 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        obstacles.push({
          id: `saw_${z}_${i}`,
          type: 'SAW',
          x: (Math.random() * (GAME_CONFIG.FIELD_WIDTH - 15)) - ((GAME_CONFIG.FIELD_WIDTH - 15) / 2),
          z: z,
          radius: 2.0,
          speed: 4 + Math.random() * 2, 
          direction: Math.random() > 0.5 ? 1 : -1
        });
      }
    });

    for(let i = 0; i < 3; i++) {
       obstacles.push({
          id: `ball_${i}`,
          type: 'BALL',
          x: (Math.random() * (GAME_CONFIG.FIELD_WIDTH - 10)) - ((GAME_CONFIG.FIELD_WIDTH - 10) / 2),
          z: GAME_CONFIG.FIELD_LENGTH + (i * 30), 
          radius: 3.5,
          speed: 2 + Math.random() * 1.5, 
          direction: -1 
       });
    }

    return {
      state: GameState.LOBBY,
      light: LightColor.RED,
      timeRemaining: 0,
      players: {},
      obstacles: obstacles,
      entryFee: GAME_CONFIG.ENTRY_FEE,
      pot: 0,
      winners: [],
      winAmount: 0,
    } as GameSchema;
  }

  // Начало процесса входа (переход в комнату ожидания)
  public startLobbySequence(playerId: string, playerName?: string) {
      if (this.state.state !== GameState.LOBBY) return;
      
      this.state.state = GameState.WAITING;
      this.state.pot = GAME_CONFIG.ENTRY_FEE; // Взнос игрока
      
      // Сброс и добавление главного игрока
      this.state.players = {};
      this.addPlayerInternal(playerId, playerName || "You", false);

      this.broadcast();

      // ВНИМАНИЕ: Здесь нет логики добавления ботов или других игроков.
      // В реальном приложении здесь ожидается WebSocket сообщение 'PLAYER_JOINED'.
  }

  private addPlayerInternal(id: string, name: string, isBot: boolean) {
      // Имитация цвета
      const legoColors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#ffffff', '#111111'];
      const color = isBot ? legoColors[Math.floor(Math.random() * legoColors.length)] : '#4f46e5';
      
      this.state.players[id] = {
          id,
          name,
          x: (Math.random() - 0.5) * (GAME_CONFIG.FIELD_WIDTH - 10),
          z: Math.random() * -2,
          color,
          isEliminated: false,
          hasFinished: false,
          isBot
      };
  }

  public startGame() {
    this.state.state = GameState.PLAYING;
    this.state.light = LightColor.RED;
    this.state.timeRemaining = 3000;
    this.lastUpdate = Date.now();
    this.lastLightSwitchTime = Date.now() - 10000; 
    
    this.runGameLoop();
    this.broadcast();
  }

  public playerMove(playerId: string, dx: number, dz: number) {
    const player = this.state.players[playerId];
    if (!player || player.isEliminated || player.hasFinished || this.state.state !== GameState.PLAYING) return;

    if (this.state.light === LightColor.RED) {
      const timeSinceRed = Date.now() - this.lastLightSwitchTime;
      if (timeSinceRed > this.GRACE_PERIOD_MS) {
          if (dx !== 0 || dz !== 0) {
            this.eliminatePlayer(playerId, 'MOVEMENT');
            return;
          }
      }
    }

    if (dx !== 0 || dz !== 0) {
      const length = Math.sqrt(dx*dx + dz*dz);
      
      let moveX, moveZ;
      moveX = dx * GAME_CONFIG.PLAYER_SPEED;
      moveZ = dz * GAME_CONFIG.PLAYER_SPEED;

      let newX = player.x + moveX;
      let newZ = player.z + moveZ;

      const boundary = GAME_CONFIG.FIELD_WIDTH / 2 - 1;
      if (newX > boundary) newX = boundary;
      if (newX < -boundary) newX = -boundary;

      this.state.players[playerId].x = newX;
      this.state.players[playerId].z = newZ;

      if (newZ >= GAME_CONFIG.FIELD_LENGTH) {
        this.finishPlayer(playerId);
      }
    }
  }

  public reset() {
    this.stopGameLoop();
    this.state = this.getInitialState(0);
    this.broadcast();
  }

  private eliminatePlayer(playerId: string, reason: 'MOVEMENT' | 'OBSTACLE' = 'OBSTACLE') {
    if (this.state.players[playerId].isEliminated) return;
    this.state.players[playerId].isEliminated = true;
    this.state.players[playerId].deathReason = reason;
    this.broadcast();
  }

  private finishPlayer(playerId: string) {
    if (this.state.winners.length >= GAME_CONFIG.MAX_WINNERS) {
        this.eliminatePlayer(playerId, 'OBSTACLE'); 
        return;
    }

    this.state.players[playerId].hasFinished = true;
    this.state.players[playerId].z = GAME_CONFIG.FIELD_LENGTH;
    this.state.players[playerId].finishTime = Date.now();
    this.state.winners.push(playerId);
    this.broadcast();
  }

  private runGameLoop() {
    this.loopId = setInterval(() => {
      this.update(1000 / GAME_CONFIG.TICK_RATE);
    }, 1000 / GAME_CONFIG.TICK_RATE);
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

    this.state.obstacles.forEach(obs => {
        if (obs.type === 'SAW') {
            obs.x += obs.speed * obs.direction * (delta / 1000) * 4;
            const limit = GAME_CONFIG.FIELD_WIDTH / 2 - 2;
            if (obs.x > limit) { obs.x = limit; obs.direction = -1; } 
            else if (obs.x < -limit) { obs.x = -limit; obs.direction = 1; }
        } else if (obs.type === 'BALL') {
            obs.z -= obs.speed * (delta / 1000) * 4;
            if (obs.z < -20) {
                obs.z = GAME_CONFIG.FIELD_LENGTH + 20;
                obs.x = (Math.random() * (GAME_CONFIG.FIELD_WIDTH - 6)) - ((GAME_CONFIG.FIELD_WIDTH - 6) / 2);
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
    
    // Игра завершается, если все игроки выбыли или финишировали
    if (Object.keys(this.state.players).length > 0 && allFinishedOrDead) {
      this.endGame();
    }
    
    this.broadcast();
  }

  private switchLight() {
    this.lastLightSwitchTime = Date.now();
    if (this.state.light === LightColor.RED) {
      this.state.light = LightColor.GREEN;
      this.state.timeRemaining = 3000 + Math.random() * 2000; 
    } else {
      this.state.light = LightColor.RED;
      this.state.timeRemaining = 2500 + Math.random() * 2000;
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