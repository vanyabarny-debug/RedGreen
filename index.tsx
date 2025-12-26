import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, OrbitControls, ContactShadows } from '@react-three/drei';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { serverInstance } from './logic/GameServerEngine';
import { GameState, Difficulty, MapLength } from './types';

// --- Компоненты сцены ---

function PlayerMesh({ player }: { player: any }) {
  return (
    <mesh position={[player.x, 0.5, player.z]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={player.isEliminated ? 'black' : player.color} />
    </mesh>
  );
}

function ObstacleMesh({ obs }: { obs: any }) {
  return (
    <mesh position={[obs.x, obs.radius, obs.z]}>
      <sphereGeometry args={[obs.radius, 32, 32]} />
      <meshStandardMaterial color={obs.type === 'SAW' ? 'red' : 'gray'} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function GameScene({ state }: { state: any }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Sky sunPosition={[100, 20, 100]} />
      
      {/* Пол (Трасса) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, state.config.fieldLength / 2]}>
        <planeGeometry args={[state.config.fieldWidth, state.config.fieldLength + 20]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Линия финиша */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, state.config.fieldLength]}>
        <planeGeometry args={[state.config.fieldWidth, 2]} />
        <meshStandardMaterial color="green" emissive="green" emissiveIntensity={0.5} />
      </mesh>

      {/* Игроки и препятствия */}
      {Object.values(state.players).map((p: any) => <PlayerMesh key={p.id} player={p} />)}
      {state.obstacles.map((obs: any) => <ObstacleMesh key={obs.id} obs={obs} />)}

      <OrbitControls makeDefault target={[0, 0, state.players['me']?.z || 0]} />
    </>
  );
}

// --- Главный UI Компонент ---

export default function App() {
  const [gameState, setGameState] = useState(serverInstance.state);
  const [tonConnectUI] = useTonConnectUI();
  const [myId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    serverInstance.setPlayerId(myId);
    return serverInstance.subscribe(setGameState);
  }, [myId]);

  const handleCreateRoom = async (isTraining: boolean) => {
    // Если не тренировка — можно добавить вызов транзакции TON здесь
    const settings = {
      difficulty: Difficulty.MEDIUM,
      length: MapLength.MEDIUM,
      maxPlayers: 10,
      isTraining,
      currency: isTraining ? 'COINS' : 'TON' as any
    };

    serverInstance.createRoom("Super Game", settings, {
      id: myId,
      x: 0,
      z: 0,
      color: 'blue',
      isEliminated: false,
      hasFinished: false,
      isBot: false
    });
  };

  const handleMove = (dz: number) => {
    serverInstance.playerMove(myId, 0, dz);
  };

  return (
    <div className="w-full h-screen bg-black relative">
      {/* 3D Экран */}
      <Canvas shadows camera={{ position: [0, 5, -10], fov: 50 }}>
        <Suspense fallback={null}>
          <GameScene state={gameState} />
        </Suspense>
      </Canvas>

      {/* Интерфейс поверх игры */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Верхняя панель */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-black/50 p-4 rounded-xl backdrop-blur-md border border-white/10">
            <h1 className="text-xl font-bold text-white">RED LIGHT GREEN LIGHT</h1>
            <p className="text-sm text-gray-300">Room: {gameState.roomId || 'Not in room'}</p>
            <div className={`mt-2 h-2 w-full rounded-full ${gameState.light === 'GREEN' ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_10px_red]'}`} />
          </div>
          <div className="flex gap-2">
             {/* TON Connect Button */}
             <div className="pointer-events-auto">
                <button 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
                  onClick={() => tonConnectUI.openModal()}
                >
                  {tonConnectUI.connected ? 'Wallet Linked' : 'Connect Wallet'}
                </button>
             </div>
          </div>
        </div>

        {/* Состояние Меню */}
        {gameState.state === GameState.MENU && (
          <div className="flex flex-col items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => handleCreateRoom(true)}
              className="w-64 py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition"
            >
              TRAINING (COINS)
            </button>
            <button 
              onClick={() => handleCreateRoom(false)}
              className="w-64 py-4 bg-yellow-400 text-black font-black rounded-2xl hover:bg-yellow-500 transition"
            >
              PLAY FOR TON
            </button>
          </div>
        )}

        {/* Управление в игре */}
        {gameState.state === GameState.PLAYING && (
          <div className="flex justify-center pb-12 pointer-events-auto">
            <button 
              onPointerDown={() => handleMove(1)}
              className="w-24 h-24 bg-white/20 backdrop-blur-xl border-2 border-white/30 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <span className="text-white font-bold">RUN</span>
            </button>
          </div>
        )}

        {/* Экран финиша */}
        {gameState.state === GameState.FINISHED && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto">
            <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
            <p className="text-xl text-yellow-400 mb-6">WIN POT: {gameState.winAmount} {gameState.currency}</p>
            <button 
              onClick={() => serverInstance.leaveRoom()}
              className="px-8 py-3 bg-white text-black font-bold rounded-xl"
            >
              BACK TO MENU
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
