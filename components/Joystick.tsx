import React, { useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  
  // Radius for mobile optimization
  const joystickRadius = 35; 

  const handleStart = (e: React.TouchEvent | React.MouseEvent, clientX: number, clientY: number) => {
    // CRITICAL for iOS: Prevent browser scrolling/gestures
    if(e.cancelable && e.type === 'touchstart') e.preventDefault();
    e.stopPropagation();

    setActive(true);
    setOrigin({ x: clientX, y: clientY });
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent, clientX: number, clientY: number) => {
    if (!active) return;
    
    // CRITICAL for iOS
    if(e.cancelable && e.type === 'touchmove') e.preventDefault();
    e.stopPropagation();

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
    const xInput = -(normalizedX / joystickRadius);
    const yInput = -(normalizedY / joystickRadius); 

    onMove(xInput, yInput);
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if(e.cancelable && e.type === 'touchend') e.preventDefault();
    e.stopPropagation();
    
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    // Fixed container to prevent any layout shifts
    <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[9999] select-none touch-none">
        <div 
            className="relative w-20 h-20 md:w-32 md:h-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl flex items-center justify-center"
            // Attach event handlers explicitly
            onTouchStart={(e) => handleStart(e, e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleMove(e, e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleEnd}
            
            onMouseDown={(e) => handleStart(e, e.clientX, e.clientY)}
            onMouseMove={(e) => active && handleMove(e, e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            {/* Center Decor */}
            <div className="absolute w-1.5 h-1.5 bg-white/40 rounded-full" />

            {/* Stick */}
            <div 
                className={`absolute w-8 h-8 md:w-12 md:h-12 rounded-full shadow-lg transition-transform duration-75 border border-white/30
                ${active ? 'bg-emerald-500 scale-95' : 'bg-white/20 scale-100'}`}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`
                }}
            >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/40 to-transparent" />
            </div>
        </div>
    </div>
  );
};
