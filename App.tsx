import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Howl } from 'howler';

// Импорты компонентов
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { GameSchema, GameState, LightColor, UserProfile, GAME_DEFAULTS } from './types';

// --- ЗВУКИ ---
const sounds = {
  greenLightMusic: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3'], loop: true, volume: 0.5 }),
  redLightAlert: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/936/936-preview.mp3'], volume: 0.7 }),
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.8 }), 
  lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3'], volume: 0.8 }),
  cash: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'], volume: 1.0 })
};

const tg = (window as any).Telegram?.WebApp;
const initData = tg?.initDataUnsafe?.user;
const MY_PLAYER_ID = initData ? `tg_${initData.id}` : `player_local`;

function App() {
  const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
  const [isClientEliminated, setIsClientEliminated] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(true); // По умолчанию тренировка
  
  // Баланс TON (из базы) и Локальные коины (из памяти)
  const [tonBalance, setTonBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      const saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
      if (saved) return JSON.parse(saved);
      
      return {
          id: MY_PLAYER_ID,
          username: initData?.username || "Player",
          balance: 1000, // Начальные монеты для тренировки
          avatarColor: '#eab308'
      };
  });

  // Загрузка реального TON из базы (если есть API)
  useEffect(() => {
    async function fetchTon() {
        try {
            const res = await fetch(`/api/get-user?tgId=${MY_PLAYER_ID.replace('tg_', '')}`);
            const data = await res.json();
            if (data?.internal_balance) setTonBalance(data.internal_balance);
        } catch (e) { console.log("База пока не подключена, используем локал"); }
    }
    fetchTon();
  }, []);

  // Сохранение локального профиля
  useEffect(() => {
      localStorage.setItem(`profile_${MY_PLAYER_ID}`, JSON.stringify(userProfile));
      serverInstance.setPlayerId(MY_PLAYER_ID);
  }, [userProfile]);

  const handleUpdateProfile = (update: Partial<UserProfile>) => {
      setUserProfile(prev => ({ ...prev, ...update }));
  };

  const hasPlayedEndSound = useRef(false);

  useEffect(() => {
    const unsubscribe = serverInstance.subscribe((newState) => {
      setGameState(newState);
      
      if (newState.players[MY_PLAYER_ID]?.isEliminated && !isClientEliminated) {
        setIsClientEliminated(true);
        if (tg) tg.HapticFeedback.notificationOccurred('error');
      }

      if (newState.state === GameState.FINISHED && !hasPlayedEndSound.current) {
        hasPlayedEndSound.current = true;
        if (newState.winners.includes(MY_PLAYER_ID)) {
            sounds.win.play();
            // Если тренировка — прибавляем локальные коины
            if (isTrainingMode) {
                handleUpdateProfile({ balance: userProfile.balance + 100 });
            }
        } else {
            sounds.lose.play();
        }
      }
      
      if (newState.state === GameState.LOBBY || newState.state === GameState.MENU) {
          hasPlayedEndSound.current = false;
          setIsClientEliminated(false);
      }
    });
    return unsubscribe;
  }, [isClientEliminated, userProfile, isTrainingMode]);

  return (
    <div className="w-full h-screen relative bg-[#0f172a] select-none overflow-hidden touch-none">
      
      {/* ИНФОРМАЦИЯ О БАЛАНСАХ */}
      <div className="absolute top-2 right-2 z-50 flex flex-col items-end gap-1">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">
            TON: {tonBalance.toFixed(2)}
          </div>
          <div className="bg-yellow-500 text-black px-3 py-1 rounded-lg text-xs font-bold">
            Coins: {userProfile.balance}
          </div>
      </div>

      {isTrainingMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold animate-pulse">
          РЕЖИМ ТРЕНИРОВКИ
        </div>
      )}

      <GameScene 
        gameState={gameState} 
        playerId={MY_PLAYER_ID} 
        onMove={(dx, dz) => serverInstance.playerMove(MY_PLAYER_ID, dx, dz)} 
        controlsRef={{current: {up: false, down: false, left: false, right: false}}}
      />

      <UI 
        state={gameState} 
        playerId={MY_PLAYER_ID} 
        userProfile={userProfile}
        onStart={() => serverInstance.startGame()}
        onReset={() => serverInstance.reset()}
        playCashSound={() => sounds.cash.play()}
        onUpdateProfile={handleUpdateProfile}
      />

      <button 
        onClick={() => setIsTrainingMode(!isTrainingMode)}
        className={`absolute bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-xl border font-bold transition-all ${
            isTrainingMode ? "bg-green-600 border-green-400 text-white" : "bg-white/10 border-white/20 text-white/50"
        }`}
      >
        {isTrainingMode ? "ТРЕНИРОВКА ВКЛ" : "ИГРА НА ТОН (OFF)"}
      </button>

      {gameState.state === GameState.PLAYING && !isClientEliminated && (
          <Joystick onMove={(x, y) => serverInstance.playerMove(MY_PLAYER_ID, x, y)} />
      )}
    </div>
  );
}

// --- ИНИЦИАЛИЗАЦИЯ ---
const MANIFEST_URL = 'https://red-green-gray.vercel.app/tonconnect-manifest.json';
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
        <App />
      </TonConnectUIProvider>
    </React.StrictMode>
  );
}

export default App;
