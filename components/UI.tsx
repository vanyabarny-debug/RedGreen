import React, { useState, useEffect, useCallback } from 'react';
import { 
    GameSchema, GameState, LightColor, GAME_DEFAULTS, Player, 
    UserProfile, Difficulty, MapLength, RoomSettings, Friend, Language, GameHistoryItem
} from '../types';
import { 
    Users, Trophy, Skull, Play, Smartphone, Maximize2, Minimize2, 
    Settings, User, Star, Plus, Loader2, Wallet, ArrowDownCircle, 
    ArrowUpCircle, X, Shield, Swords, Ruler, Clock, HeartHandshake, 
    LogOut, Send, RefreshCw, Gamepad2, Languages, TrendingUp, TrendingDown,
    History, Percent, Calendar, Edit3, RotateCcw, Gift, Lock
} from 'lucide-react';
import { serverInstance } from '../logic/GameServerEngine';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

const ADMIN_WALLET_ADDRESS = "0QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC"; 

// --- LOCALIZATION DICTIONARY ---
const TRANSLATIONS = {
    RU: {
        rooms: "КОМНАТЫ",
        friends: "ДРУЗЬЯ",
        create: "СОЗДАТЬ",
        createGame: "СОЗДАТЬ ИГРУ",
        profile: "Профиль",
        tonBal: "Баланс TON",
        coinsBal: "Баланс Coins",
        deposit: "Депозит 1 TON",
        save: "Сохранить",
        name: "Имя игрока",
        players: "Игроки",
        diff: "Сложность",
        len: "Длина",
        entry: "Взнос",
        training: "Тренировка",
        tonGame: "TON Игра",
        noRooms: "Нет активных комнат",
        inputWait: "Вход",
        join: "Играть",
        invite: "Позвать",
        sync: "Синхронизация контактов...",
        lobby: "ЛОББИ",
        exit: "Выйти",
        start: "НАЧАТЬ",
        waitHost: "Ожидание...",
        pot: "БАНК",
        alive: "ЖИВЫЕ",
        win: "ПОБЕДА!",
        eliminated: "ВЫБЫЛ",
        menu: "МЕНЮ",
        perPlayer: "на игрока",
        stats: "Статистика (30 игр)",
        history: "История игр",
        loss: "Минус",
        gain: "Плюс",
        connect: "Подключить",
        easy: "Легко",
        med: "Средне",
        hard: "Хард",
        short: "Короткая",
        avg: "Средняя",
        long: "Длинная",
        paid: "ОПЛАЧЕНО",
        run: "БЕГИ",
        stop: "СТОЙ",
        winRate: "Побед",
        netPnl: "Профит",
        emptyHistory: "Пусто",
        rotate: "ПОВЕРНИТЕ УСТРОЙСТВО",
        bonus: "Ежедневный Бонус",
        claim: "ЗАБРАТЬ",
        nextBonus: "Следующий бонус через",
        bonusClaimed: "Уже получено сегодня"
    },
    EN: {
        rooms: "ROOMS",
        friends: "FRIENDS",
        create: "CREATE",
        createGame: "CREATE GAME",
        profile: "Profile",
        tonBal: "TON Balance",
        coinsBal: "Coins Balance",
        deposit: "Deposit 1 TON",
        save: "Save",
        name: "Player Name",
        players: "Players",
        diff: "Difficulty",
        len: "Length",
        entry: "Entry Fee",
        training: "Training",
        tonGame: "TON Game",
        noRooms: "No active rooms",
        inputWait: "Entry",
        join: "Join",
        invite: "Invite",
        sync: "Syncing contacts...",
        lobby: "LOBBY",
        exit: "Exit",
        start: "START",
        waitHost: "Waiting...",
        pot: "POT",
        alive: "ALIVE",
        win: "VICTORY!",
        eliminated: "ELIMINATED",
        menu: "MENU",
        perPlayer: "per player",
        stats: "Stats (Last 30)",
        history: "Game History",
        loss: "Loss",
        gain: "Profit",
        connect: "Connect",
        easy: "Easy",
        med: "Medium",
        hard: "Hard",
        short: "Short",
        avg: "Medium",
        long: "Long",
        paid: "PAID",
        run: "RUN",
        stop: "STOP",
        winRate: "Win Rate",
        netPnl: "Net PnL",
        emptyHistory: "Empty",
        rotate: "ROTATE DEVICE",
        bonus: "Daily Bonus",
        claim: "CLAIM",
        nextBonus: "Next bonus in",
        bonusClaimed: "Already claimed today"
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

const LegoAvatar = ({ color, size = "w-9 h-9 md:w-12 md:h-12" }: { color: string, size?: string }) => (
  <div className={`${size} rounded-full overflow-hidden border-2 border-white/20 bg-gray-800 flex items-center justify-center relative shadow-lg shrink-0`}>
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
    <div className={`rounded-full bg-yellow-500 border-2 border-yellow-300 flex items-center justify-center font-bold text-black ${className}`}>
        C
    </div>
);

// --- STATS COMPONENT ---
const StatsCard = ({ history, currency, t }: { history: GameHistoryItem[], currency: 'TON' | 'COINS', t: any }) => {
    const relevantHistory = history.filter(h => h.currency === currency);
    const totalGames = relevantHistory.length;
    const wins = relevantHistory.filter(h => h.outcome === 'WIN').length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const netPnL = relevantHistory.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="bg-black/40 border border-white/5 rounded-xl p-3 md:p-4 w-full">
            <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mb-2 border-b border-white/5 pb-1 flex items-center justify-between">
                <span>{t?.stats || 'Stats'}</span>
                <span className="text-[9px] md:text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{currency}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex flex-col items-center p-1.5 bg-white/5 rounded-lg">
                     <span className="text-[9px] md:text-[10px] text-gray-400 mb-0.5">{t?.winRate || 'Win Rate'}</span>
                     <div className="flex items-center gap-1 text-white font-mono font-bold text-sm md:text-base">
                        <Percent className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
                        {winRate}%
                     </div>
                </div>
                <div className="flex flex-col items-center p-1.5 bg-white/5 rounded-lg">
                     <span className="text-[9px] md:text-[10px] text-gray-400 mb-0.5">{t?.netPnl || 'Net PnL'}</span>
                     <div className={`flex items-center gap-1 font-mono font-bold text-sm md:text-base ${netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {netPnL >= 0 ? <TrendingUp className="w-3 h-3 md:w-4 md:h-4"/> : <TrendingDown className="w-3 h-3 md:w-4 md:h-4"/>}
                        {netPnL > 0 ? '+' : ''}{netPnL.toFixed(currency === 'TON' ? 2 : 0)}
                     </div>
                </div>
            </div>
            
            <div className="space-y-1">
                <p className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold mb-1">{t?.history || 'History'}</p>
                {relevantHistory.length === 0 ? (
                    <p className="text-center text-[10px] md:text-xs text-gray-600 italic py-1">{t?.emptyHistory || 'Empty'}</p>
                ) : (
                    <div className="max-h-24 md:max-h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                        {relevantHistory.slice().reverse().map((item, idx) => {
                             const date = new Date(item.timestamp);
                             const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                             return (
                                 <div key={idx} className="flex items-center justify-between bg-white/5 p-1.5 rounded-lg text-[10px] md:text-xs">
                                     <div className="flex items-center gap-1.5">
                                         {item.outcome === 'WIN' ? <Trophy className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-yellow-400"/> : <Skull className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-gray-500"/>}
                                         <span className="text-gray-400 font-mono">{timeStr}</span>
                                     </div>
                                     <div className={`font-mono font-bold ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                         {item.amount > 0 ? '+' : ''}{item.amount.toFixed(currency === 'TON' ? 2 : 0)}
                                     </div>
                                 </div>
                             );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export const UI: React.FC<UIProps> = ({ state, playerId, userProfile, isTrainingMode, onToggleMode, onStart, onReset, playCashSound, onUpdateProfile }) => {
  const players = Object.values(state.players) as Player[];
  const activePlayers = players.filter(p => !p.isEliminated && !p.hasFinished);
  const finishedPlayers = players.filter(p => p.hasFinished);
  const totalAlive = activePlayers.length + finishedPlayers.length;
  
  const lang = userProfile.language;
  const t = TRANSLATIONS[lang] || TRANSLATIONS['EN'];

  const [isProcessing, setIsProcessing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [editName, setEditName] = useState(userProfile.username);
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'FRIENDS'>('ROOMS');
  const [friends, setFriends] = useState<Friend[]>([]);

  // Bonus Logic
  const [showBonus, setShowBonus] = useState(false);
  const [bonusAvailable, setBonusAvailable] = useState(false);
  const [bonusTimeLeft, setBonusTimeLeft] = useState<string>('');

  // Room Creation State
  const [newRoomName, setNewRoomName] = useState(`Game ${userProfile.username.slice(0, 8)}`);
  const [newRoomDifficulty, setNewRoomDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [newRoomLength, setNewRoomLength] = useState<MapLength>(MapLength.MEDIUM);
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(30);

  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // Check Bonus Timer
  useEffect(() => {
    const checkBonus = () => {
        const lastClaim = userProfile.lastDailyBonusClaim || 0;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const diff = now - lastClaim;
        
        if (diff > oneDay) {
            setBonusAvailable(true);
            setBonusTimeLeft('');
        } else {
            setBonusAvailable(false);
            const remaining = oneDay - diff;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            setBonusTimeLeft(`${hours}h ${minutes}m`);
        }
    };
    
    checkBonus();
    const interval = setInterval(checkBonus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [userProfile.lastDailyBonusClaim]);

  useEffect(() => {
    const mockTelegramFriends: Friend[] = [
        { id: 'f1', username: 'Pavel Durov', avatarColor: '#3b82f6', status: 'ONLINE' },
        { id: 'f2', username: 'Elon Musk', avatarColor: '#ef4444', status: 'IN_GAME', currentRoomId: 'room_mock_1' },
    ];
    setFriends(mockTelegramFriends);
  }, []);

  useEffect(() => {
      if (wallet && wallet.account.address !== userProfile.walletAddress) {
          onUpdateProfile({ walletAddress: wallet.account.address });
      } else if (!wallet && userProfile.walletAddress) {
          onUpdateProfile({ walletAddress: undefined });
      }
  }, [wallet]);

  const claimBonus = () => {
      if (!bonusAvailable) return;
      playCashSound();
      onUpdateProfile({
          coins: userProfile.coins + GAME_DEFAULTS.DAILY_BONUS,
          lastDailyBonusClaim: Date.now()
      });
      // Do not hide modal immediately, let user see it changed state
  };

  const toggleLanguage = () => onUpdateProfile({ language: lang === 'RU' ? 'EN' : 'RU' });

  const handleCreateRoom = () => {
      const entryFee = isTrainingMode ? GAME_DEFAULTS.ENTRY_FEE_COINS : GAME_DEFAULTS.ENTRY_FEE_TON;
      const currentBalance = isTrainingMode ? userProfile.coins : userProfile.tonBalance;

      if (currentBalance < entryFee) {
          alert(`Insufficient ${isTrainingMode ? 'Coins' : 'TON'}!`);
          setShowProfile(true);
          return;
      }

      const hostPlayer: Player = {
          id: playerId,
          name: userProfile.username,
          x: (Math.random() - 0.5) * 40, 
          z: -2,
          color: userProfile.avatarColor,
          isEliminated: false,
          hasFinished: false,
          isBot: false,
          isHost: true
      };
      
      if (isTrainingMode) {
          onUpdateProfile({ coins: userProfile.coins - entryFee });
      } else {
          onUpdateProfile({ tonBalance: userProfile.tonBalance - entryFee });
      }
      
      const settings: RoomSettings = {
          difficulty: newRoomDifficulty,
          length: newRoomLength,
          maxPlayers: newRoomMaxPlayers,
          isTraining: isTrainingMode
      };

      serverInstance.createRoom(newRoomName, settings, hostPlayer);
      setShowCreateRoom(false);
  };

  const handleJoinRoom = (roomId: string) => {
      const entryFee = isTrainingMode ? GAME_DEFAULTS.ENTRY_FEE_COINS : GAME_DEFAULTS.ENTRY_FEE_TON;
      const currentBalance = isTrainingMode ? userProfile.coins : userProfile.tonBalance;

      if (currentBalance < entryFee) {
          alert(`Insufficient ${isTrainingMode ? 'Coins' : 'TON'}!`);
          setShowProfile(true);
          return;
      }

      const player: Player = {
          id: playerId,
          name: userProfile.username,
          x: (Math.random() - 0.5) * 40,
          z: -2,
          color: userProfile.avatarColor,
          isEliminated: false,
          hasFinished: false,
          isBot: false
      };

      if (isTrainingMode) {
          onUpdateProfile({ coins: userProfile.coins - entryFee });
      } else {
          onUpdateProfile({ tonBalance: userProfile.tonBalance - entryFee });
      }

      playCashSound();
      serverInstance.joinRoom(roomId, player);
  };

  const handleLeaveRoom = () => serverInstance.leaveRoom();

  const handleDeposit = async () => {
      if (!wallet) {
          alert("Connect wallet first!");
          return;
      }
      setIsProcessing(true);
      const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 60, 
          messages: [{ address: ADMIN_WALLET_ADDRESS, amount: "1000000000" }]
      };
      try {
          await tonConnectUI.sendTransaction(transaction);
          playCashSound();
          onUpdateProfile({ tonBalance: userProfile.tonBalance + 1.0 });
          alert("Deposit success! +1.0 TON.");
      } catch (e) {
          console.error(e);
          alert("Transaction error.");
      } finally {
          setIsProcessing(false);
      }
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setIsFullscreen(true);
      } else {
          if (document.exitFullscreen) {
              document.exitFullscreen();
              setIsFullscreen(false);
          }
      }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setEditName(val);
      onUpdateProfile({ username: val });
  };

  const changeAvatarColor = () => {
      const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#ec4899'];
      const random = colors[Math.floor(Math.random() * colors.length)];
      onUpdateProfile({ avatarColor: random });
  }

  const potentialWin = totalAlive > 0 ? (state.pot / totalAlive) : 0;

  // --- MENU ---
  if (state.state === GameState.MENU) {
      return (
        <div className="absolute inset-0 z-50 overflow-hidden bg-[#0f172a]/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
             
             {/* LANGUAGE TOGGLE */}
             <div className="absolute top-4 right-4 z-[60]">
                  <button onClick={toggleLanguage} className="bg-slate-800/80 backdrop-blur border border-white/10 p-2 md:p-3 rounded-full shadow-lg active:scale-95 transition-transform">
                      <span className="text-xl md:text-2xl leading-none">{lang === 'RU' ? '🇷🇺' : '🇺🇸'}</span>
                  </button>
             </div>

             {/* DAILY BONUS BUTTON - ALWAYS VISIBLE */}
             <div className="absolute top-4 left-4 z-[60]">
                <button 
                    onClick={() => setShowBonus(true)} 
                    className={`
                        p-2 md:p-3 rounded-full shadow-lg border-2 transition-all duration-300
                        ${bonusAvailable 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 border-white/30 animate-bounce' 
                            : 'bg-slate-700 border-white/10 opacity-80 hover:opacity-100'}
                    `}
                >
                    <Gift className={`w-6 h-6 ${bonusAvailable ? 'text-white' : 'text-gray-400'}`} />
                </button>
             </div>

             {/* MODE TOGGLE SWITCH */}
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60]">
                <button 
                    onClick={onToggleMode}
                    className={`
                        relative flex items-center justify-between w-56 md:w-72 h-10 md:h-12 rounded-full p-1 shadow-2xl border-2 transition-all duration-300
                        ${isTrainingMode ? 'bg-slate-800 border-yellow-500/50' : 'bg-slate-900 border-[#0098EA]/50'}
                    `}
                >
                    <div className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-gradient-to-r transition-all duration-300 ${isTrainingMode ? 'left-1 from-yellow-500 to-yellow-600' : 'left-[50%] from-[#0098EA] to-blue-600'}`}></div>
                    
                    <div className={`z-10 w-1/2 text-center text-[10px] md:text-xs font-black uppercase tracking-wider ${isTrainingMode ? 'text-black' : 'text-gray-500'}`}>{t?.training}</div>
                    <div className={`z-10 w-1/2 text-center text-[10px] md:text-xs font-black uppercase tracking-wider ${!isTrainingMode ? 'text-white' : 'text-gray-500'}`}>{t?.tonGame}</div>
                </button>
             </div>

             {/* DAILY BONUS MODAL */}
             {showBonus && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in zoom-in-95 duration-200">
                     <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-yellow-500/50 text-center relative">
                         <button onClick={() => setShowBonus(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                         <h2 className="text-2xl font-black text-yellow-400 mb-4">{t?.bonus}</h2>
                         
                         {bonusAvailable ? (
                             <>
                                <Gift className="w-24 h-24 mx-auto text-yellow-500 mb-4 animate-pulse" />
                                <p className="text-white text-xl font-bold mb-6">+ {GAME_DEFAULTS.DAILY_BONUS} Coins</p>
                                <button onClick={claimBonus} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl uppercase">
                                    {t?.claim}
                                </button>
                             </>
                         ) : (
                             <>
                                <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                                    <Gift className="w-full h-full text-gray-600" />
                                    <Lock className="w-10 h-10 text-white absolute" />
                                </div>
                                <p className="text-gray-400 text-lg font-bold mb-2">{t?.bonusClaimed}</p>
                                <div className="bg-black/30 rounded-lg p-3 mb-6">
                                    <p className="text-xs text-gray-500 uppercase mb-1">{t?.nextBonus}</p>
                                    <p className="text-xl font-mono text-yellow-400">{bonusTimeLeft}</p>
                                </div>
                                <button onClick={() => setShowBonus(false)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl uppercase">
                                    OK
                                </button>
                             </>
                         )}
                     </div>
                 </div>
             )}

             {/* PROFILE MODAL */}
             {showProfile && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="bg-slate-800 p-6 md:p-8 rounded-2xl w-full max-w-sm md:max-w-md border border-white/10 flex flex-col max-h-[90vh]">
                          <div className="flex justify-between items-center mb-4">
                              <h2 className="text-white text-xl font-bold">{t?.profile}</h2>
                              <button onClick={() => setShowProfile(false)} className="text-white hover:text-red-400">✕</button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                              <div className="flex flex-col items-center">
                                  <div className="relative group cursor-pointer mb-3" onClick={changeAvatarColor}>
                                      <LegoAvatar color={userProfile.avatarColor} size="w-24 h-24 md:w-32 md:h-32" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                                          <RefreshCw className="w-8 h-8 text-white" />
                                      </div>
                                  </div>
                                  <input 
                                    className="w-full bg-transparent border-b border-white/20 text-center text-xl font-bold text-white focus:border-emerald-500 outline-none pb-1 placeholder-gray-600"
                                    value={editName}
                                    onChange={handleNameChange}
                                    placeholder={t?.name}
                                  />
                              </div>

                              <div className="w-full flex justify-center scale-90 md:scale-100"><TonConnectButton /></div>

                              <div className="bg-black/30 p-4 rounded-xl space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400 uppercase font-bold">{t?.tonBal}</span>
                                    <span className="text-xl font-mono text-white font-bold flex items-center gap-2"><TonIcon className="w-5 h-5" /> {userProfile.tonBalance.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400 uppercase font-bold">{t?.coinsBal}</span>
                                    <span className="text-xl font-mono text-yellow-400 font-bold flex items-center gap-2"><CoinIcon className="w-5 h-5 text-xs" /> {userProfile.coins}</span>
                                  </div>
                                  <button onClick={handleDeposit} disabled={isProcessing || !wallet} className="w-full bg-[#0098EA] hover:bg-[#0098EA]/80 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowDownCircle className="w-4 h-4" />} 
                                      {wallet ? t?.deposit : t?.connect}
                                  </button>
                              </div>
                              <StatsCard history={userProfile.gameHistory || []} currency={isTrainingMode ? 'COINS' : 'TON'} t={t} />
                          </div>
                      </div>
                 </div>
             )}

             {/* CREATE ROOM MODAL */}
             {showCreateRoom && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in zoom-in-95 duration-200">
                     <div className="bg-slate-800 p-6 rounded-3xl w-full max-w-sm border border-emerald-500/30 shadow-2xl flex flex-col max-h-[90vh]">
                         <div className="flex justify-between items-center mb-4">
                             <h2 className="text-lg font-black text-white flex items-center gap-2"><Plus className="text-emerald-500 w-5 h-5"/> {t?.createGame}</h2>
                             <button onClick={() => setShowCreateRoom(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                         </div>
                         <div className="space-y-4 overflow-y-auto pr-1">
                             <div>
                                 <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1">{t?.name}</label>
                                 <input className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 focus:border-emerald-500 outline-none text-sm" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
                             </div>
                             <div>
                                 <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1 flex justify-between">
                                     <span>{t?.players}</span>
                                     <span className="text-emerald-400">{newRoomMaxPlayers}</span>
                                 </label>
                                 <input type="range" min="2" max="100" value={newRoomMaxPlayers} onChange={e => setNewRoomMaxPlayers(parseInt(e.target.value))} className="w-full accent-emerald-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1">{t?.diff}</label>
                                     <select value={newRoomDifficulty} onChange={e => setNewRoomDifficulty(e.target.value as Difficulty)} className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 outline-none appearance-none text-sm">
                                         <option value={Difficulty.EASY}>{t?.easy}</option>
                                         <option value={Difficulty.MEDIUM}>{t?.med}</option>
                                         <option value={Difficulty.HARD}>{t?.hard}</option>
                                     </select>
                                 </div>
                                 <div>
                                     <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1">{t?.len}</label>
                                     <select value={newRoomLength} onChange={e => setNewRoomLength(parseInt(e.target.value) as MapLength)} className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 outline-none appearance-none text-sm">
                                         <option value={MapLength.SHORT}>{t?.short}</option>
                                         <option value={MapLength.MEDIUM}>{t?.avg}</option>
                                         <option value={MapLength.LONG}>{t?.long}</option>
                                     </select>
                                 </div>
                             </div>
                             <div className="pt-4 border-t border-white/10">
                                 <div className="flex justify-between text-xs mb-3">
                                     <span className="text-gray-400">{t?.entry}:</span>
                                     <span className={isTrainingMode ? "text-yellow-400 font-bold" : "text-[#0098EA] font-bold"}>
                                        {isTrainingMode ? `${GAME_DEFAULTS.ENTRY_FEE_COINS} Coins` : `${GAME_DEFAULTS.ENTRY_FEE_TON} TON`}
                                     </span>
                                 </div>
                                 <button onClick={handleCreateRoom} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-wider text-sm">
                                     {t?.create}
                                 </button>
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             {/* MAIN CARD - Using explicit Flex heights to prevent collapsing */}
             <div className="w-full max-w-sm md:max-w-md bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col h-[70vh] md:h-[75vh] mt-16 md:mt-20">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <div className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors" onClick={() => setShowProfile(true)}>
                        <div className="relative">
                            <LegoAvatar color={userProfile.avatarColor} size="w-10 h-10 md:w-12 md:h-12" />
                            {!wallet && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black"></div>}
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm md:text-base max-w-[120px] truncate">{userProfile.username}</p>
                            <div className="flex items-center gap-2 text-xs font-mono font-bold">
                                <span className="text-[#0098EA] flex items-center gap-1"><TonIcon className="w-3 h-3"/> {userProfile.tonBalance.toFixed(2)}</span>
                                <span className="text-yellow-400 flex items-center gap-1"><CoinIcon className="w-3 h-3 text-[8px]"/> {userProfile.coins}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={toggleFullscreen} className="bg-white/10 p-2.5 rounded-full hover:bg-white/20">
                        {isFullscreen ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-black/20 rounded-xl mb-3 shrink-0">
                    <button onClick={() => setActiveTab('ROOMS')} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'ROOMS' ? 'bg-white/10 text-white shadow' : 'text-gray-500'}`}>{t?.rooms}</button>
                    <button onClick={() => setActiveTab('FRIENDS')} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'FRIENDS' ? 'bg-white/10 text-white shadow' : 'text-gray-500'}`}>{t?.friends}</button>
                </div>

                {/* LIST CONTAINER - Explicitly handling overflow */}
                <div className="flex-1 overflow-y-auto mb-4 scrollbar-hide space-y-2 relative">
                    {activeTab === 'ROOMS' ? (
                        <>
                            {state.roomsList.filter(r => r.isTraining === isTrainingMode).length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-xl m-1">
                                    <p className="text-sm mb-1">{t?.noRooms}</p>
                                    <span className="text-xs opacity-70">
                                        {t?.inputWait}: {isTrainingMode ? `${GAME_DEFAULTS.ENTRY_FEE_COINS} Coins` : `${GAME_DEFAULTS.ENTRY_FEE_TON} TON`}
                                    </span>
                                </div>
                            ) : (
                                state.roomsList.filter(r => r.isTraining === isTrainingMode).map(room => (
                                    <button 
                                        key={room.id}
                                        onClick={() => handleJoinRoom(room.id)}
                                        className="w-full bg-black/20 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/50 p-3 md:p-4 rounded-xl flex items-center justify-between transition-all group shrink-0"
                                    >
                                        <div className="text-left">
                                            <p className="font-bold text-white text-sm md:text-base group-hover:text-emerald-400">{room.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded border border-white/10 text-gray-400">{room.difficulty}</span>
                                                {room.status === 'PLAYING' && <span className="text-[10px] text-red-500 font-bold animate-pulse">LIVE</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-1.5 bg-black/30 px-2 py-0.5 rounded-full">
                                                <Users className="w-3 h-3 text-emerald-500" />
                                                <span className="text-xs font-mono text-white">{room.playersCount}/{room.maxPlayers}</span>
                                            </div>
                                            <span className={`text-xs font-mono font-bold ${isTrainingMode ? 'text-yellow-400' : 'text-[#0098EA]'}`}>
                                                {isTrainingMode ? `${GAME_DEFAULTS.ENTRY_FEE_COINS} C` : `${GAME_DEFAULTS.ENTRY_FEE_TON} TON`}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </>
                    ) : (
                        <div className="space-y-2">
                             {friends.map(friend => (
                                 <div key={friend.id} className="w-full bg-black/20 border border-white/5 p-3 rounded-xl flex items-center justify-between shrink-0">
                                     <div className="flex items-center gap-3">
                                         <div className="relative">
                                             <LegoAvatar color={friend.avatarColor} size="w-9 h-9" />
                                             <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${friend.status === 'ONLINE' ? 'bg-green-500' : friend.status === 'IN_GAME' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                                         </div>
                                         <div>
                                             <p className="font-bold text-white text-sm">{friend.username}</p>
                                             <p className="text-xs text-gray-400">{friend.status}</p>
                                         </div>
                                     </div>
                                     {friend.status === 'IN_GAME' && (
                                         <button className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                                             <Swords className="w-3 h-3"/> {t?.join}
                                         </button>
                                     )}
                                 </div>
                             ))}
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full bg-[#0098EA] hover:bg-[#0098EA]/80 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform text-sm md:text-base shrink-0"
                >
                    <Plus className="w-5 h-5" /> {t?.create}
                </button>
             </div>
        </div>
      );
  }

  // --- LOBBY ---
  if (state.state === GameState.LOBBY) {
      const isHost = state.players[playerId]?.isHost;
      const currentRoom = state.roomsList.find(r => r.id === state.roomId);
      
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-md z-50 p-4">
            <div className="w-full max-w-sm md:max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col h-[65vh]">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <Users className="text-emerald-400 w-6 h-6" /> 
                            <span className="truncate max-w-[150px] md:max-w-[200px]">{currentRoom?.name || t?.lobby}</span>
                        </h2>
                        {currentRoom && <span className="text-[10px] text-gray-500 ml-8 uppercase font-bold">{t?.lobby}</span>}
                    </div>
                    <button onClick={handleLeaveRoom} className="text-xs text-red-400 font-bold hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <LogOut className="w-4 h-4"/> {t?.exit}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-hide">
                    {players.map((p) => (
                        <div key={p.id} className={`flex items-center gap-4 p-3 rounded-xl border ${p.id === playerId ? 'bg-yellow-500/20 border-yellow-400' : 'bg-black/20 border-white/5'}`}>
                            <LegoAvatar color={p.color} size="w-10 h-10" />
                            <div className="flex-1">
                                <p className="font-bold text-sm text-white">{p.name} {p.id === playerId && '(You)'}</p>
                                {p.isHost && <span className="text-[10px] bg-purple-500 px-1.5 py-0.5 rounded text-white ml-2">HOST</span>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 text-center">
                     <div className="mb-4 text-sm font-mono text-gray-400">
                        {t?.pot}: {(state.pot).toFixed(2)} {isTrainingMode ? 'Coins' : 'TON'}
                     </div>

                     {isHost ? (
                         <button onClick={onStart} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl uppercase tracking-widest text-sm animate-pulse">
                            {t?.start}
                         </button>
                     ) : (
                         <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                            <Loader2 className="w-5 h-5 animate-spin" /> {t?.waitHost}
                         </div>
                     )}
                </div>
            </div>
        </div>
      );
  }

  // --- FINISHED ---
  if (state.state === GameState.FINISHED) {
    const iWon = state.winners.includes(playerId);
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-md z-50 p-6 animate-in fade-in duration-500">
        <div className={`p-8 md:p-10 rounded-3xl border max-w-sm w-full text-center shadow-2xl relative overflow-hidden ${iWon ? 'border-yellow-500' : 'border-red-500'}`}>
          {iWon ? (
            <>
              <Trophy className="w-20 h-20 mx-auto text-yellow-400 mb-6 animate-bounce" />
              <h2 className="text-4xl font-black text-white mb-2">{t?.win}</h2>
            </>
          ) : (
            <>
              <Skull className="w-20 h-20 mx-auto text-red-500 mb-6" />
              <h2 className="text-4xl font-black text-white mb-6">{t?.eliminated}</h2>
            </>
          )}
          
          <div className="mb-8">
              <StatsCard history={userProfile.gameHistory || []} currency={isTrainingMode ? 'COINS' : 'TON'} t={t} />
          </div>

          <button onClick={handleLeaveRoom} className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase hover:bg-gray-200 text-lg">
            {t?.menu}
          </button>
        </div>
      </div>
    );
  }

  // --- HUD ---
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
       {/* ORIENTATION WARNING - Subtle */}
       {state.state === GameState.PLAYING && (
           <div className="portrait:flex hidden absolute top-32 left-1/2 -translate-x-1/2 z-20 items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 pointer-events-none animate-pulse">
               <RotateCcw className="w-3 h-3 text-yellow-400" />
               <span className="text-[10px] font-bold text-white uppercase tracking-widest">{t?.rotate}</span>
           </div>
       )}

       {/* Top Right Controls */}
       <div className="absolute top-4 right-4 pointer-events-auto flex flex-col gap-2">
            <button onClick={toggleFullscreen} className="bg-black/30 p-3 rounded-full backdrop-blur border border-white/10 active:scale-95 transition-transform">
                {isFullscreen ? <Minimize2 className="text-white w-5 h-5" /> : <Maximize2 className="text-white w-5 h-5" />}
            </button>
       </div>

       {/* HUD BAR */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex flex-row justify-between items-start pointer-events-none">
        
        {/* LEFT: POT */}
        <div className="flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-lg flex flex-col min-w-[120px]">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">{t?.pot}</span>
                <div className="flex items-center gap-1.5">
                    {isTrainingMode ? <CoinIcon className="w-5 h-5 text-[10px]" /> : <TonIcon className="w-5 h-5" />}
                    <span className="text-2xl font-mono text-white font-bold tracking-tight">{state.pot.toFixed(1)}</span>
                </div>
                <div className="mt-2 border-t border-white/10 pt-1 flex items-center gap-1">
                    <span className="text-[9px] text-gray-500 uppercase">{t?.perPlayer}:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">+{potentialWin.toFixed(0)}</span>
                </div>
            </div>
        </div>

        {/* CENTER: LIGHT + TIMER */}
        <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center">
            {/* TRAFFIC LIGHT BADGE */}
            <div className={`px-8 py-2 md:px-12 md:py-3 rounded-full border border-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center overflow-hidden z-10 transition-colors duration-200 ${state.light === LightColor.GREEN ? 'bg-emerald-900/80' : 'bg-red-900/80'}`}>
                <div className={`absolute top-0 left-0 w-full h-1 ${state.light === LightColor.GREEN ? 'bg-emerald-500' : 'bg-red-500'} `} />
                <h2 className={`text-3xl md:text-5xl font-black uppercase tracking-[0.2em] ${state.light === LightColor.GREEN ? 'text-emerald-400' : 'text-red-500 animate-pulse'}`}>
                    {state.light === LightColor.GREEN ? t?.run : t?.stop}
                </h2>
            </div>
            
            {/* TIMER */}
            <div className={`mt-2 font-mono text-4xl md:text-6xl font-black drop-shadow-lg tracking-tighter ${state.timeRemaining < 3000 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {(state.timeRemaining / 1000).toFixed(1)}
            </div>
        </div>

        {/* RIGHT: ALIVE COUNT */}
        <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-right shadow-lg mr-12 md:mr-0">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{t?.alive}</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">{totalAlive} <span className="text-sm text-gray-500">/ {players.length}</span></div>
        </div>
      </div>
      
      {/* RED LIGHT OVERLAY */}
      {state.light === LightColor.RED && !state.players[playerId]?.isEliminated && (
          <div className="absolute inset-0 bg-red-900/10 z-0 pointer-events-none animate-pulse" />
      )}
    </div>
  );
};