interface SensorOverlayProps {
  temperature?: number;
  humidity?: number;
  volume: number;
  isFullscreen: boolean;
}

export default function SensorOverlay({ temperature, humidity, volume, isFullscreen }: SensorOverlayProps) {
  return (
    <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-transparent p-1 md:p-2 rounded text-lg pointer-events-none ${
      isFullscreen ? '!left-2 !top-2 md:!left-4 md:!top-4' : ''
    }`}>
      <div className="flex flex-col gap-2 md:gap-3">
        {/* Temperature */}
        {temperature !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-white font-bold drop-shadow-lg text-xs md:text-sm border-b border-white/50 pb-1">🌡️ {temperature}°C</span>
          </div>
        )}
        
        {/* Humidity */}
        {humidity !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-white font-bold drop-shadow-lg text-xs md:text-sm border-b border-white/50 pb-1">💧 {humidity}%</span>
          </div>
        )}

        {/* Volume meter - vertical, below sensors */}
        <div className="flex flex-col items-center gap-1 mt-1 md:mt-2">
          <div className="text-xs text-white font-bold drop-shadow-lg">{Math.round(volume)}%</div>
          <div className="w-6 md:w-8 h-16 md:h-24 bg-black/50 rounded-full overflow-hidden relative border-2 border-cyan-400/70">
            <div 
              className={`absolute bottom-0 w-full rounded-full transition-all duration-100 ${
                volume > 70 ? 'bg-red-500' :
                volume > 40 ? 'bg-yellow-500' : 'bg-cyan-500'
              }`}
              style={{ height: `${Math.min(100, volume)}%` }}
            />
            <div className="absolute inset-0 flex flex-col justify-between py-1 px-1">
              <div className="w-full h-px bg-white/30"></div>
              <div className="w-full h-px bg-white/30"></div>
              <div className="w-full h-px bg-white/30"></div>
            </div>
          </div>
          <span className="text-xs md:text-sm">🔊</span>
        </div>
      </div>
    </div>
  );
}
