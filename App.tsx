import React, { useEffect, useState, useCallback, useRef } from 'react';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { 
  GameSchema, GameState, LightColor, UserProfile, 
  GAME_DEFAULTS, Language, GameHistoryItem 
} from './types';
import { Howl } from 'howler';
import { useTonConnectUI } from '@tonconnect/ui-react';

// --- Инициализация SDK Telegram ---
const tg = (window as any).Telegram?.WebApp;
const initData = tg?.initDataUnsafe;
const MY_PLAYER_ID = initData?.user ? `tg_${initData.user.id}` : `dev_${Math.floor(Math.random() * 1000)}`;

// --- Звуковой движок с предзагрузкой ---
const sounds = {
  greenLight: new Howl({ src: ['/sounds/green-light.mp3'], loop: true, volume: 0.4 }),
  redLight: new Howl({ src: ['/sounds/red-light-alert.mp3'], volume: 0.6 }),
  shot: new Howl({ src: ['/sounds/eliminated.mp3'], volume: 0.8 }),
  win: new Howl({ src: ['/sounds/victory.mp3'], volume: 0.7 }),
  cash: new Howl({ src: ['/sounds/coins.mp3'], volume: 0.6 })
};

function App() {
  const [tonConnectUI] = useTonConnectUI();
  const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
  const [isClientEliminated, setIsClientEliminated] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const controlsRef = useRef({ up: false, down: false, left: false, right: false });
  const hasProcessedResult = useRef(false);

  // --- 1. ЗАГРУЗКА ПРОФИЛЯ (SQL SYNC) ---
  const fetchProfile = useCallback(async () => {
    try {
      // Здесь должен быть ваш реальный API URL
      const response = await fetch(`/api/user/profile?id=${MY_PLAYER_ID}`);
      const data = await response.json();
      setUserProfile(data);
    } catch (e) {
      // Fallback на localStorage если сервер недоступен (только для Coins)
      console.warn("Server unavailable, using local cache");
      const saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
      setUserProfile(saved ? JSON.parse(saved) : {
        id: MY_PLAYER_ID,
        username: initData?.user?.username || "Guest",
        tonBalance: 0,
        coins: GAME_DEFAULTS.INITIAL_COINS,
        avatarColor: '#eab308',
        language: initData?.user?.language_code === 'ru' ? 'RU' : 'EN',
        gameHistory: []
      });
    }
  }, []);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.disableVerticalSwipes();
    }
    fetchProfile();
    serverInstance.setPlayerId(MY_PLAYER_ID);
  }, [fetchProfile]);

  // --- 2. ОБРАБОТКА ИГРОВЫХ СОБЫТИЙ ---
  useEffect(() => {
    const unsubscribe = serverInstance.subscribe(async (newState) => {
      setGameState(newState);

      const me = newState.players[MY_PLAYER_ID];

      // Смерть игрока
      if (me?.isEliminated && !isClientEliminated) {
        setIsClientEliminated(true);
        sounds.greenLight.stop();
        sounds.shot.play();
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      }

      // Завершение игры
      if (newState.state === GameState.FINISHED && !hasProcessedResult.current) {
        hasProcessedResult.current = true;
        await syncGameResult(newState);
      }

      // Сброс триггеров при возврате в меню/лобби
      if (newState.state === GameState.MENU || newState.state === GameState.LOBBY) {
        hasProcessedResult.current = false;
        setIsClientEliminated(false);
      }
    });

    return unsubscribe;
  }, [isClientEliminated, userProfile]);

  // --- 3. СИНХРОНИЗАЦИЯ РЕЗУЛЬТАТОВ С СЕРВЕРОМ (SQL) ---
  const syncGameResult = async (finalState: GameSchema) => {
    const isWinner = finalState.winners.includes(MY_PLAYER_ID);
    
    // В режиме TON мы не доверяем клиенту, а просто запрашиваем обновленный баланс у SQL
    try {
      await fetch(`/api/game/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: MY_PLAYER_ID, 
          roomId: finalState.roomId,
          isWinner 
        })
      });
      
      if (isWinner) sounds.win.play();
      fetchProfile(); // Перезагружаем баланс из БД
    } catch (e) {
      console.error("Failed to sync result with server");
    }
  };

  // --- 4. УПРАВЛЕНИЕ ЗВУКОМ И СВЕТОМ ---
  useEffect(() => {
    if (gameState.state === GameState.PLAYING && !isClientEliminated) {
      if (gameState.light === LightColor.GREEN) {
        if (!sounds.greenLight.playing()) sounds.greenLight.play();
      } else {
        sounds.greenLight.stop();
        sounds.redLight.play();
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
      }
    } else {
      sounds.greenLight.stop();
    }
  }, [gameState.light, gameState.state, isClientEliminated]);

  // --- 5. ДЕПОЗИТ TON (БЕЗОПАСНЫЙ) ---
  const handleDeposit = async () => {
    if (!tonConnectUI.connected) {
      tonConnectUI.openModal();
      return;
    }

    try {
      const amount = "1000000000"; // 1 TON в нанотонах
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{ address: "YOUR_ADMIN_WALLET_ADDRESS", amount }]
      };

      const result = await tonConnectUI.sendTransaction(tx);
      
      // Отправляем proof (BOC) на сервер для проверки через API
      await fetch('/api/ton/verify-deposit', {
        method: 'POST',
        body: JSON.stringify({ boc: result.boc, playerId: MY_PLAYER_ID })
      });

      sounds.cash.play();
      fetchProfile(); // Обновляем баланс
    } catch (e) {
      console.error("Deposit failed", e);
    }
  };

  if (!userProfile) return <div className="bg-[#0f172a] h-screen flex items-center justify-center text-white font-mono">LOADING_PROFILE...</div>;

  return (
    <div className="w-full h-screen relative bg-[#0f172a] select-none overflow-hidden touch-none">
      {/* 3D Слой */}
      <GameScene 
        gameState={gameState} 
        playerId={MY_PLAYER_ID} 
        onMove={(x, z) => serverInstance.playerMove(MY_PLAYER_ID, x, z)} 
        controlsRef={controlsRef}
      />

      {/* Слой Интерфейса */}
      <UI 
        state={gameState} 
        playerId={MY_PLAYER_ID} 
        userProfile={userProfile}
        isTrainingMode={isTrainingMode}
        onToggleMode={() => setIsTrainingMode(!isTrainingMode)}
        onStart={() => serverInstance.startGame()}
        onReset={() => serverInstance.reset()}
        playCashSound={() => sounds.cash.play()}
        onUpdateProfile={(update) => setUserProfile(prev => prev ? {...prev, ...update} : null)}
        onDeposit={handleDeposit} // Передаем функцию депозита
      />

      {/* Управление для мобилок */}
      {gameState.state === GameState.PLAYING && !isClientEliminated && (
          <Joystick onMove={(x, y) => serverInstance.playerMove(MY_PLAYER_ID, x, y)} />
      )}
    </div>
  );
}

export default App;
