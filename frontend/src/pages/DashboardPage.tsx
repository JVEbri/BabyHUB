import { useState, useEffect } from "react";
import { API_URL } from "../config";

interface Camera {
  id: string;
  name: string;
  stream_name: string;
  streamUrl?: string;
}

interface SensorReading {
  camera_id: string;
  temperature?: number;
  humidity?: number;
}

interface Button {
  id: string;
  label: string;
  icon?: string;
  interval_hours?: number;
  last_pressed_at?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
}

function timeAgo(dateString: string | undefined): string {
  if (!dateString) return "Nunca";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  return `hace ${Math.floor(diffHours / 24)} dias`;
}

function getButtonStatus(button: Button): { bgColor: string; textColor: string; text: string } {
  if (!button.last_pressed_at) {
    return { bgColor: "bg-gray-500/20", textColor: "text-gray-400", text: "Nunca pulsado" };
  }

  const now = new Date();
  const past = new Date(button.last_pressed_at);
  const diffMs = now.getTime() - past.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (!button.interval_hours) {
    return { bgColor: "bg-blue-500/20", textColor: "text-blue-400", text: timeAgo(button.last_pressed_at) };
  }

  const ratio = diffHours / button.interval_hours;

  if (ratio >= 1) {
    return { bgColor: "bg-red-500/20", textColor: "text-red-400", text: `Pasado! ${timeAgo(button.last_pressed_at)}` };
  } else if (ratio >= 0.75) {
    return { bgColor: "bg-yellow-500/20", textColor: "text-yellow-400", text: `Proximo ${timeAgo(button.last_pressed_at)}` };
  } else {
    return { bgColor: "bg-green-500/20", textColor: "text-green-400", text: timeAgo(button.last_pressed_at) };
  }
}

export default function DashboardPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const fetchAll = async () => {
    try {
      const [camRes, sensorRes, btnRes, invRes] = await Promise.all([
        fetch(`${API_URL}/api/cameras`),
        fetch(`${API_URL}/api/sensor-readings/latest`),
        fetch(`${API_URL}/api/buttons`),
        fetch(`${API_URL}/api/inventory-items`),
      ]);

      const [camerasData, sensorsData, buttonsData, inventoryData] = await Promise.all([
        camRes.json(),
        sensorRes.json(),
        btnRes.json(),
        invRes.json(),
      ]);

      // Fetch stream URLs for all cameras
      const camerasWithStreams = await Promise.all(
        camerasData.map(async (cam: any) => {
          try {
            const streamRes = await fetch(`${API_URL}/api/cameras/${cam.id}/stream-url`);
            const streamData = await streamRes.json();
            return { ...cam, streamUrl: streamData.streamUrl };
          } catch (e) {
            return { ...cam, streamUrl: undefined };
          }
        })
      );

      setCameras(camerasWithStreams);
      setSensorReadings(sensorsData);
      setButtons(buttonsData);
      setInventory(inventoryData);

      // Fetch calendar events for next 2 weeks
      const now = new Date();
      const from = now.toISOString().split('T')[0];
      const toDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const to = toDate.toISOString().split('T')[0];

      const calRes = await fetch(`${API_URL}/api/calendar-events?from=${from}&to=${to}`);
      const calData = await calRes.json();
      setEvents(calData);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const getNextEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter(e => {
        const eventDate = new Date(e.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 5);
  };

  const getExpiringItems = () => {
    return inventory
      .filter(item => item.low_stock_threshold && item.quantity <= item.low_stock_threshold)
      .sort((a, b) => (a.quantity / (a.low_stock_threshold || 1)) - (b.quantity / (b.low_stock_threshold || 1)))
      .slice(0, 5);
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Cargando dashboard...</div>;
  }

  const currentSensor = cameras[currentCameraIndex]
    ? sensorReadings.find(r => r.camera_id === cameras[currentCameraIndex].id)
    : null;

  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto md:overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 h-full">
        {/* Camera Section */}
        <div className="md:col-span-2 bg-black rounded-lg overflow-hidden relative min-h-[250px] md:min-h-0">
          {cameras.length > 0 && cameras[currentCameraIndex]?.streamUrl ? (
            <>
              <iframe
                src={cameras[currentCameraIndex].streamUrl}
                className="w-full h-full border-0 absolute inset-0"
                allow="autoplay; encrypted-media"
              />
              {cameras.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentCameraIndex((prev) => (prev === 0 ? cameras.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10 text-xl"
                  >
                    &larr;
                  </button>
                  <button
                    onClick={() => setCurrentCameraIndex((prev) => (prev === cameras.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10 text-xl"
                  >
                    &rarr;
                  </button>
                </>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-3 py-1 rounded text-sm z-10">
                {cameras[currentCameraIndex]?.name}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              No hay camaras configuradas
            </div>
          )}
        </div>

        {/* Right Column: Compact Info */}
        <div className="flex flex-col gap-2 overflow-y-auto pb-2 md:pb-0 text-dark-text text-xs">
          {/* Sensors Card */}
          <div className="bg-dark-card rounded-lg shadow p-2 border border-dark-border">
            <h4 className="font-bold text-xs mb-1">Sensores</h4>
            {currentSensor ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {currentSensor.temperature !== undefined && (
                  <div className="flex justify-between">
                    <span>Temp:</span>
                    <span className="font-bold">{Number(currentSensor.temperature).toFixed(1)}ºC</span>
                  </div>
                )}
                {currentSensor.humidity !== undefined && (
                  <div className="flex justify-between">
                    <span>Hum:</span>
                    <span className="font-bold">{Number(currentSensor.humidity).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-xs">No hay datos</div>
            )}
          </div>

          {/* Buttons - Compact */}
          <div className="bg-dark-card rounded-lg shadow p-2 border border-dark-border">
            <h4 className="font-bold text-xs mb-1">Recordatorios</h4>
            <div className="grid grid-cols-2 gap-1">
              {buttons.slice(0, 6).map(btn => {
                const status = getButtonStatus(btn);
                return (
                  <div key={btn.id} className={`p-1 rounded border ${status.bgColor} text-[10px]`}>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{btn.icon}</span>
                      <span className="font-medium truncate">{btn.label}</span>
                    </div>
                    <div className={`${status.textColor} text-[10px]`}>{status.text}</div>
                  </div>
                );
              })}
              {buttons.length === 0 && (
                <div className="col-span-2 text-center text-gray-400 text-xs py-2">No hay recordatorios</div>
              )}
            </div>
          </div>

          {/* Calendar Events - Compact */}
          <div className="bg-dark-card rounded-lg shadow p-2 border border-dark-border">
            <h4 className="font-bold text-xs mb-1">Eventos</h4>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {getNextEvents().map(event => (
                <div key={event.id} className="text-xs border-b border-gray-100 pb-1">
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="text-gray-500">
                    {new Date(event.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {event.event_time && ` ${event.event_time.slice(0, 5)}`}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-2">No hay eventos</div>
              )}
            </div>
          </div>

          {/* Inventory - Compact */}
          <div className="bg-dark-card rounded-lg shadow p-2 border border-dark-border">
            <h4 className="font-bold text-xs mb-1">Stock Bajo</h4>
            <div className="space-y-1">
              {getExpiringItems().slice(0, 3).map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="truncate">{item.name}</span>
                  <span className={`font-bold ${item.quantity <= (item.low_stock_threshold || 0) ? 'text-red-600' : 'text-yellow-600'}`}>
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
              {inventory.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-2">No hay stock</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
