import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { GameSchema, GameState, LightColor, UserProfile, GAME_DEFAULTS, Language, GameHistoryItem } from './types';
import { Howl } from 'howler';

function App() {
  const tg = (window as any).Telegram?.WebApp;
  
  const sounds = useMemo(() => ({
    greenLightMusic: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3'], loop: true, volume: 0.5, html5: true }),
    redLightAlert: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/936/936-preview.mp3'], volume: 0.7 }),
    siren: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/997/997-preview.mp3'], volume: 0.6 }),
    shot: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2759/2759-preview.mp3'], volume: 0.4 }),
    win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.8 }), 
    lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3'], volume: 0.8 }),
    cash: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'], volume: 1.0 })
  }), []);

  const initData = tg?.initDataUnsafe?.user;
  const MY_PLAYER_ID = useMemo(() => initData ? `tg_${initData.id}` : `player_${Math.floor(Math.random() * 1000)}`, [initData]);

  const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
  const [isClientEliminated, setIsClientEliminated] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
      const saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              if (!parsed.gameHistory) parsed.gameHistory = [];
              return parsed;
          } catch(e) { return null; }
      }
      return null;
  });

  useEffect(() => {
    if (tg) {
        tg.ready();
        tg.expand();
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    }
  }, [tg]);

  useEffect(() => {
    if (!userProfile) {
        const defaultLang: Language = (tg?.initDataUnsafe?.user?.language_code === 'ru') ? 'RU' : 'EN';
        setUserProfile({
            id: MY_PLAYER_ID,
            username: initData?.username || `Player ${MY_PLAYER_ID.slice(-4)}`,
            tonBalance: 0,
            coins: GAME_DEFAULTS.INITIAL_COINS,
            avatarColor: '#eab308',
            language: defaultLang,
            gameHistory: []
        });
    }
  }, [MY_PLAYER_ID]);

  useEffect(() => {
      if (userProfile) {
          localStorage.setItem(`profile_${MY_PLAYER_ID}`, JSON.stringify(userProfile));
          serverInstance.setPlayerId(MY_PLAYER_ID);
      }
  }, [userProfile, MY_PLAYER_ID]);

  const controlsRef = useRef({ up: false, down: false, left: false, right: false });
  const hasPlayedEndSound = useRef(false);

  useEffect(() => {
    const unsubscribe = serverInstance.subscribe((newState) => {
      setGameState({...newState});
      if (newState.players[MY_PLAYER_ID]?.isEliminated && !isClientEliminated) {
        setIsClientEliminated(true);
        sounds.shot.play();
      }
      if (newState.state === GameState.FINISHED && !hasPlayedEndSound.current) {
        hasPlayedEndSound.current = true;
        if (newState.winners.includes(MY_PLAYER_ID)) sounds.win.play();
        else sounds.lose.play();
      }
      if (newState.state === GameState.LOBBY) {
          hasPlayedEndSound.current = false;
          setIsClientEliminated(false);
      }
    });
    return unsubscribe;
  }, [MY_PLAYER_ID, isClientEliminated, sounds]);

  if (!userProfile) return <div className="bg-[#0f172a] h-screen" />;

  return (
    <div className="w-full h-screen relative bg-[#0f172a] select-none overflow-hidden touch-none">
      <GameScene 
        gameState={gameState} 
        playerId={MY_PLAYER_ID} 
        onMove={(x, z) => serverInstance.playerMove(MY_PLAYER_ID, x, z)} 
        controlsRef={controlsRef}
      />
      <UI 
        state={gameState} 
        playerId={MY_PLAYER_ID} 
        userProfile={userProfile}
        isTrainingMode={isTrainingMode}
        onToggleMode={() => setIsTrainingMode(!isTrainingMode)}
        onStart={() => serverInstance.startGame()}
        onReset={() => serverInstance.reset()}
        playCashSound={() => sounds.cash.play()}
        onUpdateProfile={(upd) => setUserProfile(prev => ({...prev!, ...upd}))}
      />
      {gameState.state === GameState.PLAYING && !isClientEliminated && (
          <Joystick onMove={(x, y) => serverInstance.playerMove(MY_PLAYER_ID, x, y)} />
      )}
    </div>
  );
}

export default App;
