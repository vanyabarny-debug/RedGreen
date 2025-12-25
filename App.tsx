import React, { useEffect, useState, useCallback, useRef } from 'react';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { GameSchema, GameState, LightColor, UserProfile, GAME_CONFIG } from './types';
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
  laser: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1666/1666-preview.mp3'], volume: 0.3 }),
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.8 }), 
  lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3'], volume: 0.8 }),
  cash: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'], volume: 1.0 })
};

// --- TELEGRAM INTEGRATION ---
const tg = (window as any).Telegram?.WebApp;
const initData = tg?.initDataUnsafe?.user;

const MY_PLAYER_ID = initData ? `tg_${initData.id}` : 'player_main';

if (tg) {
    tg.ready();
    tg.expand(); 
    if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) {
        tg.disableVerticalSwipes();
    }
}
// ----------------------------

function App() {
  const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
  const [isClientEliminated, setIsClientEliminated] = useState(false);
  
  // -- PROFILE SYSTEM --
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      const saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
      if (saved) return JSON.parse(saved);
      
      return {
          id: MY_PLAYER_ID,
          username: initData?.username || (initData?.first_name ? `${initData.first_name}` : 'Player 1'),
          balance: GAME_CONFIG.INITIAL_BALANCE,
          avatarColor: '#eab308' // Yellow default
      };
  });

  useEffect(() => {
      localStorage.setItem(`profile_${MY_PLAYER_ID}`, JSON.stringify(userProfile));
  }, [userProfile]);

  const handleUpdateProfile = (update: Partial<UserProfile>) => {
      setUserProfile(prev => ({ ...prev, ...update }));
  };
  // --------------------

  const controlsRef = useRef({
      up: false,
      down: false,
      left: false,
      right: false
  });
  
  // Для джойстика (аналоговый ввод) - напрямую обновляет состояние в GameScene
  const joystickMoveRef = useRef({ x: 0, y: 0 });

  const hasPlayedEndSound = useRef(false);

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

  useEffect(() => {
    if (gameState.state === GameState.PLAYING && gameState.light === LightColor.RED && !isClientEliminated) {
        sounds.redLightAlert.play();
    }
  }, [gameState.light, gameState.state, isClientEliminated]);

  useEffect(() => {
    const unsubscribe = serverInstance.subscribe((newState) => {
      setGameState(newState);
      
      if (newState.players[MY_PLAYER_ID]?.isEliminated && !isClientEliminated) {
        setIsClientEliminated(true);
        sounds.greenLightMusic.stop(); 
        if (tg) tg.HapticFeedback.notificationOccurred('error');
      }

      if (newState.state === GameState.FINISHED && !hasPlayedEndSound.current) {
        hasPlayedEndSound.current = true;
        sounds.greenLightMusic.stop();
        
        if (newState.winners.includes(MY_PLAYER_ID)) {
            sounds.win.play();
            if (tg) tg.HapticFeedback.notificationOccurred('success');
            // Начисление выигрыша
            if (newState.winAmount > 0) {
                 handleUpdateProfile({ balance: userProfile.balance + newState.winAmount });
            }
        } else {
            sounds.lose.play();
        }
      }
      
      if (newState.state === GameState.LOBBY) {
          hasPlayedEndSound.current = false;
      }
    });
    return unsubscribe;
  }, [isClientEliminated, userProfile.balance]); // Add userProfile.balance dependency

  const handleStartLobby = () => {
    // Start the lobby sequence instead of immediate game start
    serverInstance.startLobbySequence(MY_PLAYER_ID, userProfile.username);
    setIsClientEliminated(false);
    hasPlayedEndSound.current = false;
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
    // В приоритете джойстик, если он активен
    if (joystickMoveRef.current.x !== 0 || joystickMoveRef.current.y !== 0) {
         serverInstance.playerMove(MY_PLAYER_ID, joystickMoveRef.current.x, joystickMoveRef.current.y);
    } else {
         serverInstance.playerMove(MY_PLAYER_ID, dx, dz);
    }
  }, []);
  
  const handleJoystickMove = (x: number, y: number) => {
      joystickMoveRef.current = { x, y };
  };

  return (
    <div className="w-full h-screen relative bg-[#0f172a] select-none overflow-hidden touch-none">
      <GameScene 
        gameState={gameState} 
        playerId={MY_PLAYER_ID} 
        onMove={handleMove} 
        controlsRef={controlsRef}
      />

      <UI 
        state={gameState} 
        playerId={MY_PLAYER_ID} 
        userProfile={userProfile}
        onStart={handleStartLobby}
        onReset={handleReset}
        playCashSound={handlePlayCashSound}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Отображаем джойстик только в игре и если живы */}
      {gameState.state === GameState.PLAYING && !isClientEliminated && (
          <Joystick onMove={handleJoystickMove} />
      )}
    </div>
  );
}

export default App;