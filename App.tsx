import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { GameSchema, GameState, LightColor, UserProfile, GAME_DEFAULTS, Language } from './types';

// 1. Защищенные звуки
const createSound = (url: string, loop = false, vol = 0.5) => {
    try {
        return new Howl({
            src: [url],
            loop: loop,
            volume: vol,
            html5: true,
            preload: true
        });
    } catch (e) {
        return { play: () => {}, stop: () => {}, playing: () => false } as any;
    }
};

const sounds = {
    greenLightMusic: createSound('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3', true),
    redLightAlert: createSound('https://assets.mixkit.co/active_storage/sfx/936/936-preview.mp3'),
    cash: createSound('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3', false, 1.0)
};

const tg = (window as any).Telegram?.WebApp;

function App() {
    const initData = tg?.initDataUnsafe?.user;
    const myPlayerIdRef = useRef<string>(
        initData ? `tg_${initData.id}` : `player_${Math.floor(Math.random() * 1000)}`
    );
    const MY_PLAYER_ID = myPlayerIdRef.current;

    const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
    const [isClientEliminated, setIsClientEliminated] = useState(false);
    const [hasError, setHasError] = useState<string | null>(null);

    const [userProfile, setUserProfile] = useState<UserProfile>(() => {
        try {
            const saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        
        const defaultLang: Language = (initData?.language_code === 'ru') ? 'RU' : 'EN';
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
        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        }
    }, []);

    useEffect(() => {
        const unsubscribe = serverInstance.subscribe((newState) => {
            setGameState(newState);
            if (newState.players[MY_PLAYER_ID]?.isEliminated) setIsClientEliminated(true);
        });
        return unsubscribe;
    }, [MY_PLAYER_ID]);

    // Если случится критическая ошибка, выведем её текст
    if (hasError) {
        return (
            <div className="w-full h-screen bg-red-900 text-white p-10">
                <h1>Критическая ошибка:</h1>
                <pre>{hasError}</pre>
                <button onClick={() => window.location.reload()}>Перезагрузить</button>
            </div>
        );
    }

    return (
        <div className="w-full h-screen relative bg-[#0f172a] select-none overflow-hidden touch-none">
            {/* Обертка для отлова ошибок в 3D */}
            <React.Suspense fallback={<div className="text-white">Загрузка 3D...</div>}>
                <GameScene 
                    gameState={gameState} 
                    playerId={MY_PLAYER_ID} 
                    onMove={(x, z) => serverInstance.playerMove(MY_PLAYER_ID, x, z)} 
                    controlsRef={{current: {up:false, down:false, left:false, right:false}}}
                />
            </React.Suspense>

            <UI 
                state={gameState} 
                playerId={MY_PLAYER_ID} 
                userProfile={userProfile}
                onStart={() => serverInstance.startGame()}
                onReset={() => serverInstance.reset()}
                playCashSound={() => sounds.cash.play()}
                onUpdateProfile={(u) => setUserProfile(p => ({...p, ...u}))}
            />

            {gameState.state === GameState.PLAYING && !isClientEliminated && (
                <Joystick onMove={(x, y) => serverInstance.playerMove(MY_PLAYER_ID, x, y)} />
            )}
        </div>
    );
}

export default App;
