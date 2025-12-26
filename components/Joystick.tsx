import React, { useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  
  // Increased radius for better precision on mobile
  const joystickRadius = 60; 

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    setOrigin({ x: clientX, y: clientY });
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active) return;

    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let normalizedX = dx;
    let normalizedY = dy;

    // Clamp to radius
    if (distance > joystickRadius) {
      const angle = Math.atan2(dy, dx);
      normalizedX = Math.cos(angle) * joystickRadius;
      normalizedY = Math.sin(angle) * joystickRadius;
    }

    setPosition({ x: normalizedX, y: normalizedY });

    // OUTPUT CALCULATION
    // X: Left (-1) to Right (1) -> Standard
    // Y: Down (1) to Up (-1) on screen -> needs to be inverted for 3D Forward (Positive Z)
    
    const xInput = normalizedX / joystickRadius;
    
    // IMPORTANT: In our game, Forward is Positive Z.
    // Dragging UP (negative pixel dy) should produce Positive Z.
    // Dragging DOWN (positive pixel dy) should produce Negative Z.
    const yInput = -(normalizedY / joystickRadius); 

    onMove(xInput, yInput);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 select-none touch-none">
        {/* Joystick Zone */}
        <div 
            className="relative w-40 h-40 rounded-full bg-white/5 backdrop-blur-sm border-2 border-white/10 shadow-2xl flex items-center justify-center"
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleEnd}
            // Mouse fallbacks for testing
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => active && handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            {/* Center Decor */}
            <div className="absolute w-2 h-2 bg-white/20 rounded-full" />

            {/* Stick */}
            <div 
                className={`absolute w-16 h-16 rounded-full shadow-lg transition-transform duration-75 
                ${active ? 'bg-emerald-500 scale-90' : 'bg-white/20 scale-100'}`}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`
                }}
            >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/40 to-transparent" />
            </div>
        </div>
        <div className="text-center mt-4 text-[10px] text-white/40 font-bold uppercase tracking-widest">
            ДЖОЙСТИК
        </div>
    </div>
  );
};
