import React, { useState, useEffect } from 'react';
import { 
    GameSchema, GameState, LightColor, GAME_DEFAULTS, Player, 
    UserProfile, Difficulty, MapLength, RoomSettings, Friend, GameHistoryItem
} from '../types';
import { 
    Users, Trophy, Skull, Play, Maximize2, Minimize2, 
    Star, Plus, Loader2, ArrowDownCircle, X, LogOut, Send, 
    RefreshCw, Edit3, TrendingUp, TrendingDown, Percent
} from 'lucide-react';
import { serverInstance } from '../logic/GameServerEngine';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

const ADMIN_WALLET_ADDRESS = "0QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC"; 

// --- СЛОВАРЬ ЛОКАЛИЗАЦИИ ---
const TRANSLATIONS = {
    RU: {
        rooms: "КОМНАТЫ", friends: "ДРУЗЬЯ", create: "СОЗДАТЬ", createGame: "СОЗДАТЬ ИГРУ",
        profile: "Профиль", tonBal: "Баланс TON", coinsBal: "Баланс Coins", deposit: "Депозит 1 TON",
        save: "Сохранить", name: "Имя игрока", players: "Игроки", diff: "Сложность",
        len: "Длина", entry: "Взнос", training: "Тренировка", tonGame: "TON Игра",
        noRooms: "Нет активных комнат", inputWait: "Вход", join: "Играть", invite: "Позвать",
        sync: "Синхронизация...", lobby: "ЛОББИ", exit: "Выйти", start: "НАЧАТЬ ИГРУ",
        waitHost: "Ожидание хоста...", pot: "БАНК", alive: "ЖИВЫЕ", win: "ПОБЕДА!",
        eliminated: "ВЫБЫЛ", menu: "ГЛАВНОЕ МЕНЮ", perPlayer: "на игрока", stats: "Статистика",
        history: "История", loss: "Минус", gain: "Плюс", connect: "Подключить",
        easy: "Легко", med: "Средне", hard: "Хардкор", short: "Короткая", avg: "Средняя",
        long: "Марафон", paid: "ОПЛАЧЕНО", run: "БЕГИ", stop: "СТОЙ", winRate: "Побед",
        netPnl: "PnL", emptyHistory: "История пуста"
    },
    EN: {
        rooms: "ROOMS", friends: "FRIENDS", create: "CREATE", createGame: "CREATE GAME",
        profile: "Profile", tonBal: "TON Balance", coinsBal: "Coins Balance", deposit: "Deposit 1 TON",
        save: "Save", name: "Player Name", players: "Players", diff: "Difficulty",
        len: "Length", entry: "Entry Fee", training: "Training", tonGame: "TON Game",
        noRooms: "No rooms", inputWait: "Entry", join: "Join", invite: "Invite",
        sync: "Syncing...", lobby: "LOBBY", exit: "Exit", start: "START GAME",
        waitHost: "Wait for host...", pot: "POT", alive: "ALIVE", win: "VICTORY!",
        eliminated: "ELIMINATED", menu: "MAIN MENU", perPlayer: "per player", stats: "Stats",
        history: "History", loss: "Loss", gain: "Profit", connect: "Connect",
        easy: "Easy", med: "Med", hard: "Hard", short: "Short", avg: "Med",
        long: "Long", paid: "PAID", run: "RUN", stop: "STOP", winRate: "Win Rate",
        netPnl: "PnL", emptyHistory: "No history"
    }
};

interface UIProps {
  state: GameSchema;
  playerId: string;
  userProfile: UserProfile;
  isTrainingMode: boolean;
  onToggleMode: () => void;
  onStart: () => void;
  onReset: () => void;
  playCashSound: () => void;
  onUpdateProfile: (p: Partial<UserProfile>) => void;
}

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---
const LegoAvatar = ({ color, size = "w-12 h-12" }: { color: string, size?: string }) => (
  <div className={`${size} rounded-full overflow-hidden border-2 border-white/20 bg-gray-800 flex items-center justify-center relative shadow-lg`}>
      <div className="absolute inset-0" style={{ backgroundColor: color }}></div>
      <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 relative z-10 text-yellow-400 fill-current">
          <path d="M25,35 L25,85 L75,85 L75,35 Z" stroke="black" strokeWidth="2" />
          <path d="M35,35 L35,25 L65,25 L65,35 Z" stroke="black" strokeWidth="2" />
          <circle cx="40" cy="55" r="4" fill="black" />
          <circle cx="60" cy="55" r="4" fill="black" />
          <path d="M40,70 Q50,80 60,70" stroke="black" strokeWidth="3" fill="none" />
      </svg>
  </div>
);

const TonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#0098EA"/>
    <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.6944 19.4202 14.4632 22.4861L24.0249 39.0542C25.7914 42.1154 30.2103 42.1154 31.9768 39.0542L41.5385 22.4861C43.3056 19.4202 41.0789 15.6277 37.5603 15.6277ZM26.255 35.2504L21.8711 27.6534L26.255 24.3857V35.2504ZM29.7467 35.2504V24.3857L34.1289 27.6534L29.7467 35.2504ZM35.8283 25.592L30.9583 21.9619L36.3883 17.9157C36.7908 17.6157 37.3192 18.1097 37.0692 18.5434L35.8283 25.592ZM28.0008 17.3889L34.2658 22.0592L28.0008 26.7294L21.7342 22.0592L28.0008 17.3889ZM19.6133 17.9157L25.0433 21.9636L20.1717 25.5937L18.9308 18.5434C18.6808 18.1097 19.2092 17.6157 19.6133 17.9157Z" fill="white"/>
  </svg>
);

const CoinIcon = ({ className }: { className?: string }) => (
    <div className={`rounded-full bg-yellow-500 border-2 border-yellow-300 flex items-center justify-center font-bold text-black ${className}`}>C</div>
);

// --- ОСНОВНОЙ КОМПОНЕНТ UI ---
export const UI: React.FC<UIProps> = ({ state, playerId, userProfile, isTrainingMode, onToggleMode, onStart, onReset, playCashSound, onUpdateProfile }) => {
  const players = Object.values(state.players) as Player[];
  const me = state.players[playerId];
  const lang = userProfile.language;
  const t = TRANSLATIONS[lang];

  // Состояние модалок
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'FRIENDS'>('ROOMS');
  const [isProcessing, setIsProcessing] = useState(false);

  // Настройки новой комнаты
  const [newRoomName, setNewRoomName] = useState(`${userProfile.username}'s Arena`);
  const [newRoomDifficulty, setNewRoomDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [newRoomLength, setNewRoomLength] = useState<MapLength>(MapLength.MEDIUM);

  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // Логика создания
  const handleCreateRoom = () => {
    const settings: RoomSettings = { difficulty: newRoomDifficulty, length: newRoomLength, maxPlayers: 20, isTraining: isTrainingMode };
    serverInstance.createRoom(newRoomName, settings, { id: playerId, name: userProfile.username, x: 0, z: -2, color: userProfile.avatarColor, isEliminated: false, hasFinished: false, isBot: false, isHost: true });
    setShowCreateRoom(false);
  };

  // --- 1. ГЛАВНОЕ МЕНЮ ---
  if (state.state === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] z-50 p-4 font-sans">
        {/* Переключатель режимов */}
        <div className="flex bg-slate-800 p-1 rounded-full mb-8 border border-white/10 w-64">
          <button onClick={onToggleMode} className={`flex-1 py-2 rounded-full text-xs font-black transition-all ${isTrainingMode ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>{t.training}</button>
          <button onClick={onToggleMode} className={`flex-1 py-2 rounded-full text-xs font-black transition-all ${!isTrainingMode ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>{t.tonGame}</button>
        </div>

        {/* Список комнат */}
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 h-[70vh] flex flex-col backdrop-blur-xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3" onClick={() => setShowProfile(true)}>
              <LegoAvatar color={userProfile.avatarColor} size="w-10 h-10" />
              <div className="text-left">
                <p className="text-white font-bold text-sm leading-tight">{userProfile.username}</p>
                <p className="text-yellow-400 text-xs font-mono">{userProfile.coins} Coins</p>
              </div>
            </div>
            <TonConnectButton />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-hide">
            {state.roomsList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 italic text-sm text-center">
                <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-20" />
                {t.noRooms}
              </div>
            ) : (
              state.roomsList.map(room => (
                <button key={room.id} onClick={() => serverInstance.joinRoom(room.id, { id: playerId, name: userProfile.username, x: 0, z: -2, color: userProfile.avatarColor, isEliminated: false, hasFinished: false, isBot: false })} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center hover:bg-emerald-500/10 transition-colors">
                  <div className="text-left">
                    <p className="text-white font-bold">{room.name}</p>
                    <p className="text-[10px] text-emerald-400 uppercase">{room.difficulty}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                    <Users className="w-4 h-4" /> {room.playersCount}/{room.maxPlayers}
                  </div>
                </button>
              ))
            )}
          </div>

          <button onClick={() => setShowCreateRoom(true)} className="w-full py-4 bg-emerald-500 text-black font-black rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> {t.create}
          </button>
        </div>

        {/* Модалка создания */}
        {showCreateRoom && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
                <div className="bg-slate-900 border border-white/10 p-8 rounded-[32px] w-full max-w-sm">
                    <h2 className="text-white text-2xl font-black mb-6 uppercase tracking-tight">{t.createGame}</h2>
                    <div className="space-y-6">
                        <input className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-emerald-500" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder={t.name} />
                        <div className="flex gap-2">
                            {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
                                <button key={d} onClick={() => setNewRoomDifficulty(d)} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${newRoomDifficulty === d ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-white/5 border-white/10 text-gray-500'}`}>{d}</button>
                            ))}
                        </div>
                        <button onClick={handleCreateRoom} className="w-full py-5 bg-emerald-500 text-black font-black rounded-2xl uppercase">{t.start}</button>
                        <button onClick={() => setShowCreateRoom(false)} className="w-full text-gray-500 font-bold text-sm">{t.exit}</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- 2. ЛОББИ ---
  if (state.state === GameState.LOBBY) {
    return (
      <div className="absolute inset-0 bg-[#0f172a] z-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
            <div className="flex justify-between items-center mb-12">
                <button onClick={() => serverInstance.leaveRoom()} className="text-gray-400 flex items-center gap-2 font-bold uppercase text-xs hover:text-white"><LogOut className="w-4 h-4"/> {t.exit}</button>
                <div className="text-right">
                    <p className="text-emerald-500 text-[10px] font-black tracking-widest">LOBBY READY</p>
                    <p className="text-white font-mono text-xl">{state.roomId?.slice(0, 8)}</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-2xl mb-8">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">{t.pot}</p>
                        <div className="flex items-center gap-2">
                            {isTrainingMode ? <CoinIcon className="w-6 h-6" /> : <TonIcon className="w-6 h-6" />}
                            <span className={`text-4xl font-black font-mono ${isTrainingMode ? 'text-yellow-400' : 'text-blue-500'}`}>{state.pot}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">{t.players}</p>
                        <p className="text-3xl text-white font-mono font-black">{players.length}</p>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-6 max-h-[30vh] overflow-y-auto pr-2 scrollbar-hide">
                    {players.map(p => (
                        <div key={p.id} className="flex flex-col items-center gap-2 animate-bounce-subtle">
                            <div className="relative">
                                <LegoAvatar color={p.color} size="w-14 h-14" />
                                {p.isHost && <Star className="absolute -top-1 -right-1 w-5 h-5 text-yellow-500 fill-current" />}
                            </div>
                            <span className="text-[10px] text-white/60 font-bold truncate w-full text-center">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {me?.isHost ? (
                <button onClick={onStart} className="w-full py-6 bg-emerald-500 text-black font-black text-2xl rounded-[24px] shadow-2xl active:scale-95 transition-transform uppercase italic tracking-tighter">Start Match</button>
            ) : (
                <div className="w-full py-6 bg-white/5 rounded-[24px] text-gray-500 text-center font-bold italic border border-white/5">{t.waitHost}</div>
            )}
        </div>
      </div>
    );
  }

  // --- 3. ИГРОВОЙ ПРОЦЕСС ---
  if (state.state === GameState.PLAYING) {
    const isGreen = state.light === LightColor.GREEN;
    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-8 z-40">
        <div className="w-full flex justify-between items-start">
            <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{t.alive}</p>
                <p className="text-2xl text-white font-mono font-black">{players.filter(p => !p.isEliminated && !p.hasFinished).length}</p>
            </div>
            {/* Светофор */}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${isGreen ? 'bg-green-500/20 border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)]' : 'bg-red-500/20 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]'}`}>
                <div className={`w-12 h-12 rounded-full animate-pulse ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right">
                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">{t.pot}</p>
                <p className="text-2xl text-yellow-400 font-mono font-black">{state.pot}</p>
            </div>
        </div>

        {/* Кнопка управления (Бег) */}
        {!me?.isEliminated && !me?.hasFinished && (
            <div className="pointer-events-auto pb-12">
                <button 
                    onPointerDown={() => serverInstance.playerMove(playerId, 0, 1)}
                    className="w-32 h-32 bg-white/10 backdrop-blur-2xl border-4 border-white/20 rounded-full flex items-center justify-center active:scale-75 transition-all shadow-2xl group"
                >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center group-active:bg-emerald-400 transition-colors">
                        <Play className="w-10 h-10 text-black fill-current ml-1" />
                    </div>
                </button>
            </div>
        )}

        {/* Сообщения о смерти/финише */}
        {me?.isEliminated && (
            <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                <Skull className="w-24 h-24 text-white mb-4 animate-bounce" />
                <h2 className="text-6xl font-black text-white italic tracking-tighter">{t.eliminated}</h2>
            </div>
        )}
      </div>
    );
  }

  // --- 4. ФИНАЛ ---
  if (state.state === GameState.FINISHED) {
      const iWon = state.winners.includes(playerId);
      return (
        <div className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            {iWon ? <Trophy className="w-32 h-32 text-yellow-500 mb-6 animate-tada" /> : <Skull className="w-32 h-32 text-gray-700 mb-6" />}
            <h2 className="text-6xl font-black text-white mb-2 italic tracking-tighter">{iWon ? t.win : 'LOSE'}</h2>
            <p className="text-2xl font-mono text-yellow-500 mb-12">+{state.winAmount} {isTrainingMode ? 'Coins' : 'TON'}</p>
            
            <div className="w-full max-w-xs space-y-4">
                <button onClick={onReset} className="w-full py-5 bg-white text-black font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-transform">{t.menu}</button>
            </div>
        </div>
      );
  }

  return null;
};
