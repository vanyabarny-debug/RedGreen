import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Text, Sparkles, Billboard, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { GameSchema, Player, LightColor, Obstacle } from '../types';
import { Howl, Howler } from 'howler';

interface SceneProps {
  gameState: GameSchema;
  playerId: string;
  onMove: (dx: number, dz: number) => void;
  controlsRef: React.MutableRefObject<{ up: boolean; down: boolean; left: boolean; right: boolean }>;
}

const laserSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1666/1666-preview.mp3'], volume: 0.4 });

const Forest = ({ fieldLength, fieldWidth }: { fieldLength: number, fieldWidth: number }) => {
    const trees = useMemo(() => {
        const temp = [];
        const treeCount = Math.floor(fieldLength * 0.8); // Reduced count for performance
        for (let i = 0; i < treeCount; i++) {
            const isLeft = Math.random() > 0.5;
            const xOffset = (fieldWidth / 2) + 5 + Math.random() * 30;
            const x = isLeft ? -xOffset : xOffset;
            const z = Math.random() * (fieldLength + 20) - 10;
            const scale = 0.8 + Math.random() * 1.5;
            temp.push({ position: [x, 0, z], scale });
        }
        return temp;
    }, [fieldLength, fieldWidth]);

    return (
        <Instances range={trees.length}>
            <coneGeometry args={[1.5, 6, 6]} /> {/* Reduced segments */}
            <meshStandardMaterial color="#14532d" roughness={1} />
            {trees.map((data, i) => (
                <group key={i} position={data.position as [number, number, number]} scale={[data.scale, data.scale, data.scale]}>
                    <Instance position={[0, 3, 0]} />
                    <mesh position={[0, 1, 0]}>
                         <cylinderGeometry args={[0.4, 0.5, 2]} />
                         <meshStandardMaterial color="#3f2e18" />
                    </mesh>
                </group>
            ))}
        </Instances>
    );
};

const LaserManager = ({ players, cannonZ }: { players: Record<string, Player>, cannonZ: number }) => {
    const [lasers, setLasers] = useState<{ id: string, target: THREE.Vector3 }[]>([]);
    const eliminatedIds = useRef<Set<string>>(new Set());

    useFrame(() => {
        const newLasers: { id: string, target: THREE.Vector3 }[] = [];
        let hasNewEliminations = false;

        Object.values(players).forEach(p => {
            if (p.isEliminated && !eliminatedIds.current.has(p.id)) {
                eliminatedIds.current.add(p.id);
                if (!p.deathReason || p.deathReason === 'MOVEMENT') {
                    newLasers.push({ id: p.id, target: new THREE.Vector3(p.x, 1, p.z) });
                    hasNewEliminations = true;
                }
            }
        });

        if (hasNewEliminations) {
            if (Howler.ctx && Howler.ctx.state === 'running') {
               laserSound.play();
            }
            setLasers(prev => [...prev, ...newLasers]);
        }
    });
    
    useEffect(() => {
        if (lasers.length > 0) {
            const timer = setTimeout(() => setLasers([]), 500);
            return () => clearTimeout(timer);
        }
    }, [lasers]);
    
    useEffect(() => {
        const currentEliminatedCount = Object.values(players).filter(p => p.isEliminated).length;
        if (currentEliminatedCount === 0) eliminatedIds.current.clear();
    }, [players]);

    return (
        <>
            {lasers.map((l) => {
                const start = new THREE.Vector3(0, 14, cannonZ);
                const end = l.target;
                const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                const len = start.distanceTo(end);
                const orientation = new THREE.Matrix4();
                orientation.lookAt(start, end, new THREE.Vector3(0,1,0));
                orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2));
                return (
                    <mesh key={l.id} position={mid} quaternion={new THREE.Quaternion().setFromRotationMatrix(orientation)}>
                        <cylinderGeometry args={[0.1, 0.1, len, 6]} />
                        <meshBasicMaterial color="red" toneMapped={false} />
                    </mesh>
                )
            })}
        </>
    );
};

