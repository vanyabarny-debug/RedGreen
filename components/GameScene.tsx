import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Text, Sparkles, Instances, Instance, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { GameSchema, Player, LightColor, Obstacle } from '../types';
import { Howl } from 'howler';

// Выносим звук лазера, чтобы не пересоздавать
const laserSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1666/1666-preview.mp3'], volume: 0.4 });

// ... (Forest, LaserManager, ObstacleMesh остаются без изменений) ...

const GameContent = ({ gameState, playerId, onMove }: any) => {
    const { size, camera } = useThree();
    const myPlayer = gameState.players[playerId];

    useFrame((state) => {
        if (!myPlayer) return;

        if (!myPlayer.isEliminated && !myPlayer.hasFinished) {
            const isPortrait = size.height > size.width;
            const camDist = 18; 
            const camHeight = isPortrait ? 12 : 15;
            const lookAtOffset = isPortrait ? 8 : 20;

            const targetPos = new THREE.Vector3(myPlayer.x * 0.5, camHeight, myPlayer.z - camDist);
            state.camera.position.lerp(targetPos, 0.1);
            state.camera.lookAt(0, 0, myPlayer.z + lookAtOffset);
        }
    });

    if (!myPlayer) return null; // НЕ РЕНДЕРИМ, ПОКА НЕТ ДАННЫХ

    return (
        <>
            <ambientLight intensity={0.8} /> 
            <directionalLight position={[10, 30, 5]} intensity={1.5} castShadow />
            <Environment preset="night" /> 
            <fog attach="fog" args={['#1e1b4b', 10, 100]} />
            <Sparkles count={300} scale={[60, 20, 200]} size={2} speed={0.4} opacity={0.5} color="#fbbf24" />
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 100]} receiveShadow>
                <planeGeometry args={[100, 400]} />
                <meshStandardMaterial color="#1c1917" />
            </mesh>

            {Object.values(gameState.players).map((p: any) => (
                <PlayerMesh key={p.id} player={p} isMe={p.id === playerId} />
            ))}
            
            <TrafficLight light={gameState.light} timeRemaining={gameState.timeRemaining} z={gameState.config?.fieldLength || 200} />
            <LaserManager players={gameState.players} cannonZ={(gameState.config?.fieldLength || 200) + 5} />
        </>
    );
};

export const GameScene = (props: any) => {
    return (
        <div className="w-full h-full">
            <Canvas shadows camera={{ fov: 60, position: [0, 20, -20] }} dpr={[1, 2]}>
                <GameContent {...props} />
            </Canvas>
        </div>
    );
};
