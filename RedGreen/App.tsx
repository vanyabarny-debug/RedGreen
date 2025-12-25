import React, { useEffect, useState, useCallback, useRef } from 'react';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { GameSchema, GameState, LightColor } from './types';
import { Howl } from 'howler';

const sounds = {
  greenLightMusic: new Howl({ 
    src: ['https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3'], 
    loop: true, 
    volume: 0.5 
  }),
  redLightAlert: new Howl({ 
    src: ['https://assets.mixkit.co/active_storage/sfx/936/936-preview.mp3'], 
    volume: 0.7 
  }),
  shot: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2759/2759-preview.mp3'], volume: 0.4 }),
  laser: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1666/1666-preview.mp3'], volume: 0.3 }), // Вернул классический звук лазера
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.8 }), // Оставил новый звук победы
  lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3'], volume: 0.8 }),
  cash: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'], volume: 1.0 })
};

// --- TELEGRAM INTEGRATION ---
// Проверяем наличие Telegram WebApp и получаем данные пользователя
const tg = (window as any).Telegram?.WebApp;
const initData = tg?.initDataUnsafe?.user;

// Определяем ID и Имя игрока. Если запускаем в браузере без ТГ - используем дефолтные.
const MY_PLAYER_ID = initData ? `tg_${initData.id}` : 'player_main';
const MY_PLAYER_NAME = initData ? (initData.first_name + (initData.last_name ? ' ' + initData.last_name : '')) : 'Player 1';

if (tg) {
    tg.ready();
    tg.expand(); // Разворачиваем на весь экран
}
// ----------------------------

function App() {
  const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
  const [isClientEliminated, setIsClientEliminated] = useState(false);
  
  // Ref чтобы не проигрывать звуки победы/поражения много раз
  const hasPlayedEndSound = useRef(false);

  // Музыка и таймер
  useEffect(() => {
    if (gameState.state === GameState.PLAYING && !isClientEliminated) {
      if (gameState.light === LightColor.GREEN) {
        if (!sounds.greenLightMusic.playing()) {
          sounds.greenLightMusic.play();
        }
      } else {
        sounds.greenLightMusic.stop(); 
      }
    } else {
       sounds.greenLightMusic.stop();
    }
  }, [gameState.light, gameState.state, isClientEliminated]);

  // Звук "Красный свет"
  useEffect(() => {
    if (gameState.state === GameState.PLAYING && gameState.light === LightColor.RED && !isClientEliminated) {
        sounds.redLightAlert.play();
    }
  }, [gameState.light, gameState.state, isClientEliminated]);

  // Основная подписка на обновления
  useEffect(() => {
    const unsubscribe = serverInstance.subscribe((newState) => {
      setGameState(newState);
      
      // Обработка смерти игрока (клиента)
      if (newState.players[MY_PLAYER_ID]?.isEliminated && !isClientEliminated) {
        setIsClientEliminated(true);
        sounds.greenLightMusic.stop(); 
        // Звук выстрела/лазера будет обработан в GameScene визуально, но можно добавить импакт тут
        
        // Вибрация в телефоне при смерти (Telegram фича)
        if (tg) tg.HapticFeedback.notificationOccurred('error');
      }

      // Обработка конца игры
      if (newState.state === GameState.FINISHED && !hasPlayedEndSound.current) {
        hasPlayedEndSound.current = true;
        sounds.greenLightMusic.stop();
        
        if (newState.winners.includes(MY_PLAYER_ID)) {
            sounds.win.play();
            if (tg) tg.HapticFeedback.notificationOccurred('success');
        } else {
            sounds.lose.play();
        }
      }
      
      if (newState.state === GameState.LOBBY) {
          hasPlayedEndSound.current = false;
      }
    });
    return unsubscribe;
  }, [isClientEliminated]);

  const handleStart = () => {
    // Передаем ID и Имя при входе
    serverInstance.join(MY_PLAYER_ID, false, MY_PLAYER_NAME);
    serverInstance.start();
    setIsClientEliminated(false);
    hasPlayedEndSound.current = false;
    
    // Легкая вибрация при старте
    if (tg) tg.HapticFeedback.impactOccurred('medium');
  };

  const handlePlayCashSound = () => {
    sounds.cash.play();
  };

  const handleReset = () => {
    serverInstance.reset();
    setIsClientEliminated(false);
    hasPlayedEndSound.current = false;
    sounds.greenLightMusic.stop();
  };

  const handleMove = useCallback((dx: number, dz: number) => {
    serverInstance.playerMove(MY_PLAYER_ID, dx, dz);
  }, []);

  return (
    <div className="w-full h-screen relative bg-[#0f172a] select-none overflow-hidden">
      <GameScene 
        gameState={gameState} 
        playerId={MY_PLAYER_ID} 
        onMove={handleMove} 
      />

      <UI 
        state={gameState} 
        playerId={MY_PLAYER_ID} 
        onStart={handleStart}
        onReset={handleReset}
        playCashSound={handlePlayCashSound}
      />
    </div>
  );
}

export default App;