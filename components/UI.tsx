import React, { useState, useEffect, useCallback } from 'react';
import { 
    GameSchema, GameState, LightColor, GAME_DEFAULTS, Player, 
    UserProfile, Difficulty, MapLength, RoomSettings, Friend 
} from '../types';
import { 
    Users, Trophy, Skull, Play, Smartphone, Maximize2, Minimize2, 
    Settings, User, Star, Plus, Loader2, Wallet, ArrowDownCircle, 
    ArrowUpCircle, X, Shield, Swords, Ruler, Clock, HeartHandshake, 
    LogOut, Send 
} from 'lucide-react';
import { serverInstance } from '../logic/GameServerEngine';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// Адрес вашего горячего кошелька для приема платежей
const ADMIN_WALLET_ADDRESS = "0QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC"; 

// MOCK FRIENDS DATA
const MOCK_FRIENDS: Friend[] = [
    { id: 'f1', username: 'AlexCrypto', avatarColor: '#3b82f6', status: 'ONLINE' },
    { id: 'f2', username: 'TonMaster', avatarColor: '#ef4444', status: 'IN_GAME', currentRoomId: 'room_mock_1' },
    { id: 'f3', username: 'LegoBuilder', avatarColor: '#eab308', status: 'OFFLINE' },
];

interface UIProps {
  state: GameSchema;
  playerId: string;
  userProfile: UserProfile;
  onStart: () => void;
  onReset: () => void;
  playCashSound: () => void;
  onUpdateProfile: (p: Partial<UserProfile>) => void;
}

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

