import { useState, useRef } from "react";

interface PTZPadProps {
  onDirection: (direction: string, action: 'start' | 'stop') => void;
}

interface WedgeProps {
  path: string;
  direction: string;
  active: string | null;
  symbol: string;
  symbolX: number;
  symbolY: number;
  onStart: (dir: string) => void;
  onStop: (dir: string) => void;
}

function Wedge({ path, direction, active, symbol, symbolX, symbolY, onStart, onStop }: WedgeProps) {
  const isActive = active === direction;
  const fillClass = isActive ? 'fill-blue-600' : 'fill-gray-700 hover:fill-gray-600';
  const mouseDownRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    mouseDownRef.current = true;
    onStart(direction);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    mouseDownRef.current = false;
    onStop(direction);
  };

  return (
    <>
      <path
        d={path}
        className={`cursor-pointer transition-colors ${fillClass}`}
        onMouseDown={() => {
          mouseDownRef.current = true;
          onStart(direction);
        }}
        onMouseUp={() => {
          if (mouseDownRef.current) {
            mouseDownRef.current = false;
            onStop(direction);
          }
        }}
        onMouseLeave={() => {
          if (mouseDownRef.current) {
            mouseDownRef.current = false;
            onStop(direction);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      <text
        x={symbolX}
        y={symbolY}
        textAnchor="middle"
        fill="white"
        fontSize="8"
        fontWeight="bold"
        className="pointer-events-none"
      >
        {symbol}
      </text>
    </>
  );
}

const WEDGES = [
  { direction: 'up', path: 'M50 50 L25 25 Q50 15 75 25 Z', symbol: '▲', x: 50, y: 32 },
  { direction: 'right', path: 'M50 50 L75 25 Q85 50 75 75 Z', symbol: '▶', x: 68, y: 52 },
  { direction: 'down', path: 'M50 50 L75 75 Q50 85 25 75 Z', symbol: '▼', x: 50, y: 72 },
  { direction: 'left', path: 'M50 50 L25 75 Q15 50 25 25 Z', symbol: '◀', x: 32, y: 52 },
];

export default function PTZPad({ onDirection }: PTZPadProps) {
  const [active, setActive] = useState<string | null>(null);

  const handleStart = (dir: string) => {
    setActive(dir);
    onDirection(dir, 'start');
  };

  const handleStop = (dir: string) => {
    setActive(null);
    onDirection(dir, 'stop');
  };

  return (
    <div className="relative w-48 h-48 mx-auto select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {WEDGES.map((w) => (
          <Wedge
            key={w.direction}
            path={w.path}
            direction={w.direction}
            active={active}
            symbol={w.symbol}
            symbolX={w.x}
            symbolY={w.y}
            onStart={handleStart}
            onStop={handleStop}
          />
        ))}
        <circle cx="50" cy="50" r="12" fill="gray" opacity="0.5" />
      </svg>
    </div>
  );
}
