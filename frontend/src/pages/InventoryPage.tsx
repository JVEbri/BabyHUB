import { useState, useEffect } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { API_URL } from "../config";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch(`${API_URL}/api/inventory-items`);
    const data = await res.json();
    setItems(data);
  };

  const addItem = async () => {
    if (!newName || !newQty) return;
    await fetch(`${API_URL}/api/inventory-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        quantity: parseInt(newQty),
        unit: "pcs",
        lowStockThreshold: newThreshold ? parseInt(newThreshold) : null,
      }),
    });
    setNewName("");
    setNewQty("");
    setNewThreshold("");
    fetchItems();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await fetch(`${API_URL}/api/inventory-items/${deleteId}`, {
      method: "DELETE",
    });
    setDeleteId(null);
    fetchItems();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch(`${API_URL}/api/inventory-items/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: parseInt(editQty) }),
    });
    setEditingId(null);
    fetchItems();
  };

  const updateStock = async (id: string, delta: number) => {
    const res = await fetch(`${API_URL}/api/inventory-items/${id}`);
    const item = await res.json();
    const newQty = item.quantity + delta;
    if (newQty < 0) return;

    await fetch(`${API_URL}/api/inventory-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
    fetchItems();
  };

  return (
    <div>
      {/* Add item form */}
      <div className="bg-dark-card p-3 md:p-2 rounded-lg shadow mb-4 border border-dark-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Nombre"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-800"
          />
           <input
             type="number"
             placeholder="Cantidad"
             value={newQty}
             onChange={(e) => setNewQty(e.target.value)}
             className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900"
           />
          <input
            type="number"
            placeholder="Aviso stock bajo (opcional)"
            value={newThreshold}
            onChange={(e) => setNewThreshold(e.target.value)}
            className="border text-black border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={addItem}
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition-colors"
          >
            Añadir
          </button>
        </div>
      </div>

      {/* Items table - scrollable on mobile */}
      <div className="bg-dark-card rounded-lg shadow overflow-hidden overflow-x-auto border border-dark-border">
        <table className="w-full min-w-96">
          <thead className="bg-cyan-50 border-b border-cyan-100">
            <tr>
              <th className="text-left p-4 font-bold text-cyan-800">Nombre</th>
              <th className="text-center p-4 font-bold text-cyan-800">
                Cantidad
              </th>
              <th className="text-center p-4 font-bold text-cyan-800">
                Estado
              </th>
              <th className="text-right p-4 font-bold text-cyan-800">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="p-4">
                  <span className="font-medium">{item.name}</span>
                  {item.low_stock_threshold &&
                    item.quantity <= item.low_stock_threshold && (
                      <span className="ml-2 text-red-500 text-sm">
                        ⚠️ Stock bajo
                      </span>
                    )}
                </td>
                <td className="p-4 text-center">
                  {editingId === item.id ? (
                    <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-gray-900"
                        />
                      <button
                        onClick={saveEdit}
                        className="text-cyan-600 text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 text-sm"
                      >
                        ✗
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => updateStock(item.id, -1)}
                        className="bg-red-900/50 text-red-400 px-3 py-1 rounded hover:bg-red-900 transition-colors text-sm"
                      >
                        -1
                      </button>
                      <span
                        className={`font-bold text-lg ${item.low_stock_threshold && item.quantity <= item.low_stock_threshold ? "text-red-400" : "text-cyan-400"}`}
                      >
                        {item.quantity}{" "}
                        <span className="text-sm font-normal text-gray-400">
                          pcs
                        </span>
                      </span>
                      <button
                        onClick={() => updateStock(item.id, 1)}
                        className="bg-green-900/50 text-green-400 px-3 py-1 rounded hover:bg-green-900 transition-colors text-sm"
                      >
                        +1
                      </button>
                    </div>
                  )}
                </td>
                <td className="p-4 text-center">
                  {item.low_stock_threshold &&
                  item.quantity <= item.low_stock_threshold ? (
                    <span className="text-red-500 text-sm font-medium">
                      ⚠️ Bajo
                    </span>
                  ) : (
                    <span className="text-green-600 text-sm">✅ OK</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Confirmar borrado"
        message="¿Estás seguro de que quieres borrar este elemento?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