const ObstacleMesh: React.FC<{ obstacle: Obstacle }> = ({ obstacle }) => {
    const meshRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            if (obstacle.type === 'SAW') {
                meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, obstacle.x, 0.2);
                meshRef.current.position.z = obstacle.z;
                meshRef.current.rotation.y += delta * 10;
            } else if (obstacle.type === 'BALL') {
                meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, obstacle.x, 0.2);
                meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, obstacle.z, 0.2);
                meshRef.current.rotation.x -= delta * 2; 
            }
        }
    });

    if (obstacle.type === 'BALL') {
        return (
            <group ref={meshRef} position={[obstacle.x, obstacle.radius, obstacle.z]}>
                <mesh castShadow receiveShadow>
                    <dodecahedronGeometry args={[obstacle.radius, 1]} /> {/* Lower detail */}
                    <meshStandardMaterial color="#57534e" roughness={0.9} />
                </mesh>
            </group>
        );
    }

    return (
        <group ref={meshRef} position={[obstacle.x, 0.2, obstacle.z]}>
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[obstacle.radius, obstacle.radius, 0.3, 16]} />
                <meshStandardMaterial color="#999" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh><boxGeometry args={[obstacle.radius * 2.3, 0.4, 0.4]} /><meshStandardMaterial color="#ef4444" /></mesh>
            <mesh rotation={[0, Math.PI/2, 0]}><boxGeometry args={[obstacle.radius * 2.3, 0.4, 0.4]} /><meshStandardMaterial color="#ef4444" /></mesh>
        </group>
    );
}

const PlayerMesh: React.FC<{ player: Player; isMe: boolean }> = ({ player, isMe }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, player.z, 0.2);
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, player.x, 0.2);
      
      if (player.isEliminated) {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -Math.PI / 2, 0.1);
        meshRef.current.position.y = 0.2; 
      } else {
         meshRef.current.position.y = 0; 
         meshRef.current.rotation.x = 0;
         meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.05;
      }
    }
  });

  return (
    <group ref={meshRef} position={[player.x, 0, player.z]}>
      <group>
        <mesh position={[-0.25, 0.4, 0]} castShadow><boxGeometry args={[0.4, 0.8, 0.4]} /><meshStandardMaterial color="#222" /></mesh>
        <mesh position={[0.25, 0.4, 0]} castShadow><boxGeometry args={[0.4, 0.8, 0.4]} /><meshStandardMaterial color="#222" /></mesh>
        <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[0.9, 1, 0.5]} /><meshStandardMaterial color={player.color} /></mesh>
        <mesh position={[0, 2.1, 0]} castShadow><cylinderGeometry args={[0.25, 0.25, 0.6, 12]} /><meshStandardMaterial color="#facc15" /></mesh>
      </group>
      
      {isMe && !player.isEliminated && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
               <ringGeometry args={[0.6, 0.8, 24]} />
               <meshBasicMaterial color="#fbbf24" opacity={0.6} transparent />
          </mesh>
      )}

      {!player.isEliminated && (
          <Billboard position={[0, 3.5, 0]}>
            <Text fontSize={0.6} color={isMe ? "#fbbf24" : "white"} outlineWidth={0.05} outlineColor="black">
                {player.name || "Player"}
            </Text>
          </Billboard>
      )}
    </group>
  );
};

const TrafficLight = ({ light, timeRemaining, z }: { light: LightColor, timeRemaining: number, z: number }) => {
    const isGreen = light === LightColor.GREEN;
    return (
        <group position={[0, 8, z]}>
            <mesh position={[-3, 0, 0]}>
                <sphereGeometry args={[1.5, 16, 16]} />
                <meshStandardMaterial 
                    color={!isGreen ? "#ef4444" : "#450a0a"} 
                    emissive={!isGreen ? "#ef4444" : "#000000"}
                    emissiveIntensity={!isGreen ? 3 : 0}
                    fog={false} 
                />
            </mesh>
            <mesh position={[3, 0, 0]}>
                <sphereGeometry args={[1.5, 16, 16]} />
                <meshStandardMaterial 
                    color={isGreen ? "#22c55e" : "#052e16"}
                    emissive={isGreen ? "#22c55e" : "#0000000"}
                    emissiveIntensity={isGreen ? 3 : 0}
                    fog={false} 
                />
            </mesh>
            <mesh position={[0, -2.5, 0]}>
                <boxGeometry args={[10, 1, 1]} />
                <meshStandardMaterial color="#1f2937" fog={false} />
            </mesh>
            <Text 
                position={[0, 4.5, 0]} 
                rotation={[0, Math.PI, 0]} 
                fontSize={8} 
                color="white"
                material-fog={false}
                outlineWidth={0.2}
                outlineColor="black"
            >
                {(timeRemaining / 1000).toFixed(1)}
            </Text>
        </group>
    )
}

