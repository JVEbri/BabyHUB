import { useState, useEffect, useRef } from "react";
import PTZPad from "../components/PTZPad";
import SensorOverlay from "../components/SensorOverlay";
import { API_URL } from "../config";

interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  stream_name: string;
}

interface SensorReading {
  temperature?: number;
  humidity?: number;
}

export default function CameraPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [sensorReading, setSensorReading] = useState<SensorReading | null>(null);
  const [volume, setVolume] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load cameras on mount
  useEffect(() => {
    fetchCameras();
  }, []);

  // Auto-select first camera
  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras]);

  // Load stream URL and sensors when camera changes
  useEffect(() => {
    if (selectedCamera) {
      fetchStreamUrl(selectedCamera.id);
      fetchSensors();
    }
  }, [selectedCamera]);

  // WebSocket for real-time volume updates
  useEffect(() => {
    if (!streamUrl) return;

    // Use the same logic as API_URL to determine the host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host;
    if (import.meta.env.VITE_API_URL) {
      try {
        host = new URL(import.meta.env.VITE_API_URL).hostname;
      } catch (e) {
        host = window.location.hostname;
      }
    } else if (import.meta.env.DEV) {
      host = 'localhost';
    } else {
      host = window.location.hostname;
    }
    const wsUrl = `${protocol}//${host}:9002`;
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.volume !== undefined) {
          setVolume(data.volume);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [streamUrl]);

  // Poll sensors every 30 seconds
  useEffect(() => {
    if (!selectedCamera) return;
    const interval = setInterval(fetchSensors, 30000);
    return () => clearInterval(interval);
  }, [selectedCamera]);

  const fetchCameras = async () => {
    const res = await fetch(`${API_URL}/api/cameras`);
    const data = await res.json();
    setCameras(data);
    if (data.length > 0 && !selectedCamera) setSelectedCamera(data[0]);
  };

  const fetchStreamUrl = async (id: string) => {
    const res = await fetch(`${API_URL}/api/cameras/${id}/stream-url`);
    const data = await res.json();
    setStreamUrl(data.streamUrl);
  };

  const fetchSensors = async () => {
    const res = await fetch(`${API_URL}/api/sensor-readings/latest`);
    const data = await res.json();
    const readings = data.value || data;
    const cameraId = selectedCamera?.id;
    const reading = readings.find((r: any) => r.camera_id === cameraId);
    
    if (reading) {
      setSensorReading({
        temperature: reading.temperature ? Number(reading.temperature) : undefined,
        humidity: reading.humidity ? Number(reading.humidity) : undefined
      });
    } else {
      setSensorReading(null);
    }
  };

  const moveCamera = (id: string, direction: string, action: 'start' | 'stop') => {
    fetch(`${API_URL}/api/cameras/${id}/ptz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, action })
    }).catch(console.error);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
      
      // Force styles in fullscreen
      if (isFS && containerRef.current) {
        containerRef.current.style.width = '100vw';
        containerRef.current.style.height = '100vh';
        containerRef.current.style.maxWidth = 'none';
        containerRef.current.style.borderRadius = '0';
        containerRef.current.style.padding = '0';
      } else if (containerRef.current) {
        containerRef.current.style.width = '';
        containerRef.current.style.height = '';
        containerRef.current.style.maxWidth = '';
        containerRef.current.style.borderRadius = '';
        containerRef.current.style.padding = '';
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
        {/* Camera list */}
        <div className="md:col-span-1 bg-white p-3 md:p-4 rounded-lg shadow">
          <h3 className="font-bold mb-2 text-sm md:text-base">Cámaras</h3>
          {cameras.map((cam) => (
            <div
              key={cam.id}
              onClick={() => setSelectedCamera(cam)}
              className={`p-2 cursor-pointer rounded mb-1 text-sm md:text-base ${
                selectedCamera?.id === cam.id ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              {cam.name}
            </div>
          ))}
        </div>

        {/* Video and controls */}
        <div className="md:col-span-3 bg-white p-2 md:p-4 rounded-lg shadow relative" ref={containerRef}>
          {streamUrl && selectedCamera ? (
            <>
              <div className="relative bg-black aspect-video rounded overflow-hidden">
                <iframe
                  src={streamUrl}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                />
                
                <SensorOverlay 
                  temperature={sensorReading?.temperature}
                  humidity={sensorReading?.humidity}
                  volume={volume}
                  isFullscreen={isFullscreen}
                />

                {/* Fullscreen button - top right */}
                <button
                  onClick={toggleFullscreen}
                  className="absolute top-2 right-2 md:top-4 md:right-4 bg-cyan-600/70 text-white p-1 md:p-2 rounded hover:bg-cyan-700/90 transition-colors text-sm md:text-base"
                  title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                  {isFullscreen ? '⬇️' : '⛶'}
                </button>
              </div>

              {/* PTZ Controls - smaller on mobile */}
              <div className="mt-2 md:mt-4 flex justify-center scale-75 md:scale-100 origin-top">
                <PTZPad onDirection={(dir, action) => moveCamera(selectedCamera.id, dir, action)} />
              </div>
            </>
          ) : (
            <div className="text-center py-10 md:py-20 text-gray-400 text-sm md:text-base">
              Selecciona una cámara
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
