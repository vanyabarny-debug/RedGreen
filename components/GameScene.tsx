import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Text, Sparkles, Stars, Instance, Instances, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { GameSchema, Player, LightColor, GAME_DEFAULTS, Obstacle } from '../types';
import { Howl } from 'howler';

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
        // Количество деревьев зависит от длины
        const treeCount = Math.floor(fieldLength * 1.5);
        
        for (let i = 0; i < treeCount; i++) {
            const isLeft = Math.random() > 0.5;
            const xOffset = (fieldWidth / 2) + 5 + Math.random() * 40;
            const x = isLeft ? -xOffset : xOffset;
            const z = Math.random() * (fieldLength + 40) - 20;
            const scale = 0.8 + Math.random() * 1.5;
            temp.push({ position: [x, 0, z], scale });
        }
        return temp;
    }, [fieldLength, fieldWidth]);

    return (
        <Instances range={trees.length}>
            <coneGeometry args={[1.5, 6, 8]} />
            <meshStandardMaterial color="#14532d" roughness={0.8} />
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

const LaserBeam: React.FC<{ start: THREE.Vector3; end: THREE.Vector3 }> = ({ start, end }) => {
    const [active, setActive] = useState(true);

    useEffect(() => {
        const timeout = setTimeout(() => setActive(false), 200); 
        return () => clearTimeout(timeout);
    }, []);

    if (!active) return null;

    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
    const offsetRotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    orientation.multiply(offsetRotation);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(orientation);

    return (
        <mesh position={midPoint} quaternion={quaternion}>
            <cylinderGeometry args={[0.1, 0.1, length, 8]} />
            <meshBasicMaterial color="#ff0000" toneMapped={false} />
            <pointLight intensity={3} color="#ff0000" distance={5} />
        </mesh>
    );
};

const LaserManager = ({ players, cannonZ }: { players: Record<string, Player>, cannonZ: number }) => {
    const [lasers, setLasers] = useState<{ id: string, target: THREE.Vector3 }[]>([]);
    const eliminatedIds = useRef<Set<string>>(new Set());
    const cannonPosition = new THREE.Vector3(0, 14, cannonZ); 

    useFrame(() => {
        const newLasers: { id: string, target: THREE.Vector3 }[] = [];
        let hasNewEliminations = false;

        Object.values(players).forEach(p => {
            if (p.isEliminated && !eliminatedIds.current.has(p.id)) {
                eliminatedIds.current.add(p.id);
                if (!p.deathReason || p.deathReason === 'MOVEMENT') {
                    newLasers.push({ 
                        id: p.id, 
                        target: new THREE.Vector3(p.x, 1, p.z) 
                    });
                    hasNewEliminations = true;
                }
            }
        });

        if (hasNewEliminations) {
            if (newLasers.length > 0) laserSound.play();
            setLasers(prev => [...prev, ...newLasers]);
        }
    });
    
    useEffect(() => {
        if (lasers.length > 0) {
            const timer = setTimeout(() => {
                setLasers([]);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [lasers]);
    
    useEffect(() => {
        const currentEliminatedCount = Object.values(players).filter(p => p.isEliminated).length;
        if (currentEliminatedCount === 0) {
            eliminatedIds.current.clear();
        }
    }, [players]);

    return (
        <>
            {lasers.map((l) => (
                <LaserBeam key={l.id} start={cannonPosition} end={l.target} />
            ))}
        </>
    );
};

const Cannon = ({ z }: { z: number }) => {
    return (
        <group position={[0, 14, z]} rotation={[0.3, 0, 0]}>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[2, 32, 32]} />
                <meshStandardMaterial color="#111" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, -2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.8, 1.2, 5, 16]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, -4.5]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.6, 0.1, 16, 32]} />
                <meshBasicMaterial color="red" />
            </mesh>
             <pointLight distance={10} intensity={2} color="red" position={[0, 0, -5]} />
        </group>
    )
}

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
                    <dodecahedronGeometry args={[obstacle.radius, 1]} />
                    <meshStandardMaterial color="#57534e" roughness={0.9} />
                </mesh>
            </group>
        );
    }

    return (
        <group ref={meshRef} position={[obstacle.x, 0.2, obstacle.z]}>
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[obstacle.radius, obstacle.radius, 0.3, 32]} />
                <meshStandardMaterial color="#999" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh rotation={[0, 0, 0]}>
                 <boxGeometry args={[obstacle.radius * 2.3, 0.4, 0.4]} />
                 <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh rotation={[0, Math.PI/4, 0]}>
                 <boxGeometry args={[obstacle.radius * 2.3, 0.4, 0.4]} />
                 <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh rotation={[0, Math.PI/2, 0]}>
                 <boxGeometry args={[obstacle.radius * 2.3, 0.4, 0.4]} />
                 <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh rotation={[0, Math.PI * 0.75, 0]}>
                 <boxGeometry args={[obstacle.radius * 2.3, 0.4, 0.4]} />
                 <meshStandardMaterial color="#ef4444" />
            </mesh>
        </group>
    );
}