const GameContent = ({ gameState, playerId, onMove, controlsRef }: SceneProps) => {
    const keysPressed = useRef<Set<string>>(new Set());
    const { size, camera } = useThree();

    const fieldLength = gameState.config?.fieldLength || 200;
    const fieldWidth = gameState.config?.fieldWidth || 60;

    useEffect(() => {
        const isPortrait = size.height > size.width;
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        if (perspectiveCamera.isPerspectiveCamera) {
            perspectiveCamera.fov = isPortrait ? 75 : 60;
            perspectiveCamera.updateProjectionMatrix();
        }
    }, [size, camera]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current.add(e.code); };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current.delete(e.code); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useFrame((state) => {
        const MyPlayer = gameState.players[playerId];
        if (!MyPlayer) return;

        if (!MyPlayer.isEliminated && !MyPlayer.hasFinished) {
            const isPortrait = size.height > size.width;
            const camDist = isPortrait ? 20 : 18; 
            const camHeight = isPortrait ? 14 : 15;
            const lookAtOffset = isPortrait ? 5 : 20;

            const targetPos = new THREE.Vector3(0, camHeight, MyPlayer.z - camDist);
            state.camera.position.lerp(targetPos, 0.1);
            state.camera.lookAt(0, 0, MyPlayer.z + lookAtOffset);
        }

        if (!MyPlayer.isEliminated && !MyPlayer.hasFinished) {
            let dx = 0; let dz = 0;
            if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) dz = 1;
            if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) dz = -1;
            if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) dx = 1;
            if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) dx = -1;
            if (dx !== 0 || dz !== 0) onMove(dx, dz);
        }
    });

    return (
        <>
            <ambientLight intensity={0.7} /> 
            <directionalLight position={[10, 30, 5]} intensity={1.2} />
            <fog attach="fog" args={['#1e1b4b', 10, 90]} />

            {/* drastically reduced particle count for iOS stability */}
            <Sparkles count={150} scale={[fieldWidth + 20, 20, fieldLength]} size={2} speed={0.4} opacity={0.5} color="#fbbf24" />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 50]}>
                <planeGeometry args={[fieldWidth + 60, 400]} />
                <meshStandardMaterial color="#1c1917" />
            </mesh>

            <Forest fieldLength={fieldLength} fieldWidth={fieldWidth} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, fieldLength]}>
                <planeGeometry args={[fieldWidth, 2]} />
                <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} />
            </mesh>
            <Text position={[0, 4, fieldLength]} rotation={[0, Math.PI, 0]} fontSize={4} color="#facc15" outlineWidth={0.1} outlineColor="black">
                FINISH
            </Text>
            
            <TrafficLight light={gameState.light} timeRemaining={gameState.timeRemaining} z={fieldLength + 5} />
            <LaserManager players={gameState.players} cannonZ={fieldLength + 5} />

            {gameState.obstacles.map(obs => (
                <ObstacleMesh key={obs.id} obstacle={obs} />
            ))}

            {Object.values(gameState.players).map((p) => (
                <PlayerMesh key={p.id} player={p} isMe={p.id === playerId} />
            ))}
        </>
    );
};

export const GameScene = (props: SceneProps) => {
    return (
        <div className="w-full h-full">
            <Canvas 
                shadows={false} 
                camera={{ fov: 60, position: [0, 8, -10] }} 
                dpr={1} // CRITICAL: Force 1x pixel ratio. iOS Retina (3x) will crash memory otherwise.
                gl={{ 
                    antialias: false, 
                    powerPreference: "default",
                    alpha: false, // Disabling alpha buffer saves memory
                    stencil: false,
                    depth: true
                }}
            >
                <GameContent {...props} />
            </Canvas>
        </div>
    );
};
