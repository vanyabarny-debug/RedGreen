import React, { useState, useEffect } from 'react';
import { GameSchema, GameState, LightColor, GAME_CONFIG, Player, UserProfile } from '../types';
import { Users, Trophy, Skull, Play, Smartphone, Maximize2, Minimize2, Settings, User, Star, Plus, Loader2 } from 'lucide-react';

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

export const UI: React.FC<UIProps> = ({ state, playerId, userProfile, onStart, onReset, playCashSound, onUpdateProfile }) => {
  const players = Object.values(state.players) as Player[];
  const activePlayers = players.filter(p => !p.isEliminated && !p.hasFinished);
  const finishedPlayers = players.filter(p => p.hasFinished);
  const totalAlive = activePlayers.length + finishedPlayers.length;
  
  // Рассчет куша на одного человека
  const survivors = totalAlive;
  const potentialPrize = survivors > 0 ? Math.floor(state.pot / survivors) : 0;
  
  const [isPaying, setIsPaying] = useState(false);
  const [showRotateWarning, setShowRotateWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile.username);

  // Orientation Check
  useEffect(() => {
    const checkOrientation = () => {
        const isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait && window.innerWidth < 768) {
            setShowRotateWarning(true);
        } else {
            setShowRotateWarning(false);
        }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const handlePayAndJoin = () => {
      if (userProfile.balance < GAME_CONFIG.ENTRY_FEE) {
           alert("Недостаточно звезд! Пополните баланс.");
           setShowProfile(true); 
           return;
      }
      setIsPaying(true);
      playCashSound();
      
      onUpdateProfile({ balance: userProfile.balance - GAME_CONFIG.ENTRY_FEE });
      
      setTimeout(() => {
          onStart(); // Starts lobby sequence
          setIsPaying(false);
      }, 800);
  };

  const handleBuyStars = () => {
      if (confirm("Это демо-режим. Симулировать успешную оплату 250 звезд?")) {
          playCashSound();
          onUpdateProfile({ balance: userProfile.balance + 250 });
          alert("Успешно! +250 Звезд.");
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

  const saveProfile = () => {
      onUpdateProfile({ username: editName });
      setShowProfile(false);
  };

  const changeAvatarColor = () => {
      const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#ec4899'];
      const random = colors[Math.floor(Math.random() * colors.length)];
      onUpdateProfile({ avatarColor: random });
  }
  
  // Force Start for testing (since no backend to start it)
  const handleForceStart = () => {
      // @ts-ignore
      import('../logic/GameServerEngine').then(mod => {
          mod.serverInstance.startGame();
      });
  };

  // --- PROFILE MODAL ---
  const ProfileModal = () => (
      <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-2xl relative">
              <button 
                  onClick={() => setShowProfile(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                  ✕
              </button>
              
              <h2 className="text-2xl font-bold text-center text-white mb-6">Профиль</h2>
              
              <div className="flex flex-col items-center gap-4 mb-6">
                  <div className="relative group cursor-pointer" onClick={changeAvatarColor}>
                      <LegoAvatar color={userProfile.avatarColor} size="w-24 h-24" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                          <Settings className="w-6 h-6 text-white" />
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Никнейм</label>
                      <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                  </div>
                  
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Баланс Звезд</label>
                      <div className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                               <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                               <span className="font-mono text-xl font-bold text-white">{userProfile.balance}</span>
                          </div>
                          <button 
                             onClick={handleBuyStars}
                             className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-white transition-colors flex items-center gap-1 font-bold"
                          >
                              <Plus className="w-3 h-3" /> Пополнить
                          </button>
                      </div>
                  </div>

                  <button 
                      onClick={saveProfile}
                      className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                  >
                      Сохранить
                  </button>
              </div>
          </div>
      </div>
  );

  // --- WAITING ROOM (LOBBY FILLING) ---
  if (state.state === GameState.WAITING) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/90 backdrop-blur-md z-50 p-4">
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[70vh]">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <Users className="text-emerald-400" /> КОМНАТА #1
                    </h2>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        ONLINE
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-hide">
                    {/* List of joined players */}
                    {players.length === 0 && (
                        <div className="text-center text-gray-500 mt-10">Ожидание подключения игроков...</div>
                    )}
                    
                    {players.slice().reverse().map((p, idx) => {
                        const isMe = p.id === playerId;
                        return (
                            <div 
                                key={p.id} 
                                className={`
                                    flex items-center gap-3 p-3 rounded-xl border animate-in fade-in slide-in-from-bottom-2
                                    ${isMe 
                                        ? 'bg-yellow-500/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' 
                                        : 'bg-black/20 border-white/5'}
                                `}
                            >
                                <LegoAvatar color={p.color} size="w-8 h-8" />
                                <div className="flex-1">
                                    <p className={`font-bold text-sm ${isMe ? 'text-yellow-400' : 'text-white'}`}>
                                        {p.name} {isMe && '(Вы)'}
                                    </p>
                                </div>
                                <span className="text-xs text-emerald-500 font-mono">READY</span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 text-center">
                     <div className="mb-4 flex items-center justify-center gap-3">
                         <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                         <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Ожидание игроков...</span>
                     </div>
                     <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden mb-4">
                         <div 
                            className="bg-emerald-500 h-full transition-all duration-300" 
                            style={{ width: `${(players.length / GAME_CONFIG.TARGET_PLAYERS) * 100}%` }} 
                         />
                     </div>
                     
                     {/* Temporary Force Start for testing since there is no backend */}
                     <button 
                        onClick={handleForceStart}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-sm"
                     >
                        Начать игру ({players.length})
                     </button>
                </div>
            </div>
        </div>
      );
  }

  // --- MAIN MENU (LOBBY) ---
  if (state.state === GameState.LOBBY) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm z-50 p-4">
        
        {showProfile && <ProfileModal />}

        {/* Top Controls */}
        <div className="absolute top-4 right-4 flex gap-4 z-[60] items-center">
             <button 
                onClick={() => setShowProfile(true)}
                className="group relative"
            >
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <LegoAvatar color={userProfile.avatarColor} size="w-12 h-12" />
                <div className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full p-1 border border-white/20">
                     <Settings className="w-3 h-3 text-white" />
                </div>
            </button>
            <button 
                onClick={toggleFullscreen}
                className="bg-white/10 p-2 rounded-full backdrop-blur active:scale-95 transition-transform border border-white/10 h-10 w-10 flex items-center justify-center"
            >
                {isFullscreen ? <Minimize2 className="text-white w-5 h-5" /> : <Maximize2 className="text-white w-5 h-5" />}
            </button>
        </div>

        {/* Rotate Warning Overlay */}
        {showRotateWarning && (
             <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-6 py-3 rounded-full shadow-lg z-[70] flex items-center gap-3 animate-pulse pointer-events-none whitespace-nowrap">
                 <Smartphone className="w-5 h-5 animate-[spin_2s_linear_infinite]" />
                 <span className="font-bold text-sm">Поверни экран для удобства!</span>
             </div>
        )}

        {/* Coin Animation */}
        {isPaying && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                 <div className="text-6xl animate-ping text-yellow-400 font-bold drop-shadow-lg flex items-center gap-2">
                    -{GAME_CONFIG.ENTRY_FEE} <Star className="fill-current" />
                 </div>
            </div>
        )}

        <div className={`
            bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl 
            shadow-[0_0_60px_rgba(0,0,0,0.5)] max-w-md w-full text-center 
            transition-all duration-500 transform
            ${isPaying ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}
        `}>
          <div className="mb-6 md:mb-8">
              <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-rose-700 tracking-tighter drop-shadow-sm">
                RED LIGHT
              </h1>
              <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-green-600 tracking-tighter drop-shadow-sm">
                GREEN LIGHT
              </h1>
          </div>
          
          <div className="bg-black/20 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-white/5">
            <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-white/5 pb-4">
                 <div className="flex items-center text-gray-400 gap-2">
                    <span className="text-sm font-medium">{userProfile.username}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-2xl md:text-3xl font-mono text-white font-bold tracking-tight">{userProfile.balance}</span>
                 </div>
            </div>

            <div className="flex justify-between items-center text-rose-400">
              <div className="flex items-center">
                 <Star className="w-5 h-5 mr-3 fill-rose-400/20" />
                 <span className="text-xs md:text-sm font-medium uppercase tracking-widest">Взнос</span>
              </div>
              <span className="font-bold text-xl md:text-2xl">-{GAME_CONFIG.ENTRY_FEE}</span>
            </div>
          </div>

          <button
            onClick={handlePayAndJoin}
            disabled={isPaying}
            className="group relative w-full overflow-hidden rounded-2xl bg-white text-black font-black py-4 md:py-5 text-lg md:text-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative z-10 flex items-center justify-center gap-2">
                ГОТОВ <Play className="w-5 h-5 fill-current" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  // --- GAME OVER SCREEN ---
  if (state.state === GameState.FINISHED) {
    const iWon = state.winners.includes(playerId);
    
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-500 p-4">
        <div className={`
            p-6 md:p-10 rounded-3xl border max-w-lg w-full text-center shadow-2xl relative overflow-hidden
            ${iWon ? 'border-yellow-500/30 bg-gray-900/90' : 'border-red-900/30 bg-gray-900/90'}
        `}>
          <div className={`absolute -top-20 -left-20 w-60 h-60 rounded-full blur-[100px] opacity-20 ${iWon ? 'bg-yellow-500' : 'bg-red-600'}`} />
          
          {iWon ? (
            <div className="relative z-10">
              <Trophy className="w-16 h-16 md:w-20 md:h-20 mx-auto text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
              <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter">ПОБЕДА</h2>
              
              <div className="bg-gradient-to-b from-yellow-500/10 to-transparent p-4 md:p-6 rounded-2xl border border-yellow-500/20 mb-8">
                <p className="text-xs text-yellow-200/50 uppercase tracking-widest mb-1">Ваш куш</p>
                <div className="flex items-center justify-center gap-2">
                     <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                     <p className="text-5xl md:text-7xl font-mono font-bold text-yellow-400 tracking-tighter">+{state.winAmount}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <Skull className="w-16 h-16 md:w-20 md:h-20 mx-auto text-red-500 mb-6 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
              <h2 className="text-4xl md:text-6xl font-black text-red-600 mb-2 tracking-tighter">ELIMINATED</h2>
              
              <div className="bg-red-500/5 p-4 md:p-6 rounded-2xl border border-red-500/10 mb-8">
                  <div className="flex justify-between items-center px-4">
                      <span className="text-red-400/50 uppercase text-xs font-bold tracking-widest">Потеряно</span>
                      <div className="flex items-center gap-1">
                          <span className="text-red-500 font-mono text-lg md:text-xl">-{GAME_CONFIG.ENTRY_FEE}</span>
                          <Star className="w-4 h-4 text-red-500 fill-red-500" />
                      </div>
                  </div>
              </div>
            </div>
          )}

          <button
            onClick={onReset}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 md:py-4 rounded-xl transition-all text-sm md:text-base"
          >
            В ГЛАВНОЕ МЕНЮ
          </button>
        </div>
      </div>
    );
  }

  // --- HUD (HEADS UP DISPLAY) ---
  return (
    <div className="absolute inset-0 pointer-events-none">
       {/* Fullscreen Toggle (In Game) */}
       <div className="absolute top-4 right-4 pointer-events-auto">
            <button 
                onClick={toggleFullscreen}
                className="bg-black/30 p-2 rounded-full backdrop-blur border border-white/10 active:bg-white/20"
            >
                {isFullscreen ? <Minimize2 className="text-white w-5 h-5" /> : <Maximize2 className="text-white w-5 h-5" />}
            </button>
       </div>

      {/* Top Bar - STATS */}
      <div className="absolute top-0 left-0 right-0 p-3 md:p-6 flex flex-row justify-between items-start pointer-events-none">
        
        {/* Left: Total Bank and Prize per Person */}
        <div className="flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-lg flex flex-col min-w-[120px]">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Общий Банк</span>
                <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-2xl font-mono text-white font-bold tracking-tight">{state.pot}</span>
                </div>
            </div>
            
            {state.state === GameState.PLAYING && (
                <div className="bg-emerald-900/40 backdrop-blur-md px-3 py-2 rounded-xl border border-emerald-500/20 flex flex-col">
                     <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-widest">На выжившего</span>
                     <div className="flex items-center gap-1">
                         <span className="font-mono text-lg text-emerald-300 font-bold">~{potentialPrize}</span>
                         <Star className="w-3 h-3 text-emerald-300 fill-current" />
                     </div>
                </div>
            )}
        </div>

        {/* Center: Traffic Light */}
        <div className={`
          absolute left-1/2 -translate-x-1/2 top-4 md:top-6
          px-6 py-2 md:px-12 md:py-3 rounded-full border border-white/10 backdrop-blur-md shadow-2xl transition-all duration-300
          flex items-center justify-center overflow-hidden group z-10
          ${state.light === LightColor.GREEN 
            ? 'bg-emerald-900/60 shadow-[0_0_40px_rgba(16,185,129,0.2)]' 
            : 'bg-red-900/60 shadow-[0_0_40px_rgba(239,68,68,0.3)]'}
        `}>
          <div className={`absolute top-0 left-0 w-full h-1 ${state.light === LightColor.GREEN ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'} `} />
          <h2 className={`text-2xl md:text-4xl font-black uppercase tracking-[0.2em] drop-shadow-lg ${state.light === LightColor.GREEN ? 'text-emerald-400' : 'text-red-500 animate-pulse'}`}>
            {state.light === LightColor.GREEN ? "RUN" : "STOP"}
          </h2>
        </div>

        {/* Right: Survivors Stats */}
        <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-right shadow-lg min-w-[100px] mr-10 md:mr-12">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Выжившие</span>
          <div className="flex items-baseline justify-end gap-1 mt-1">
             <span className="text-3xl font-mono font-bold text-white">{totalAlive}</span>
             <span className="text-sm text-gray-500 font-bold">/ {players.length}</span>
          </div>
        </div>
      </div>
      
      {/* Danger Overlay */}
      {state.light === LightColor.RED && !state.players[playerId]?.isEliminated && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(220,38,38,0.15)_100%)] z-0 pointer-events-none animate-pulse" />
      )}
    </div>
  );
};