import { useState, useEffect } from "react";
import { API_URL } from "../config";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  details?: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDayModal, setShowDayModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [newTitle, setNewTitle] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const res = await fetch(`${API_URL}/api/calendar-events?from=${from}&to=${to}`);
    const data = await res.json();
    setEvents(data);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDetails("");
    setSelectedTime("09:00");
    setEditId(null);
    setShowForm(false);
  };

  const saveEvent = async () => {
    if (!newTitle || !selectedDate) return;
    
    const body = {
      title: newTitle,
      event_date: selectedDate,
      event_time: selectedTime || undefined,
      details: newDetails || undefined,
    };

    if (editId) {
      await fetch(`${API_URL}/api/calendar-events/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`${API_URL}/api/calendar-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    resetForm();
    fetchEvents();
  };

  const startEdit = (event: CalendarEvent) => {
    setEditId(event.id);
    setNewTitle(event.title);
    setSelectedDate(event.event_date.slice(0, 10));
    setSelectedTime(event.event_time ? event.event_time.slice(0, 5) : "09:00");
    setNewDetails(event.details || "");
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await fetch(`${API_URL}/api/calendar-events/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchEvents();
    openDayModal(selectedDate, getEventsForDate(selectedDate));
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => e.event_date.slice(0, 10) === dateStr);
  };

  const openDayModal = (dateStr: string, eventsForDay: CalendarEvent[]) => {
    setSelectedDate(dateStr);
    setDayEvents(eventsForDay);
    setShowDayModal(true);
    resetForm();
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const eventsForDay = getEventsForDate(dateStr);
    openDayModal(dateStr, eventsForDay);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const headers = dayNames.map(day => (
      <div key={day} className="p-2 text-center font-bold text-cyan-800 text-sm">
        {day}
      </div>
    ));

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50 min-h-20 md:min-h-24"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.event_date.slice(0, 10) === dateStr);
      const isToday = today.getDate() === day && 
                       today.getMonth() === currentDate.getMonth() && 
                       today.getFullYear() === currentDate.getFullYear();
      const isPast = dateStr < todayStr;
      
      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`min-h-20 md:min-h-24 p-1 border border-gray-200 cursor-pointer hover:bg-cyan-50 transition-colors ${
            isToday ? 'ring-2 ring-cyan-500 bg-cyan-50' : isPast ? 'bg-gray-300' : 'bg-white'
          }`}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-cyan-700' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-0.5">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={`text-xs p-0.5 rounded truncate ${isPast ? 'bg-gray-400 text-gray-500' : 'bg-cyan-100 text-cyan-800'}`}
              >
                {event.event_time && (
                  <span className="font-bold">{event.event_time.slice(0, 5)} </span>
                )}
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 pl-1">
                +{dayEvents.length - 2} más
              </div>
            )}
          </div>
        </div>
      );
    }

    return { headers, days };
  };

  const { headers, days } = renderCalendar();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  const formattedDate = selectedDate 
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div>
      <div className="flex justify-between items-center mb-4 text-dark-text">
        <h2 className="text-xl md:text-2xl font-bold text-cyan-700">Calendario</h2>
      </div>

      {/* Month navigation */}
      <div className="flex justify-between items-center mb-4 bg-dark-card p-3 rounded-lg shadow border border-dark-border">
        <button onClick={prevMonth} className="text-cyan-600 hover:text-cyan-800 text-xl px-2">←</button>
        <h3 className="text-lg font-bold text-cyan-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button onClick={nextMonth} className="text-cyan-600 hover:text-cyan-800 text-xl px-2">→</button>
      </div>

      {/* Calendar grid */}
      <div className="bg-dark-card rounded-lg shadow overflow-hidden border border-dark-border">
        <div className="grid grid-cols-7 bg-dark-card border-b border-dark-border">
          {headers}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>

      {/* Day modal - shows events for that day + add new */}
      {showDayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:pt-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg mx-auto shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 md:rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-cyan-800 capitalize">
                  {formattedDate}
                </h3>
                <button
                  onClick={() => {
                    setShowDayModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Add new event button */}
              <button
                onClick={() => {
                  setSelectedDate(selectedDate);
                  setShowForm(true);
                  setEditId(null);
                  setNewTitle("");
                  setNewDetails("");
                  setSelectedTime("09:00");
                }}
                className="w-full bg-cyan-600 text-white py-3 rounded-lg hover:bg-cyan-700 transition-colors font-medium"
              >
                + Añadir evento
              </button>

              {/* Existing events */}
              {dayEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700 text-sm">Eventos del día:</h4>
                  {dayEvents.map(event => {
                    const isPastEvent = event.event_date.slice(0, 10) < todayStr;
                    return (
                    <div key={event.id} className={`p-3 rounded-lg ${isPastEvent ? 'bg-gray-100' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className={`font-medium ${isPastEvent ? 'text-gray-500' : 'text-gray-800'}`}>
                            {event.event_time && (
                              <span className={isPastEvent ? 'text-gray-400 font-bold' : 'text-cyan-600 font-bold'}>{event.event_time.slice(0, 5)} </span>
                            )}
                            {event.title}
                          </div>
                          {event.details && (
                            <div className={`text-sm mt-1 ${isPastEvent ? 'text-gray-400' : 'text-gray-600'}`}>{event.details}</div>
                          )}
                        </div>
                        {!isPastEvent && (
                        <div className="flex gap-3 ml-2">
                          <button
                            onClick={() => startEdit(event)}
                            className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteId(event.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Borrar
                          </button>
                        </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {dayEvents.length === 0 && !showForm && (
                <div className="text-center text-gray-500 py-4">
                  No hay eventos para este día
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit event form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] md:pt-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md mx-auto shadow-xl p-6">
            <h3 className="text-lg font-bold mb-4">
              {editId ? 'Editar evento' : 'Nuevo evento'}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Título (ej: Cita pediatra)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <input
                type="text"
                placeholder="Detalles (opcional)"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setNewTitle("");
                  setNewDetails("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEvent}
                className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-2">Confirmar borrado</h3>
            <p className="text-gray-600 mb-6">¿Estás seguro de que quieres borrar este evento?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
