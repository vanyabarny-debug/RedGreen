import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { GameSchema, GameState, LightColor, UserProfile, GAME_DEFAULTS, Language, GameHistoryItem } from './types';
import { Howl } from 'howler';

const tg = (window as any).Telegram?.WebApp;
const initData = tg?.initDataUnsafe?.user;
const MY_PLAYER_ID = initData ? `tg_${initData.id}` : `player_${Math.floor(Math.random() * 1000)}`;

// Initialize Telegram Web App safely
try {
    if (tg) {
        tg.ready();
        tg.expand(); 
        tg.disableVerticalSwipes();
        if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
    }
} catch(e) {
    console.warn("Telegram WebApp init failed", e);
}

function App() {
  const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
  const [isClientEliminated, setIsClientEliminated] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // -- AUDIO SYSTEM REFACTOR -- 
  // We do NOT instantiate Howl immediately. iOS WebView will crash if AudioContext is created before user gesture.
  const soundsRef = useRef<Record<string, Howl> | null>(null);

  const initAudio = useCallback(() => {
    if (soundsRef.current) return;
    
    // Create sounds only after user interaction
    soundsRef.current = {
      greenLightMusic: new Howl({ 
        src: ['https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3'], 
        loop: true, 
        volume: 0.5 
      }),
      redLightAlert: new Howl({ 
        src: ['https://assets.mixkit.co/active_storage/sfx/936/936-preview.mp3'], 
        volume: 0.7 
      }),
      siren: new Howl({ 
        src: ['https://assets.mixkit.co/active_storage/sfx/997/997-preview.mp3'],
        volume: 0.6
      }),
      shot: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2759/2759-preview.mp3'], volume: 0.4 }),
      win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.8 }), 
      lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3'], volume: 0.8 }),
      cash: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'], volume: 1.0 })
    };
    setAudioInitialized(true);
  }, []);

  const playSound = (key: string) => {
      if (!soundsRef.current) return;
      const sound = soundsRef.current[key];
      if (sound && !sound.playing()) {
          sound.play();
      }
  };

  const stopSound = (key: string) => {
      if (!soundsRef.current) return;
      const sound = soundsRef.current[key];
      if (sound) sound.stop();
  };

  // Initialize audio on first touch anywhere
  useEffect(() => {
      const handleTouch = () => {
          initAudio();
          window.removeEventListener('touchstart', handleTouch);
          window.removeEventListener('click', handleTouch);
      };
      window.addEventListener('touchstart', handleTouch);
      window.addEventListener('click', handleTouch);
      return () => {
          window.removeEventListener('touchstart', handleTouch);
          window.removeEventListener('click', handleTouch);
      }
  }, [initAudio]);

  // -- PROFILE SYSTEM --
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      const saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
      if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (!parsed.gameHistory) parsed.gameHistory = [];
            return parsed;
          } catch(e) {
              console.error("Failed to parse profile", e);
          }
      }
      const defaultLang: Language = (tg?.initDataUnsafe?.user?.language_code === 'ru') ? 'RU' : 'EN';
      return {
          id: MY_PLAYER_ID,
          username: initData?.username || `Player ${MY_PLAYER_ID.slice(-4)}`,
          tonBalance: 0,
          coins: GAME_DEFAULTS.INITIAL_COINS,
          avatarColor: '#eab308',
          language: defaultLang,
          gameHistory: []
      };
  });

  useEffect(() => {
      localStorage.setItem(`profile_${MY_PLAYER_ID}`, JSON.stringify(userProfile));
      serverInstance.setPlayerId(MY_PLAYER_ID);
  }, [userProfile]);

  const handleUpdateProfile = (update: Partial<UserProfile>) => {
      setUserProfile(prev => ({ ...prev, ...update }));
  };

  const controlsRef = useRef({ up: false, down: false, left: false, right: false });
  const hasPlayedEndSound = useRef(false);

  // SOUND & HAPTIC LOGIC
  useEffect(() => {
    if (!audioInitialized) return;

    if (gameState.state === GameState.PLAYING && !isClientEliminated) {
      if (gameState.light === LightColor.GREEN) {
        playSound('greenLightMusic');
        stopSound('siren');
      } else {
        stopSound('greenLightMusic');
        playSound('siren');
        playSound('redLightAlert');
        if (tg) tg.HapticFeedback.notificationOccurred('warning');
      }
    } else {
       stopSound('greenLightMusic');
       stopSound('siren');
       stopSound('redLightAlert');
    }
  }, [gameState.light, gameState.state, isClientEliminated, audioInitialized]);

  useEffect(() => {
    const unsubscribe = serverInstance.subscribe((newState) => {
      setGameState(newState);
      
      // Handle Elimination
      if (newState.players[MY_PLAYER_ID]?.isEliminated && !isClientEliminated) {
        setIsClientEliminated(true);
        if (soundsRef.current) {
            soundsRef.current.greenLightMusic?.stop();
            soundsRef.current.siren?.stop();
            soundsRef.current.shot?.play();
        }
        if (tg) tg.HapticFeedback.notificationOccurred('error');
      }

      // Handle Game End (Win/Loss)
      if (newState.state === GameState.FINISHED && !hasPlayedEndSound.current) {
        hasPlayedEndSound.current = true;
        if (soundsRef.current) {
            soundsRef.current.greenLightMusic?.stop();
            soundsRef.current.siren?.stop();
        }
        
        const isWinner = newState.winners.includes(MY_PLAYER_ID);
        const currency: 'TON' | 'COINS' = isTrainingMode ? 'COINS' : 'TON';
        const entryFee = newState.entryFee;
        const winAmount = newState.winAmount;
        
        if (isWinner) {
            if (soundsRef.current) soundsRef.current.win?.play();
            if (tg) tg.HapticFeedback.notificationOccurred('success');
            
            const netAmount = winAmount - entryFee; 
            const newItem: GameHistoryItem = {
                timestamp: Date.now(),
                outcome: 'WIN',
                amount: netAmount,
                currency: currency
            };

            const currentHistory = userProfile.gameHistory || [];
            
            if (isTrainingMode) {
               handleUpdateProfile({ 
                   coins: userProfile.coins + winAmount, 
                   gameHistory: [...currentHistory, newItem].slice(-30) 
               });
            } else {
               handleUpdateProfile({ 
                   tonBalance: userProfile.tonBalance + winAmount,
                   gameHistory: [...currentHistory, newItem].slice(-30)
               });
            }
        } else {
            if (soundsRef.current) soundsRef.current.lose?.play();
            const netAmount = -entryFee;
            const newItem: GameHistoryItem = {
                timestamp: Date.now(),
                outcome: 'LOSS',
                amount: netAmount,
                currency: currency
            };
            const currentHistory = userProfile.gameHistory || [];
            handleUpdateProfile({ 
                gameHistory: [...currentHistory, newItem].slice(-30)
            });
        }
      }
      
      // Reset State
      if (newState.state === GameState.LOBBY || newState.state === GameState.MENU) {
          hasPlayedEndSound.current = false;
          setIsClientEliminated(false);
      }
    });
    return unsubscribe;
  }, [isClientEliminated, isTrainingMode, userProfile, audioInitialized]);

  const handleJoystickMove = (x: number, y: number) => {
      serverInstance.playerMove(MY_PLAYER_ID, x, y);
  };

  return (
    <div className="w-full h-screen relative bg-[#0f172a] select-none overflow-hidden touch-none" onClick={initAudio}>
      <GameScene 
        gameState={gameState} 
        playerId={MY_PLAYER_ID} 
        onMove={(x, z) => {
             // Init audio on movement attempt if not already done
             if (!audioInitialized) initAudio();
             serverInstance.playerMove(MY_PLAYER_ID, x, z);
        }} 
        controlsRef={controlsRef}
      />

      <UI 
        state={gameState} 
        playerId={MY_PLAYER_ID} 
        userProfile={userProfile}
        isTrainingMode={isTrainingMode}
        onToggleMode={() => setIsTrainingMode(!isTrainingMode)}
        onStart={() => {
            initAudio();
            serverInstance.startGame();
        }}
        onReset={() => serverInstance.reset()}
        playCashSound={() => {
            initAudio();
            if (soundsRef.current) soundsRef.current.cash?.play();
        }}
        onUpdateProfile={handleUpdateProfile}
      />

      {gameState.state === GameState.PLAYING && !isClientEliminated && (
          <Joystick onMove={handleJoystickMove} />
      )}
    </div>
  );
}

export default App;