const LegoMan: React.FC<{ color: string }> = ({ color }) => {
    return (
        <group>
            <mesh position={[-0.25, 0.4, 0]} castShadow>
                <boxGeometry args={[0.4, 0.8, 0.4]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0.25, 0.4, 0]} castShadow>
                <boxGeometry args={[0.4, 0.8, 0.4]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0, 1.3, 0]} castShadow>
                <boxGeometry args={[0.9, 1, 0.5]} />
                <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 2.1, 0]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, 0.6, 16]} />
                <meshStandardMaterial color="#facc15" /> 
            </mesh>
        </group>
    )
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
        
        if (meshRef.current.children[0] && meshRef.current.children[0].children[2]) {
             // @ts-ignore
             const material = meshRef.current.children[0].children[2].material;
             if (player.deathReason === 'OBSTACLE') {
                if (material) material.color.set('#880000'); // Кровь
             } else {
                if (material) material.color.set('#000000'); // Ожог
             }
        }

      } else {
         meshRef.current.position.y = 0; 
         meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.05;
      }
    }
  });

  return (
    <group ref={meshRef} position={[player.x, 0, player.z]}>
      <LegoMan color={player.color} />
      
      {/* Маркер "Я" */}
      {isMe && !player.isEliminated && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
               <ringGeometry args={[0.6, 0.8, 32]} />
               <meshBasicMaterial color="#fbbf24" opacity={0.6} transparent />
          </mesh>
      )}

      {/* Никнейм (Поворачивается к камере) */}
      {!player.isEliminated && (
          <Billboard
            position={[0, 3.5, 0]} 
            follow={true}
            lockX={false}
            lockY={false}
            lockZ={false}
          >
            <Text
                fontSize={0.6}
                color={isMe ? "#fbbf24" : "white"} 
                font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="black"
            >
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
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial 
                    color={!isGreen ? "#ef4444" : "#450a0a"} 
                    emissive={!isGreen ? "#ef4444" : "#000000"}
                    emissiveIntensity={!isGreen ? 3 : 0}
                    fog={false} 
                />
            </mesh>
            <mesh position={[3, 0, 0]}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial 
                    color={isGreen ? "#22c55e" : "#052e16"}
                    emissive={isGreen ? "#22c55e" : "#000000"}
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
                fontSize={6} 
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
    const frameTime = useRef(0);
    const TICK_RATE = 1 / 60;
    const { size, camera } = useThree();

    // Use config from state or fallback
    const fieldLength = gameState.config?.fieldLength || 200;
    const fieldWidth = gameState.config?.fieldWidth || 60;

    // ADAPTIVE CAMERA FOR PORTRAIT
    useEffect(() => {
        const isPortrait = size.height > size.width;
        // Cast camera to PerspectiveCamera to access fov
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        
        if (perspectiveCamera.isPerspectiveCamera) {
            if (isPortrait) {
                // Вертикальный режим: камера выше и дальше
                perspectiveCamera.fov = 85; 
            } else {
                perspectiveCamera.fov = 60;
            }
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

    useFrame((state, delta) => {
        const MyPlayer = gameState.players[playerId];
        if (!MyPlayer) return;

        // Слежение камерой (Только если игрок жив)
        if (!MyPlayer.isEliminated && !MyPlayer.hasFinished) {
            const targetZ = MyPlayer.z;
            const isPortrait = size.height > size.width;
            
            // Параметры камеры зависят от ориентации
            const camDist = isPortrait ? 25 : 18;
            const camHeight = isPortrait ? 25 : 15;
            const lookAtOffset = isPortrait ? 15 : 20;

            const targetPos = new THREE.Vector3(0, camHeight, targetZ - camDist);
            state.camera.position.lerp(targetPos, 0.1);
            state.camera.lookAt(0, 0, targetZ + lookAtOffset);
        }

        // Логика движения (только если живы)
        if (!MyPlayer.isEliminated && !MyPlayer.hasFinished) {
            frameTime.current += delta;
            while (frameTime.current >= TICK_RATE) {
                let dx = 0; let dz = 0;
                if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) dz = 1;
                if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) dz = -1;
                if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) dx = 1;
                if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) dx = -1;
                
                if (controlsRef.current.up) dz = 1;
                if (controlsRef.current.down) dz = -1;
                if (controlsRef.current.left) dx = 1;
                if (controlsRef.current.right) dx = -1;

                if (dx !== 0 || dz !== 0) onMove(dx, dz);
                frameTime.current -= TICK_RATE;
            }
        }
    });

    return (
        <>
            <ambientLight intensity={0.8} /> 
            <directionalLight position={[10, 30, 5]} intensity={1.5} castShadow />
            <Environment preset="night" /> 
            <fog attach="fog" args={['#1e1b4b', 10, 100]} />

            <Sparkles count={500} scale={[fieldWidth + 20, 20, fieldLength]} size={2} speed={0.4} opacity={0.5} color="#fbbf24" />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 50]} receiveShadow>
                <planeGeometry args={[fieldWidth + 80, 400]} />
                <meshStandardMaterial color="#1c1917" roughness={0.9} />
            </mesh>
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 50]} receiveShadow>
                <planeGeometry args={[fieldWidth, 400]} />
                <meshStandardMaterial color="#44403c" />
            </mesh>

            <Forest fieldLength={fieldLength} fieldWidth={fieldWidth} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, fieldLength]} receiveShadow>
                <planeGeometry args={[fieldWidth, 2]} />
                <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} />
            </mesh>
            <Text position={[0, 4, fieldLength]} rotation={[0, Math.PI, 0]} fontSize={4} color="#facc15" outlineWidth={0.1} outlineColor="black">
                FINISH
            </Text>

            <TrafficLight light={gameState.light} timeRemaining={gameState.timeRemaining} z={fieldLength + 5} />
            
            <Cannon z={fieldLength + 5} />
            
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
            <Canvas shadows camera={{ fov: 60, position: [0, 8, -10] }} dpr={[1, 1.5]}>
                <GameContent {...props} />
            </Canvas>
        </div>
    );
};