export const UI: React.FC<UIProps> = ({ state, playerId, userProfile, onStart, onReset, playCashSound, onUpdateProfile }) => {
  const players = Object.values(state.players) as Player[];
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [editName, setEditName] = useState(userProfile.username);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'ROOMS' | 'FRIENDS'>('ROOMS');

  // Создание комнаты - стейт
  const [newRoomName, setNewRoomName] = useState(`Игра ${userProfile.username}`);
  const [newRoomDifficulty, setNewRoomDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [newRoomLength, setNewRoomLength] = useState<MapLength>(MapLength.MEDIUM);
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(30);

  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // СИНХРОНИЗАЦИЯ С БАЗОЙ ДАННЫХ SUPABASE
  const syncWithDatabase = useCallback(async (address: string) => {
    try {
        // Предполагаем, что tgId берется из Telegram WebApp
        const tgId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 123456;
        const response = await fetch(`/api/get-user?tgId=${tgId}&wallet=${address}`);
        const data = await response.json();
        
        if (data.internal_balance !== undefined) {
            onUpdateProfile({ 
                balance: data.internal_balance,
                walletAddress: address
            });
        }
    } catch (e) {
        console.error("Ошибка синхронизации с БД:", e);
    }
  }, [onUpdateProfile]);

  useEffect(() => {
      if (wallet?.account?.address) {
          syncWithDatabase(wallet.account.address);
      }
  }, [wallet, syncWithDatabase]);

  const handleCreateRoom = () => {
      if (userProfile.balance < GAME_DEFAULTS.ENTRY_FEE) {
          alert("Недостаточно TON на игровом балансе! Сделайте депозит.");
          setShowProfile(true);
          return;
      }

      const hostPlayer: Player = {
          id: playerId,
          name: userProfile.username,
          x: 0,
          z: -2,
          color: userProfile.avatarColor,
          isEliminated: false,
          hasFinished: false,
          isBot: false,
          isHost: true
      };
      
      onUpdateProfile({ balance: userProfile.balance - GAME_DEFAULTS.ENTRY_FEE });
      
      const settings: RoomSettings = {
          difficulty: newRoomDifficulty,
          length: newRoomLength,
          maxPlayers: newRoomMaxPlayers
      };

      serverInstance.createRoom(newRoomName, settings, hostPlayer);
      setShowCreateRoom(false);
  };

  const handleJoinRoom = (roomId: string) => {
      if (userProfile.balance < GAME_DEFAULTS.ENTRY_FEE) {
          alert("Недостаточно TON на игровом балансе! Сделайте депозит.");
          setShowProfile(true);
          return;
      }

      const player: Player = {
          id: playerId,
          name: userProfile.username,
          x: (Math.random() - 0.5) * 10,
          z: -2,
          color: userProfile.avatarColor,
          isEliminated: false,
          hasFinished: false,
          isBot: false
      };

      onUpdateProfile({ balance: userProfile.balance - GAME_DEFAULTS.ENTRY_FEE });
      playCashSound();
      serverInstance.joinRoom(roomId, player);
  };

  const handleLeaveRoom = () => {
      serverInstance.leaveRoom();
  };

  const handleDeposit = async () => {
      if (!wallet) {
          tonConnectUI.connectWallet();
          return;
      }

      setIsProcessing(true);
      const amountInNanotons = "1000000000"; // 1 TON

      const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 360, 
          messages: [
              {
                  address: ADMIN_WALLET_ADDRESS,
                  amount: amountInNanotons, 
              }
          ]
      };

      try {
          const result = await tonConnectUI.sendTransaction(transaction);
          
          // Отправляем hash на бэкенд для проверки и начисления
          const verifyRes = await fetch('/api/deposit', {
              method: 'POST',
              body: JSON.stringify({ 
                  hash: result.boc, // В реальном TON Connect здесь будет boc
                  tgId: (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 123456 
              })
          });

          if (verifyRes.ok) {
              playCashSound();
              // Обновляем локально, пока база обновляется
              onUpdateProfile({ balance: userProfile.balance + 1.0 });
              alert("Депозит успешен! +1.0 TON на игровой счет.");
          }
      } catch (e) {
          console.error(e);
          alert("Ошибка транзакции.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleWithdraw = async () => {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
          alert("Введите сумму");
          return;
      }
      if (amount > userProfile.balance) {
          alert("Недостаточно средств");
          return;
      }

      setIsProcessing(true);
      try {
          const tgId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 123456;
          const res = await fetch('/api/withdraw', {
              method: 'POST',
              body: JSON.stringify({ tgId, amount, address: wallet?.account.address })
          });

          if (res.ok) {
              onUpdateProfile({ balance: userProfile.balance - amount });
              playCashSound();
              alert(`Запрос на вывод ${amount} TON отправлен!`);
              setWithdrawAmount('');
          } else {
              alert("Ошибка при выводе. Попробуйте позже.");
          }
      } catch (e) {
          alert("Ошибка сети.");
      } finally {
          setIsProcessing(false);
      }
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setIsFullscreen(true);
      } else {
          document.exitFullscreen();
          setIsFullscreen(false);
      }
  };

  const saveProfile = () => {
      onUpdateProfile({ username: editName });
      setShowProfile(false);
  };

  const changeAvatarColor = () => {
      const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#ec4899'];
      const random = colors[Math.floor(Math.random() * colors.length)];
      onUpdateProfile({ avatarColor: random });
  }

  // --- МЕНЮ КОМНАТ ---
  if (state.state === GameState.MENU) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a]/90 backdrop-blur-md z-50 p-4">
             {showProfile && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm relative border border-white/10">
                          <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 text-white hover:text-red-400 transition-colors">✕</button>
                          
                          <div className="flex flex-col items-center mb-6">
                              <h2 className="text-white text-xl font-bold mb-4">Профиль</h2>
                              <div className="relative group cursor-pointer mb-4" onClick={changeAvatarColor}>
                                  <LegoAvatar color={userProfile.avatarColor} size="w-24 h-24" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                                      <Settings className="w-8 h-8 text-white" />
                                  </div>
                              </div>
                              <div className="w-full flex justify-center mb-2">
                                  <TonConnectButton />
                              </div>
                          </div>

                          <div className="bg-black/30 p-4 rounded-xl mb-6">
                              <p className="text-xs text-gray-400 uppercase font-bold mb-1">Игровой Баланс</p>
                              <div className="flex items-center gap-2 mb-4">
                                  <TonIcon className="w-6 h-6" />
                                  <span className="text-3xl font-mono text-white font-bold">{userProfile.balance.toFixed(2)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <button onClick={handleDeposit} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-bold flex flex-col items-center gap-1">
                                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowDownCircle className="w-4 h-4" />} 
                                      {wallet ? "Депозит 1 TON" : "Подключить"}
                                  </button>
                                  <div className="flex flex-col gap-2">
                                      <input type="number" placeholder="0.0" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-xs w-full" />
                                      <button onClick={handleWithdraw} disabled={isProcessing || !wallet} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                                          <ArrowUpCircle className="w-3 h-3" /> Вывод
                                      </button>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="border-t border-white/10 pt-4">
                              <label className="text-xs text-gray-500 mb-1 block">Никнейм</label>
                              <input className="w-full bg-black/30 text-white p-3 rounded-xl border border-white/5 mb-4 focus:border-emerald-500 outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
                              <button onClick={saveProfile} className="w-full bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl font-bold">Сохранить</button>
                          </div>
                      </div>
                 </div>
             )}

             {showCreateRoom && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in zoom-in-95 duration-200">
                     <div className="bg-slate-800 p-6 rounded-3xl w-full max-w-sm relative border border-emerald-500/30 shadow-2xl">
                         <button onClick={() => setShowCreateRoom(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                         <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Plus className="text-emerald-500"/> СОЗДАТЬ КОМНАТУ</h2>

                         <div className="space-y-4">
                             <div>
                                 <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1">Название</label>
                                 <input className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 focus:border-emerald-500 outline-none" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
                             </div>

                             <div>
                                 <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1 flex justify-between">
                                     <span>Игроки</span>
                                     <span className="text-emerald-400">{newRoomMaxPlayers}</span>
                                 </label>
                                 <input type="range" min="2" max="100" value={newRoomMaxPlayers} onChange={e => setNewRoomMaxPlayers(parseInt(e.target.value))} className="w-full accent-emerald-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1">Сложность</label>
                                     <select value={newRoomDifficulty} onChange={e => setNewRoomDifficulty(e.target.value as Difficulty)} className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 outline-none appearance-none">
                                         <option value={Difficulty.EASY}>Легко</option>
                                         <option value={Difficulty.MEDIUM}>Средне</option>
                                         <option value={Difficulty.HARD}>Хардкор</option>
                                     </select>
                                 </div>
                                 <div>
                                     <label className="text-xs text-gray-400 uppercase font-bold mb-1 ml-1">Длина</label>
                                     <select value={newRoomLength} onChange={e => setNewRoomLength(parseInt(e.target.value) as MapLength)} className="w-full bg-black/40 text-white p-3 rounded-xl border border-white/10 outline-none appearance-none">
                                         <option value={MapLength.SHORT}>Короткая</option>
                                         <option value={MapLength.MEDIUM}>Средняя</option>
                                         <option value={MapLength.LONG}>Марафон</option>
                                     </select>
                                 </div>
                             </div>

                             <div className="pt-4 border-t border-white/10 mt-4">
                                 <div className="flex justify-between text-sm mb-4">
                                     <span className="text-gray-400">Взнос за игру:</span>
                                     <span className="text-[#0098EA] font-bold">{GAME_DEFAULTS.ENTRY_FEE} TON</span>
                                 </div>
                                 <button onClick={handleCreateRoom} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform uppercase">
                                     Создать и Оплатить
                                 </button>
                             </div>
                         </div>
                     </div>
                 </div>
             )}

             <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors" onClick={() => setShowProfile(true)}>
                            <div className="relative">
                                <LegoAvatar color={userProfile.avatarColor} size="w-10 h-10" />
                                {!wallet && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black animate-pulse"></div>}
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">{userProfile.username}</p>
                                <div className="flex items-center gap-1 text-[#0098EA] text-xs font-mono font-bold">
                                    <TonIcon className="w-3 h-3" /> {userProfile.balance.toFixed(2)} TON
                                </div>
                            </div>
                        </div>
                        <button onClick={toggleFullscreen} className="bg-white/10 p-2 rounded-full h-9 w-9 flex items-center justify-center">
                            {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                        </button>
                    </div>

                    <div className="flex p-1 bg-black/20 rounded-xl mb-2">
                        <button onClick={() => setActiveTab('ROOMS')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${activeTab === 'ROOMS' ? 'bg-white/10 text-white shadow' : 'text-gray-500'}`}>КОМНАТЫ</button>
                        <button onClick={() => setActiveTab('FRIENDS')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${activeTab === 'FRIENDS' ? 'bg-white/10 text-white shadow' : 'text-gray-500'}`}>ДРУЗЬЯ</button>
                    </div>
                </div>

                {/* Rooms List */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                    {activeTab === 'ROOMS' ? (
                        <>
                            {state.roomsList.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 border-2 border-dashed border-white/5 rounded-xl mt-4">
                                    Нет активных игр<br/>
                                    <span className="text-xs">Вход: {GAME_DEFAULTS.ENTRY_FEE} TON</span>
                                </div>
                            ) : (
                                state.roomsList.map(room => (
                                    <button key={room.id} onClick={() => handleJoinRoom(room.id)} className="w-full bg-black/20 hover:bg-emerald-500/10 border border-white/10 p-4 rounded-xl flex items-center justify-between transition-all group">
                                        <div className="text-left">
                                            <p className="font-bold text-white group-hover:text-emerald-400">{room.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-gray-400">{room.difficulty}</span>
                                                {room.status === 'PLAYING' && <span className="text-[10px] text-red-500 font-bold animate-pulse">LIVE</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                                                <Users className="w-3 h-3 text-emerald-500" />
                                                <span className="text-xs font-mono text-white">{room.playersCount}/{room.maxPlayers}</span>
                                            </div>
                                            <span className="text-[10px] text-[#0098EA] font-bold">{GAME_DEFAULTS.ENTRY_FEE} TON</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </>
                    ) : (
                        <div className="space-y-3 mt-2">
                             {MOCK_FRIENDS.map(friend => (
                                 <div key={friend.id} className="bg-black/20 p-3 rounded-xl flex items-center justify-between border border-white/5">
                                     <div className="flex items-center gap-3">
                                         <LegoAvatar color={friend.avatarColor} size="w-10 h-10" />
                                         <div>
                                             <p className="font-bold text-white text-sm">{friend.username}</p>
                                             <p className="text-[10px] text-gray-500">{friend.status}</p>
                                         </div>
                                     </div>
                                     <button className="bg-white/5 text-gray-400 p-2 rounded-lg"><Send className="w-4 h-4"/></button>
                                 </div>
                             ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gradient-to-t from-slate-900 to-transparent">
                    <button onClick={() => setShowCreateRoom(true)} className="w-full bg-[#0098EA] hover:bg-[#0098EA]/80 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Plus className="w-5 h-5" /> СОЗДАТЬ ИГРУ
                    </button>
                </div>
             </div>
        </div>
      );
  }

  // --- ЛОББИ ОЖИДАНИЯ ---
  if (state.state === GameState.LOBBY) {
      const isHost = state.players[playerId]?.isHost;
      const roomConfig = state.config;

      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/90 backdrop-blur-md z-50 p-4">
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[70vh]">
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2"><Users className="text-emerald-400" /> ЛОББИ</h2>
                        <div className="flex gap-2 mt-1">
                             <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">{roomConfig?.difficulty}</span>
                             <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">{roomConfig?.fieldLength}m</span>
                        </div>
                    </div>
                    <button onClick={handleLeaveRoom} className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg font-bold border border-red-500/20">ВЫЙТИ</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {players.map((p) => (
                        <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${p.id === playerId ? 'bg-yellow-500/20 border-yellow-400' : 'bg-black/20 border-white/5'}`}>
                            <LegoAvatar color={p.color} size="w-8 h-8" />
                            <div className="flex-1">
                                <p className="font-bold text-sm text-white">{p.name} {p.id === playerId && '(Вы)'}</p>
                                {p.isHost && <span className="text-[8px] bg-purple-500 text-white px-1 rounded">HOST</span>}
                            </div>
                            <span className="text-[10px] text-emerald-500 font-mono font-bold">ОПЛАЧЕНО</span>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 text-center">
                     <div className="mb-4 text-xs text-gray-400 font-mono">
                        ПРИЗОВОЙ ФОНД: {(state.pot).toFixed(2)} TON
                     </div>

                     {isHost ? (
                         <button onClick={onStart} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-sm animate-pulse">
                            Начать Игру ({players.length})
                         </button>
                     ) : (
                         <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Ожидание хоста...
                         </div>
                     )}
                </div>
            </div>
        </div>
      );
  }

  // --- ФИНАЛ ---
  if (state.state === GameState.FINISHED) {
    const iWon = state.winners.includes(playerId);
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-50 p-4">
        <div className={`p-8 rounded-3xl border max-w-sm w-full text-center shadow-2xl ${iWon ? 'border-yellow-500' : 'border-red-500'}`}>
          {iWon ? (
            <>
              <Trophy className="w-20 h-20 mx-auto text-yellow-400 mb-4 animate-bounce" />
              <h2 className="text-4xl font-black text-white mb-2">ПОБЕДА!</h2>
              <p className="text-yellow-400 font-mono text-xl mb-6">+{((state.pot * 0.8) / state.winners.length).toFixed(2)} TON</p>
            </>
          ) : (
            <>
              <Skull className="w-20 h-20 mx-auto text-red-500 mb-4" />
              <h2 className="text-4xl font-black text-white mb-6">ВЫБЫЛ</h2>
            </>
          )}
          <button onClick={onReset} className="w-full bg-white text-black font-bold py-3 rounded-xl uppercase">В меню</button>
        </div>
      </div>
    );
  }

  return null;
};
