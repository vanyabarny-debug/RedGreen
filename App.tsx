import React, { useEffect, useState, useCallback, useRef } from 'react';
import { serverInstance } from './logic/GameServerEngine';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';
import { Joystick } from './components/Joystick';
import { GameSchema, GameState, LightColor, UserProfile, GAME_DEFAULTS, Language, GameHistoryItem } from './types';
import { Howl } from 'howler';

// 1. Безопасная инициализация звуков (не падает, если AudioContext заблокирован)
const createSound = (url: string, loop = false, vol = 0.5) => {
    try {
        return new Howl({
            src: [url],
            loop: loop,
            volume: vol,
            html5: true // Помогает с загрузкой на мобильных устройствах
        });
    } catch (e) {
        console.error("Audio error", e);
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

function App() {
    // 2. Безопасное получение объекта Telegram
    const tg = (window as any).Telegram?.WebApp;
    const initData = tg?.initDataUnsafe?.user;
    
    // Используем useRef для ID, чтобы он не менялся при ререндерах
    const myPlayerIdRef = useRef<string>(
        initData ? `tg_${initData.id}` : `player_${Math.floor(Math.random() * 1000)}`
    );
    const MY_PLAYER_ID = myPlayerIdRef.current;

    const [gameState, setGameState] = useState<GameSchema>(serverInstance.state);
    const [isClientEliminated, setIsClientEliminated] = useState(false);
    const [isTrainingMode, setIsTrainingMode] = useState(true);

    // 3. Инициализация Telegram (Safe Ready)
    useEffect(() => {
        if (tg) {
            try {
                tg.ready();
                tg.expand();
                tg.disableVerticalSwipes();
                // Фикс цвета хедера для новых iPhone
                tg.setHeaderColor('#0f172a');
            } catch (e) {
                console.error("TG Init error", e);
            }
        }
    }, [tg]);

    // 4. Безопасный Profile System (через try-catch для localStorage)
    const [userProfile, setUserProfile] = useState<UserProfile>(() => {
        let saved: string | null = null;
        try {
            saved = localStorage.getItem(`profile_${MY_PLAYER_ID}`);
        } catch (e) {
            console.warn("LocalStorage blocked", e);
        }

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.gameHistory) parsed.gameHistory = [];
                return parsed;
            } catch (e) {
                console.error("Parse error", e);
            }
        }

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
        try {
            localStorage.setItem(`profile_${MY_PLAYER_ID}`, JSON.stringify(userProfile));
        } catch (e) {
            // Игнорируем, если квота забита или доступ закрыт
        }
        serverInstance.setPlayerId(MY_PLAYER_ID);
    }, [userProfile, MY_PLAYER_ID]);

    const handleUpdateProfile = useCallback((update: Partial<UserProfile>) => {
        setUserProfile(prev => ({ ...prev, ...update }));
    }, []);

    const controlsRef = useRef({ up: false, down: false, left: false, right: false });
    const hasPlayedEndSound = useRef(false);

    // 5. Исправленная логика звуков (проверка на существование объекта)
    useEffect(() => {
        if (gameState.state === GameState.PLAYING && !isClientEliminated) {
            if (gameState.light === LightColor.GREEN) {
                if (sounds.greenLightMusic && !sounds.greenLightMusic.playing()) sounds.greenLightMusic.play();
                sounds.siren?.stop();
            } else {
                sounds.greenLightMusic?.stop();
                if (sounds.siren && !sounds.siren.playing()) sounds.siren.play();
                if (sounds.redLightAlert && !sounds.redLightAlert.playing()) sounds.redLightAlert.play();
                
                if (tg?.HapticFeedback) {
                    try { tg.HapticFeedback.notificationOccurred('warning'); } catch(e){}
                }
            }
        } else {
            sounds.greenLightMusic?.stop();
            sounds.siren?.stop();
            sounds.redLightAlert?.stop();
        }
    }, [gameState.light, gameState.state, isClientEliminated, tg]);

    // 6. Подписка на сервер
    useEffect(() => {
        const unsubscribe = serverInstance.subscribe((newState) => {
            setGameState(newState);
            
            if (newState.players[MY_PLAYER_ID]?.isEliminated && !isClientEliminated) {
                setIsClientEliminated(true);
                sounds.greenLightMusic?.stop();
                sounds.siren?.stop();
                sounds.shot?.play();
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            }

            if (newState.state === GameState.FINISHED && !hasPlayedEndSound.current) {
                hasPlayedEndSound.current = true;
                sounds.greenLightMusic?.stop();
                sounds.siren?.stop();
                
                const isWinner = newState.winners.includes(MY_PLAYER_ID);
                const currency = isTrainingMode ? 'COINS' : 'TON';
                const entryFee = newState.entryFee;
                
                if (isWinner) {
                    sounds.win?.play();
                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                    
                    const winAmount = newState.winAmount;
                    const netAmount = winAmount - entryFee;

                    const newItem: GameHistoryItem = {
                        timestamp: Date.now(),
                        outcome: 'WIN',
                        amount: netAmount,
                        currency: currency
                    };

                    handleUpdateProfile({ 
                        coins: isTrainingMode ? userProfile.coins + winAmount : userProfile.coins,
                        tonBalance: !isTrainingMode ? userProfile.tonBalance + winAmount : userProfile.tonBalance,
                        gameHistory: [...(userProfile.gameHistory || []), newItem].slice(-30)
                    });
                } else {
                    sounds.lose?.play();
                    const newItem: GameHistoryItem = {
                        timestamp: Date.now(),
                        outcome: 'LOSS',
                        amount: -entryFee,
                        currency: currency
                    };
                    handleUpdateProfile({ 
                        gameHistory: [...(userProfile.gameHistory || []), newItem].slice(-30)
                    });
                }
            }
            
            if (newState.state === GameState.LOBBY || newState.state === GameState.MENU) {
                hasPlayedEndSound.current = false;
                setIsClientEliminated(false);
            }
        });
        return unsubscribe;
    }, [isClientEliminated, isTrainingMode, userProfile, MY_PLAYER_ID, handleUpdateProfile, tg]);

    const handleJoystickMove = useCallback((x: number, y: number) => {
        serverInstance.playerMove(MY_PLAYER_ID, x, y);
    }, [MY_PLAYER_ID]);

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
                playCashSound={() => sounds.cash?.play()}
                onUpdateProfile={handleUpdateProfile}
            />

            {gameState.state === GameState.PLAYING && !isClientEliminated && (
                <Joystick onMove={handleJoystickMove} />
            )}
        </div>
    );
}

export default App;
