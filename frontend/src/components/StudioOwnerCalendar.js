import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, addHours } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Trash2, Loader, Calendar as CalIcon, Lock, Unlock } from 'lucide-react';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'tr': tr };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StudioOwnerCalendar = ({ studio, token }) => {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ start: '', end: '', reason: 'Bakım / Kapalı' });
  const [blocking, setBlocking] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const res = await axios.get(`${API}/studios/${studio.id}/calendar?year=${year}&month=${month}`);
      setEvents((res.data.events || []).map(ev => ({
        ...ev,
        start: typeof ev.start === 'string' ? parseISO(ev.start) : new Date(ev.start),
        end: typeof ev.end === 'string' ? parseISO(ev.end) : new Date(ev.end),
      })));
    } catch {} finally { setLoading(false); }
  }, [studio.id, currentDate]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const eventPropGetter = (event) => ({
    style: {
      background: event.type === 'booked' ? '#8b5cf6' : event.type === 'blocked' ? '#374151' : '#6b7280',
      border: 'none',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#fff',
      cursor: event.type === 'blocked' ? 'pointer' : 'default',
    }
  });

  const handleSelectSlot = ({ start, end }) => {
    const startStr = format(start, "yyyy-MM-dd'T'HH:mm");
    const endStr = format(end, "yyyy-MM-dd'T'HH:mm");
    setBlockForm({ start: startStr, end: endStr, reason: 'Bakım / Kapalı' });
    setShowBlockModal(true);
  };

  const handleSelectEvent = (event) => {
    if (event.type === 'blocked') setSelectedEvent(event);
  };

  const handleBlock = async (e) => {
    e.preventDefault();
    setBlocking(true);
    try {
      await axios.post(`${API}/studios/block`, {
        studio_id: studio.id,
        start_datetime: new Date(blockForm.start).toISOString(),
        end_datetime: new Date(blockForm.end).toISOString(),
        reason: blockForm.reason,
      }, { headers, withCredentials: true });
      setShowBlockModal(false);
      fetchCalendar();
    } catch (err) {
      alert(err.response?.data?.detail || 'Blok eklenemedi');
    } finally { setBlocking(false); }
  };

  const handleUnblock = async (eventId) => {
    try {
      await axios.delete(`${API}/studios/block/${eventId}`, { headers, withCredentials: true });
      setSelectedEvent(null);
      fetchCalendar();
    } catch (err) {
      alert(err.response?.data?.detail || 'Blok kaldırılamadı');
    }
  };

  const totalBookings = events.filter(e => e.type === 'booked').length;
  const totalBlocked = events.filter(e => e.type === 'blocked').length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rs-card p-3 text-center">
          <p className="text-xl font-bold text-[#8b5cf6]">{totalBookings}</p>
          <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Bu Ay Rezervasyon</p>
        </div>
        <div className="rs-card p-3 text-center">
          <p className="text-xl font-bold text-[#374151]">{totalBlocked}</p>
          <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Kapalı Slot</p>
        </div>
        <div className="rs-card p-3 text-center">
          <p className="text-xl font-bold text-[#10b981]">
            {events.filter(e => e.type === 'booked').reduce((acc, e) => {
              const h = (e.end - e.start) / (1000 * 60 * 60);
              return acc + h;
            }, 0).toFixed(0)}h
          </p>
          <p className="text-[10px] font-mono uppercase text-[#a1a1aa]">Toplam Kiralama</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => { setBlockForm({ start: format(new Date(), "yyyy-MM-dd'T'HH:mm"), end: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"), reason: 'Bakım / Kapalı' }); setShowBlockModal(true); }}
          className="flex items-center gap-2 text-xs bg-[#374151] hover:bg-[#4b5563] text-white px-3 py-2 rounded-md transition-colors"
          data-testid="add-block-btn"
        >
          <Lock size={12} /> Slot Kapat
        </button>
        <p className="text-xs text-[#a1a1aa] ml-auto">Takvimde slot seçerek de kapatabilirsiniz</p>
      </div>

      {/* Calendar */}
      <div className="rounded-xl overflow-hidden border border-white/8">
        {loading ? (
          <div className="flex items-center justify-center h-80"><Loader size={24} className="text-[#8b5cf6] animate-spin" /></div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 480, background: 'transparent' }}
            culture="tr"
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            min={new Date(0, 0, 0, 8, 0, 0)}
            max={new Date(0, 0, 0, 23, 0, 0)}
            step={60}
            timeslots={1}
            messages={{
              allDay: 'Tam Gün', previous: '‹', next: '›', today: 'Bugün',
              month: 'Ay', week: 'Hafta', day: 'Gün',
            }}
          />
        )}
      </div>

      {/* Selected blocked event actions */}
      {selectedEvent && selectedEvent.type === 'blocked' && (
        <div className="mt-4 rs-card p-4 flex items-center justify-between border-[#374151]/50">
          <div>
            <p className="text-sm font-medium text-white">{selectedEvent.title}</p>
            <p className="text-xs text-[#a1a1aa]">
              {format(selectedEvent.start, 'dd/MM HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleUnblock(selectedEvent.id)}
              className="flex items-center gap-1.5 text-xs text-[#10b981] border border-[#10b981]/20 px-3 py-2 rounded-md hover:bg-[#10b981]/10 transition-colors"
              data-testid="unblock-btn">
              <Unlock size={12} /> Bloku Kaldır
            </button>
            <button onClick={() => setSelectedEvent(null)} className="text-xs text-[#a1a1aa] hover:text-white px-2 py-2 transition-colors">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141416] border border-white/10 rounded-xl p-6 w-full max-w-sm mx-4" data-testid="block-modal">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Lock size={16} className="text-[#6b7280]" /> Slot Kapat</h3>
            <form onSubmit={handleBlock} className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Başlangıç</label>
                <input type="datetime-local" value={blockForm.start} onChange={e => setBlockForm(f => ({ ...f, start: e.target.value }))}
                  className="rs-input text-sm h-9" required />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Bitiş</label>
                <input type="datetime-local" value={blockForm.end} onChange={e => setBlockForm(f => ({ ...f, end: e.target.value }))}
                  className="rs-input text-sm h-9" required />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Sebep</label>
                <input type="text" value={blockForm.reason} onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))}
                  className="rs-input text-sm h-9" placeholder="Bakım, Kapalı, Kişisel..." />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowBlockModal(false)} className="flex-1 border border-white/10 text-[#a1a1aa] py-2 rounded-md text-sm">İptal</button>
                <button type="submit" disabled={blocking}
                  className="flex-1 bg-[#374151] hover:bg-[#4b5563] text-white py-2 rounded-md text-sm flex items-center justify-center gap-2">
                  {blocking ? <Loader size={12} className="animate-spin" /> : <><Lock size={12} /> Kapat</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioOwnerCalendar;
