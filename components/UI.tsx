import React, { useState } from 'react';
import { GameSchema, GameState, LightColor, GAME_CONFIG, Player } from '../types';
import { Users, DollarSign, AlertOctagon, Trophy, ShieldAlert, Wallet, Skull, Play } from 'lucide-react';

interface UIProps {
  state: GameSchema;
  playerId: string;
  onStart: () => void;
  onReset: () => void;
  playCashSound: () => void;
}

export const UI: React.FC<UIProps> = ({ state, playerId, onStart, onReset, playCashSound }) => {
  const myPlayer = state.players[playerId];
  const players = Object.values(state.players) as Player[];
  const activePlayers = players.filter(p => !p.isEliminated);
  const winnersCount = state.winners.length;
  const spotsLeft = Math.max(0, GAME_CONFIG.MAX_WINNERS - winnersCount);
  
  const [isPaying, setIsPaying] = useState(false);

  const handlePayAndStart = () => {
      setIsPaying(true);
      playCashSound();
      setTimeout(() => {
          onStart();
          setIsPaying(false);
      }, 800);
  };

  // --- LOBBY SCREEN ---
  if (state.state === GameState.LOBBY) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm z-50">
        
        {/* Coin Animation */}
        {isPaying && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                 <div className="text-6xl animate-ping text-yellow-400 font-bold drop-shadow-lg">-10</div>
            </div>
        )}

        <div className={`
            bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl 
            shadow-[0_0_60px_rgba(0,0,0,0.5)] max-w-md w-full text-center 
            transition-all duration-500 transform
            ${isPaying ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}
        `}>
          <div className="mb-8">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-rose-700 tracking-tighter drop-shadow-sm">
                RED LIGHT
              </h1>
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-green-600 tracking-tighter drop-shadow-sm">
                GREEN LIGHT
              </h1>
          </div>
          
          <div className="bg-black/20 rounded-2xl p-6 mb-8 border border-white/5">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                 <div className="flex items-center text-gray-400">
                    <Wallet className="w-5 h-5 mr-3"/>
                    <span className="text-sm font-medium uppercase tracking-widest">Баланс</span>
                 </div>
                 <span className="text-3xl font-mono text-white font-bold tracking-tight">{state.playerBalance} $</span>
            </div>

            <div className="flex justify-between items-center text-rose-400">
              <div className="flex items-center">
                 <DollarSign className="w-5 h-5 mr-3" />
                 <span className="text-sm font-medium uppercase tracking-widest">Взнос</span>
              </div>
              <span className="font-bold text-2xl">-{GAME_CONFIG.ENTRY_FEE} $</span>
            </div>
            
            <div className="mt-6 flex gap-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                 <div className="flex-1 bg-white/5 p-2 rounded flex flex-col items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>30 Игроков</span>
                 </div>
                 <div className="flex-1 bg-rose-500/10 text-rose-500 p-2 rounded flex flex-col items-center gap-1 border border-rose-500/20">
                    <Skull className="w-4 h-4" />
                    <span>Смертельно</span>
                 </div>
            </div>
          </div>

          <button
            onClick={handlePayAndStart}
            disabled={isPaying}
            className="group relative w-full overflow-hidden rounded-2xl bg-white text-black font-black py-5 text-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="relative z-10 flex items-center justify-center gap-2">
                ИГРАТЬ <Play className="w-5 h-5 fill-current" />
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
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-500">
        <div className={`
            p-10 rounded-3xl border max-w-lg w-full text-center shadow-2xl relative overflow-hidden
            ${iWon ? 'border-yellow-500/30 bg-gray-900/90' : 'border-red-900/30 bg-gray-900/90'}
        `}>
          {/* Background Glow */}
          <div className={`absolute -top-20 -left-20 w-60 h-60 rounded-full blur-[100px] opacity-20 ${iWon ? 'bg-yellow-500' : 'bg-red-600'}`} />
          
          {iWon ? (
            <div className="relative z-10">
              <Trophy className="w-20 h-20 mx-auto text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
              <h2 className="text-6xl font-black text-white mb-2 tracking-tighter">ПОБЕДА</h2>
              <p className="text-yellow-500/80 mb-8 font-medium uppercase tracking-widest">Вы выжили</p>
              
              <div className="bg-gradient-to-b from-yellow-500/10 to-transparent p-6 rounded-2xl border border-yellow-500/20 mb-8">
                <p className="text-xs text-yellow-200/50 uppercase tracking-widest mb-1">Ваш куш</p>
                <p className="text-7xl font-mono font-bold text-yellow-400 tracking-tighter">+{state.winAmount}</p>
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <Skull className="w-20 h-20 mx-auto text-red-500 mb-6 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
              <h2 className="text-6xl font-black text-red-600 mb-2 tracking-tighter">ПОТРАЧЕНО</h2>
              <p className="text-red-400/60 mb-8 font-medium uppercase tracking-widest">Вы были устранены</p>
              
              <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10 mb-8">
                  <div className="flex justify-between items-center px-4">
                      <span className="text-red-400/50 uppercase text-xs font-bold tracking-widest">Потеряно</span>
                      <span className="text-red-500 font-mono text-xl">-{GAME_CONFIG.ENTRY_FEE} $</span>
                  </div>
              </div>
            </div>
          )}

          <button
            onClick={onReset}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-all"
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
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
        
        {/* Left Stats */}
        <div className="flex flex-col gap-3">
            <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5 shadow-lg flex flex-col min-w-[140px]">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Банк</span>
                <span className="text-3xl font-mono text-yellow-400 font-bold drop-shadow-sm tracking-tight">{state.pot} $</span>
            </div>
            
            <div className="flex items-center gap-3 opacity-80">
                 <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5 flex items-center">
                    <Wallet className="w-3 h-3 text-emerald-400 mr-2"/>
                    <span className="text-sm font-mono text-gray-300 font-bold">{state.playerBalance}</span>
                 </div>
            </div>
        </div>

        {/* Center Status (Traffic Light Indicator) */}
        <div className={`
          relative px-12 py-3 rounded-full border border-white/10 backdrop-blur-md shadow-2xl transition-all duration-300
          flex items-center justify-center overflow-hidden group
          ${state.light === LightColor.GREEN 
            ? 'bg-emerald-900/60 shadow-[0_0_40px_rgba(16,185,129,0.2)]' 
            : 'bg-red-900/60 shadow-[0_0_40px_rgba(239,68,68,0.3)]'}
        `}>
          {/* Status Glow Line */}
          <div className={`absolute top-0 left-0 w-full h-1 ${state.light === LightColor.GREEN ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'} `} />
          
          <h2 className={`text-4xl font-black uppercase tracking-[0.2em] drop-shadow-lg ${state.light === LightColor.GREEN ? 'text-emerald-400' : 'text-red-500 animate-pulse'}`}>
            {state.light === LightColor.GREEN ? "RUN" : "STOP"}
          </h2>
        </div>

        {/* Right Stats (Players) */}
        <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/5 text-right shadow-lg min-w-[160px]">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Квота</span>
          <div className="flex items-baseline justify-end gap-2 mt-1">
             <span className={`text-4xl font-mono font-bold tracking-tighter ${spotsLeft < 5 ? 'text-red-500' : 'text-white'}`}>{spotsLeft}</span>
             <span className="text-sm text-gray-600 font-bold">/ {GAME_CONFIG.MAX_WINNERS}</span>
          </div>
          <div className="mt-2 text-xs flex justify-end items-center gap-1.5 text-emerald-500/80 font-bold uppercase tracking-wide">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Alive: {activePlayers.length}
          </div>
        </div>
      </div>
      
      {/* Danger Overlay (Vignette) when moving on Red */}
      {state.light === LightColor.RED && !myPlayer.isEliminated && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(220,38,38,0.15)_100%)] z-0 pointer-events-none animate-pulse" />
      )}
    </div>
  );
};