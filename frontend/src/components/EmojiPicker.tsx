import { useState, useRef, useEffect } from "react";

interface EmojiData {
  emoji: string;
  name: string;
  keywords: string[];
}

// Predefined baby/child related emojis with search keywords
const BABY_EMOJIS: EmojiData[] = [
  { emoji: "👶", name: "baby", keywords: ["baby", "bebe", "niño", "nino", "recien"] },
  { emoji: "🍼", name: "biberon", keywords: ["biberon", "bibe", "beron", "botella", "leche", "feeding"] },
  { emoji: "🧸", name: "teddy", keywords: ["oso", "oso de peluche", "teddy", "juguete", "toy"] },
  { emoji: "🎨", name: "art", keywords: ["arte", "pintar", "dibujar", "colors", "colores"] },
  { emoji: "🛁", name: "bath", keywords: ["baño", "bano", "ducha", "bath", "wash"] },
  { emoji: "💤", name: "sleep", keywords: ["dormir", "sueño", "sueno", "nap", "siesta", "sleep"] },
  { emoji: "🍎", name: "apple", keywords: ["manzana", "fruta", "fruit", "comida", "food"] },
  { emoji: "🥛", name: "milk", keywords: ["leche", "milk", "vaso", "bebida", "drink"] },
  { emoji: "🧷", name: "clip", keywords: ["clip", "pin", "suje"] },
  { emoji: "🎵", name: "music", keywords: ["musica", "musica", "canción", "cancion", "song", "lullaby"] },
  { emoji: "📖", name: "book", keywords: ["libro", "leer", "story", "cuento", "lectura"] },
  { emoji: "🎮", name: "game", keywords: ["juego", "game", "play", "divertir", "fun"] },
  { emoji: "🚼", name: "baby symbol", keywords: ["baby", "bebe", "simbolo", "symbol"] },
  { emoji: "👣", name: "footprints", keywords: ["huellas", "pies", "foot", "baby feet"] },
  { emoji: "🎀", name: "ribbon", keywords: ["lazo", "ribbon", "cinta", "bow"] },
  { emoji: "🧦", name: "socks", keywords: ["calcetines", "socks", "pies", "feet"] },
  { emoji: "👟", name: "shoes", keywords: ["zapatos", "shoes", "calzado", "footwear"] },
  { emoji: "🧤", name: "gloves", keywords: ["guantes", "gloves", "manos", "hands"] },
  { emoji: "🎈", name: "balloon", keywords: ["globo", "balloon", "fiesta", "party"] },
  { emoji: "🎂", name: "cake", keywords: ["pastel", "cake", "cumpleaños", "birthday", "fiesta"] },
  { emoji: "🏥", name: "hospital", keywords: ["medico", "medico", "doctor", "hospital", "salud", "health"] },
  { emoji: "💊", name: "pill", keywords: ["medicina", "medicine", "pastilla", "pill", "dosis"] },
  { emoji: "🌡️", name: "thermometer", keywords: ["temperatura", "fiebre", "fever", "thermometer", "temp"] },
  { emoji: "🧴", name: "lotion", keywords: ["crema", "lotion", "cream", "skin", "piel"] },
  { emoji: "🪥", name: "toothbrush", keywords: ["cepillo", "dientes", "teeth", "brush", "dental"] },
  { emoji: "🚽", name: "toilet", keywords: ["baño", "bano", "toilet", "potty", "wc"] },
  { emoji: "👶🏻", name: "baby light", keywords: ["baby", "bebe", "light", "claro"] },
  { emoji: "👶🏼", name: "baby medium-light", keywords: ["baby", "bebe", "medium"] },
  { emoji: "👶🏽", name: "baby medium", keywords: ["baby", "bebe", "medium"] },
  { emoji: "👶🏾", name: "baby medium-dark", keywords: ["baby", "bebe", "dark"] },
  { emoji: "👶🏿", name: "baby dark", keywords: ["baby", "bebe", "dark"] },
  { emoji: "🎠", name: "carousel", keywords: ["carusel", "caballos", "horses", "carousel", "fun"] },
  { emoji: "🧩", name: "puzzle", keywords: ["puzzle", "rompecabezas", "juego", "game"] },
  { emoji: "🪆", name: "nesting dolls", keywords: ["matrioska", "dolls", "muñecas", "juguete"] },
  { emoji: "🎪", name: "circus", keywords: ["circo", "circus", "fiesta", "party", "fun"] },
  { emoji: "🎭", name: "masks", keywords: ["mascaras", "masks", "teatro", "theater"] },
  { emoji: "🎨", name: "art", keywords: ["arte", "pintar", "colors", "colores"] },
  { emoji: "🎯", name: "target", keywords: ["diana", "target", "juego", "game", "aim"] },
  { emoji: "🪀", name: "yo-yo", keywords: ["yoyo", "juguete", "toy"] },
  { emoji: "🧲", name: "magnet", keywords: ["iman", "magnet", "science", "ciencia"] },
];

interface EmojiPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ selectedEmoji, onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  const filteredEmojis = BABY_EMOJIS.filter(e => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(searchLower) ||
      e.keywords.some(k => k.toLowerCase().includes(searchLower)) ||
      e.emoji.includes(search)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[70]">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg mx-auto shadow-xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">Elegir icono</h3>
            <button onClick={onClose} className="text-gray-500 text-2xl leading-none">×</button>
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar por nombre... (ej: bibe, sueño, leche)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
            {filteredEmojis.map((item) => (
              <button
                key={item.emoji}
                onClick={() => {
                  onSelect(item.emoji);
                  onClose();
                }}
                className={`text-3xl p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  selectedEmoji === item.emoji ? 'bg-cyan-100 ring-2 ring-cyan-500' : ''
                }`}
                title={item.name}
              >
                {item.emoji}
              </button>
            ))}
          </div>
          {filteredEmojis.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No se encontraron iconos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
