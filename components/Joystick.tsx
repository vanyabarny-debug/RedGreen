import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const joystickRadius = 50; 
  const handleRadius = 25;

  const handleStart = (clientX: number, clientY: number, target: EventTarget) => {
    setActive(true);
  };

  const handleMove = (clientX: number, clientY: number, currentTarget: HTMLElement) => {
    if (!active) return;

    const rect = currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let normalizedX = dx;
    let normalizedY = dy;

    if (distance > joystickRadius) {
      const angle = Math.atan2(dy, dx);
      normalizedX = Math.cos(angle) * joystickRadius;
      normalizedY = Math.sin(angle) * joystickRadius;
    }

    setPosition({ x: normalizedX, y: normalizedY });

    // Нормализация -1..1
    const xInput = normalizedX / joystickRadius;
    const yInput = -(normalizedY / joystickRadius); // Инверсия Y для 3D

    onMove(xInput, yInput);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        {/* Визуальная зона джойстика */}
        <div 
            className="relative w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border border-white/20 touch-none shadow-2xl"
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget)}
            onTouchEnd={handleEnd}
            // Mouse events for testing on PC
            onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.currentTarget)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY, e.currentTarget)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            {/* Ручка джойстика */}
            <div 
                className={`absolute w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg transition-transform duration-75 ${active ? 'scale-95' : 'scale-100'}`}
                style={{
                    left: '50%',
                    top: '50%',
                    marginTop: -32, // половина высоты
                    marginLeft: -32, // половина ширины
                    transform: `translate(${position.x}px, ${position.y}px)`
                }}
            />
        </div>
        <span className="mt-2 text-xs font-bold text-white/50 uppercase tracking-widest pointer-events-none">
            Управление
        </span>
    </div>
  );
};