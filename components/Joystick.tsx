import React, { useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  
  // Reduced radius for less screen obstruction
  const joystickRadius = 45; 

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
    
    // X: Inverted to match visual camera orientation (Right drag = Right move)
    const xInput = -(normalizedX / joystickRadius);
    
    // Y: Dragging UP (negative pixels) = Forward (+Z in 3D space)
    const yInput = -(normalizedY / joystickRadius); 

    onMove(xInput, yInput);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 select-none touch-none">
        {/* Joystick Zone - Reduced size */}
        <div 
            className="relative w-32 h-32 rounded-full bg-white/5 backdrop-blur-[2px] border border-white/10 shadow-xl flex items-center justify-center"
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
            <div className="absolute w-1 h-1 bg-white/30 rounded-full" />

            {/* Stick - Reduced size */}
            <div 
                className={`absolute w-12 h-12 rounded-full shadow-lg transition-transform duration-75 border border-white/20
                ${active ? 'bg-emerald-500/80 scale-90' : 'bg-white/10 scale-100'}`}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`
                }}
            >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/30 to-transparent" />
            </div>
        </div>
        <div className="text-center mt-2 text-[8px] text-white/30 font-bold uppercase tracking-widest pointer-events-none">
            MOVE
        </div>
    </div>
  );
};
