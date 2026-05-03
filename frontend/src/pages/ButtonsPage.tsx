import { useState, useEffect } from "react";
import EmojiPicker from "../components/EmojiPicker";
import ConfirmModal from "../components/ConfirmModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Button {
  id: string;
  label: string;
  icon?: string;
  interval_hours?: number;
  last_pressed_at?: string;
}

function timeAgo(dateString: string | undefined): string {
  if (!dateString) return "Nunca";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h ${diffMins % 60}min`;
  return `hace ${diffDays} días`;
}

function getButtonStatus(button: Button): {
  bgColor: string;
  textColor: string;
  text: string;
} {
  if (!button.last_pressed_at) {
    return {
      bgColor: "bg-gray-100",
      textColor: "text-gray-600",
      text: "Nunca pulsado",
    };
  }

  const now = new Date();
  const past = new Date(button.last_pressed_at);
  const diffMs = now.getTime() - past.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (!button.interval_hours) {
    return {
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      text: timeAgo(button.last_pressed_at),
    };
  }

  const ratio = diffHours / button.interval_hours;

  if (ratio >= 1) {
    return {
      bgColor: "bg-red-50",
      textColor: "text-red-600",
      text: `¡Pasado! ${timeAgo(button.last_pressed_at)}`,
    };
  } else if (ratio >= 0.75) {
    return {
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
      text: `Próximo ${timeAgo(button.last_pressed_at)}`,
    };
  } else {
    return {
      bgColor: "bg-green-50",
      textColor: "text-green-600",
      text: timeAgo(button.last_pressed_at),
    };
  }
}

export default function ButtonsPage() {
  const [buttons, setButtons] = useState<Button[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("👆");
  const [newInterval, setNewInterval] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    fetchButtons();
    const interval = setInterval(fetchButtons, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchButtons = async () => {
    const res = await fetch(`${API_URL}/api/buttons`);
    const data = await res.json();
    setButtons(data);
  };

  const pressButton = async (id: string) => {
    await fetch(`${API_URL}/api/buttons/${id}/press`, { method: "PATCH" });
    fetchButtons();
  };

  const addButton = async () => {
    if (!newLabel) return;
    await fetch(`${API_URL}/api/buttons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel,
        icon: newIcon,
        interval_hours: newInterval ? parseInt(newInterval) : undefined,
      }),
    });
    setNewLabel("");
    setNewIcon("👆");
    setNewInterval("");
    fetchButtons();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await fetch(`${API_URL}/api/buttons/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchButtons();
  };

  return (
    <div>
      {/* Add button form */}
      <div className="bg-dark-card p-3 md:p-2 rounded-lg shadow mb-4 border border-dark-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Etiqueta (ej: Biberón, Apiretal)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={() => setShowEmojiPicker(true)}
            className="text-3xl p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Elegir icono"
          >
            {newIcon}
          </button>
          <input
            type="number"
            placeholder="Intervalo (h)"
            value={newInterval}
            onChange={(e) => setNewInterval(e.target.value)}
            min="0"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            title="Horas entre recordatorios (opcional)"
          />
          <button
            onClick={addButton}
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition-colors"
          >
            Añadir
          </button>
        </div>
      </div>

      {/* Buttons grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {buttons.map((btn) => {
          const status = getButtonStatus(btn);
          return (
            <div
              key={btn.id}
              className={`p-4 rounded-lg shadow border-2 ${status.bgColor} flex flex-col h-48 bg-dark-card border-dark-border`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{btn.icon}</span>
                  <div>
                    <div className="font-bold text-lg">{btn.label}</div>
                    <div className={`text-sm font-medium ${status.textColor}`}>
                      {status.text}
                    </div>
                    {btn.interval_hours && (
                      <div className="text-xs text-gray-500 mt-1">
                        Cada {btn.interval_hours}h
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(btn.id)}
                  className="text-red-500 hover:text-red-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <button
                onClick={() => pressButton(btn.id)}
                className="w-full py-3 rounded-lg font-medium text-white bg-cyan-600 hover:bg-cyan-700 transition-colors"
              >
                Pulsar
              </button>
            </div>
          );
        })}
      </div>

      {buttons.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No hay recordatorios configurados
        </div>
      )}

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          selectedEmoji={newIcon}
          onSelect={(emoji) => {
            setNewIcon(emoji);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Confirmar borrado"
        message="¿Estás seguro de que quieres borrar este recordatorio?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
