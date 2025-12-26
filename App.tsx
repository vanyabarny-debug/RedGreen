import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { GameSchema, GameState, LightColor, UserProfile, GAME_DEFAULTS, Language, GameHistoryItem } from './types';

// 1. Безопасная инициализация звуков (вынесено из компонента)
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
        console.error("Howler init error:", e);
        return { play: () => {}, stop: () => {}, playing: () => false } as any;
    }
};

const sounds = {
    greenLightMusic: createSound('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3', true),
    redLightAlert: createSound('https://assets.mixkit.co/active_storage/sfx/936/936-preview.mp3'),
    siren: createSound('https://assets.mixkit.co/active_storage/sfx/997/997-preview.mp3'),
    shot: createSound('https://assets.mixkit.co/active_storage/sfx/2759/2759-preview.mp3', false, 0.4),
    win: createSound('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', false, 0.8),
    lose: createSound('https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3', false, 0.8),
    cash: createSound('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3', false, 1.0)
};

const tg = (window as any).Telegram?.WebApp;

function App() {
    const initData = tg?.initDataUnsafe?.user;
    
    // Используем Ref для ID, чтобы он не менялся при ререндерах
    const myPlayerIdRef = useRef<string>(
        initData ? `tg_${initData.id}` : `player_${Math.floor(Math.random() * 1000)}`
    );
    const MY_PLAYER_ID = myPlayerIdRef.current;

    const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
    const [isClientEliminated, setIsClientEliminated] = useState(false);
    const [isTrainingMode, setIsTrainingMode] = useState(true);

    // 2. Безопасная работа с профилем (localStorage под защитой)
    const [userProfile, setUserProfile] = useState<UserProfile>(() => {
        let saved = null;
        try {
            saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
        } catch (e) {
            console.warn("Storage access denied");
        }

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.gameHistory) parsed.gameHistory = [];
                return parsed;
            } catch (e) {}
        }

        const defaultLang: Language = (initData?.language_code === 'ru') ? 'RU' : 'EN';
        return {
            id: MY_PLAYER_ID,
            username: initData?.username || (initData?.first_name ? `${initData.first_name}` : `Player ${MY_PLAYER_ID.slice(-4)}`),
            tonBalance: 0,
            coins: GAME_DEFAULTS.INITIAL_COINS,
            avatarColor: '#eab308',
            language: defaultLang,
            gameHistory: []
        };
    });

    // 3. Инициализация Telegram
    useEffect(() => {
        if (tg) {
            tg.ready();
            tg.expand();
            if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        }
    }, []);

    // 4. Сохранение профиля
    useEffect(() => {
        try {
            localStorage.setItem(`profile_${MY_PLAYER_ID}`, JSON.stringify(userProfile));
        } catch (e) {}
        serverInstance.setPlayerId(MY_PLAYER_ID);
    }, [userProfile, MY_PLAYER_ID]);

    const handleUpdateProfile = useCallback((update: Partial<UserProfile>) => {
        setUserProfile(prev => ({ ...prev, ...update }));
    }, []);

    const controlsRef = useRef({ up: false, down: false, left: false, right: false });
    const hasPlayedEndSound = useRef(false);

    // 5. Логика звуков и подписки
    useEffect(() => {
        const unsubscribe = serverInstance.subscribe((newState) => {
            setGameState(newState);
            
            // Elimination
            if (newState.players[MY_PLAYER_ID]?.isEliminated && !isClientEliminated) {
                setIsClientEliminated(true);
                sounds.greenLightMusic?.stop();
                sounds.shot?.play();
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            }

            // Game End
            if (newState.state === GameState.FINISHED && !hasPlayedEndSound.current) {
                hasPlayedEndSound.current = true;
                sounds.greenLightMusic?.stop();
                
                const isWinner = newState.winners.includes(MY_PLAYER_ID);
                if (isWinner) {
                    sounds.win?.play();
                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                    
                    const winAmount = newState.winAmount;
                    handleUpdateProfile({ 
                        coins: isTrainingMode ? userProfile.coins + winAmount : userProfile.coins,
                        tonBalance: !isTrainingMode ? userProfile.tonBalance + winAmount : userProfile.tonBalance
                    });
                } else {
                    sounds.lose?.play();
                }
            }
            
            if (newState.state === GameState.LOBBY || newState.state === GameState.MENU) {
                hasPlayedEndSound.current = false;
                setIsClientEliminated(false);
            }
        });
        return unsubscribe;
    }, [isClientEliminated, isTrainingMode, userProfile, MY_PLAYER_ID, handleUpdateProfile]);

    // Музыка света
    useEffect(() => {
        if (gameState.state === GameState.PLAYING && !isClientEliminated) {
            if (gameState.light === LightColor.GREEN) {
                if (!sounds.greenLightMusic.playing()) sounds.greenLightMusic.play();
            } else {
                sounds.greenLightMusic.stop();
                if (!sounds.redLightAlert.playing()) sounds.redLightAlert.play();
            }
        } else {
            sounds.greenLightMusic.stop();
        }
    }, [gameState.light, gameState.state, isClientEliminated]);

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
                onUpdateProfile={handleUpdateProfile}
            />

            {gameState.state === GameState.PLAYING && !isClientEliminated && (
                <Joystick onMove={(x, y) => serverInstance.playerMove(MY_PLAYER_ID, x, y)} />
            )}
        </div>
    );
}

export default App;
