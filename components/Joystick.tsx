import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  // Только для тач-устройств
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    setOrigin({ x: clientX, y: clientY });
    setPosition({ x: clientX, y: clientY });
    onMove(0, 0);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active) return;

    const maxDistance = 50; // Радиус джойстика
    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let normalizedX = dx;
    let normalizedY = dy;

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      normalizedX = Math.cos(angle) * maxDistance;
      normalizedY = Math.sin(angle) * maxDistance;
    }

    setPosition({
      x: origin.x + normalizedX,
      y: origin.y + normalizedY
    });

    // Нормализуем значения от -1 до 1
    const xInput = normalizedX / maxDistance;
    let yInput = -(normalizedY / maxDistance); // Инвертируем Y, так как на экране Y растет вниз, а в 3D вверх

    // БЛОКИРОВКА КНОПКИ НАЗАД (если тянем джойстик вниз, скорость 0)
    if (yInput < 0) yInput = 0;

    onMove(xInput, yInput);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  if (!isTouchDevice) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-40 touch-none"
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      {active && (
        <div 
          className="absolute w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/30 pointer-events-none"
          style={{ 
            left: origin.x - 48, 
            top: origin.y - 48 
          }}
        >
          <div 
            className="absolute w-12 h-12 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            style={{
              left: 48 - 24 + (position.x - origin.x),
              top: 48 - 24 + (position.y - origin.y),
            }}
          />
        </div>
      )}
    </div>
  );
};