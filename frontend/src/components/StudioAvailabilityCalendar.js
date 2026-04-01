import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours, startOfHour, differenceInHours, isAfter, isBefore, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Shield, Clock, ChevronLeft, ChevronRight, Info, Check, Loader } from 'lucide-react';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'tr': tr };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EVENT_STYLES = {
  booked:   { background: '#ef4444', color: '#fff', border: '1px solid #dc2626' },
  blocked:  { background: '#374151', color: '#9ca3af', border: '1px solid #4b5563' },
  selected: { background: '#10b981', color: '#fff', border: '2px solid #059669', boxShadow: '0 0 10px rgba(16,185,129,0.4)' },
};

const StudioAvailabilityCalendar = ({ studio, token, onBookingComplete }) => {
  const [events, setEvents] = useState([]);
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(Views.WEEK);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [requirements, setRequirements] = useState('');

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const res = await axios.get(`${API}/studios/${studio.id}/calendar?year=${year}&month=${month}`);
      const calEvents = (res.data.events || []).map(ev => ({
        id: ev.id,
        title: ev.title,
        start: typeof ev.start === 'string' ? parseISO(ev.start) : new Date(ev.start),
        end: typeof ev.end === 'string' ? parseISO(ev.end) : new Date(ev.end),
        type: ev.type,
      }));
      setEvents(calEvents);
    } catch {} finally { setLoading(false); }
  }, [studio.id, currentDate]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const eventPropGetter = (event) => ({
    style: { ...EVENT_STYLES[event.type] || EVENT_STYLES.blocked, borderRadius: '6px', fontSize: '11px', padding: '2px 6px' }
  });

  const isSlotAvailable = (start, end) => {
    return !events.some(ev =>
      (ev.type === 'booked' || ev.type === 'blocked') &&
      (
        (isAfter(start, ev.start) && isBefore(start, ev.end)) ||
        (isAfter(end, ev.start) && isBefore(end, ev.end)) ||
        (isBefore(start, ev.start) && isAfter(end, ev.end)) ||
        start.getTime() === ev.start.getTime()
      )
    );
  };

  const handleSelectSlot = ({ start, end }) => {
    if (isBefore(start, new Date())) return; // Can't book in the past
    if (!isSlotAvailable(start, end)) {
      setBookingError('Bu saat dilimi müsait değil');
      return;
    }
    setBookingError('');
    setSelectedStart(start);
    setSelectedEnd(end);
  };

  const totalHours = selectedStart && selectedEnd ? Math.max(differenceInHours(selectedEnd, selectedStart), 1) : 0;
  const totalPrice = totalHours * (studio.total_rate || studio.hourly_rate || 0);

  const handleBook = async () => {
    if (!selectedStart || !selectedEnd || !token) return;
    setBooking(true);
    setBookingError('');
    try {
      const adjustedEnd = addHours(selectedStart, Math.max(totalHours, 1));
      await axios.post(`${API}/studios/reserve`, {
        studio_id: studio.id,
        start_datetime: selectedStart.toISOString(),
        end_datetime: adjustedEnd.toISOString(),
        requirements,
      }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setSelectedStart(null);
      setSelectedEnd(null);
      setRequirements('');
      fetchCalendar();
      onBookingComplete?.();
    } catch (err) {
      setBookingError(err.response?.data?.detail || 'Rezervasyon başarısız');
    } finally { setBooking(false); }
  };

  const allDisplayEvents = [
    ...events,
    ...(selectedStart ? [{
      id: 'selection',
      title: `Seciminiz (${totalHours}s)`,
      start: selectedStart,
      end: addHours(selectedStart, Math.max(totalHours, 1)),
      type: 'selected',
    }] : [])
  ];

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        {[
          { color: '#ef4444', label: 'Rezerve' },
          { color: '#374151', label: 'Kapalı' },
          { color: '#10b981', label: 'Seciminiz' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
            <span className="text-[#a1a1aa]">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <Info size={12} className="text-[#8b5cf6]" />
          <span className="text-[#a1a1aa]">Boş slota tıkla/sürükle</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl overflow-hidden border border-white/8" style={{ minHeight: 480 }}>
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <Loader size={24} className="text-[#8b5cf6] animate-spin" />
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={allDisplayEvents}
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
            eventPropGetter={eventPropGetter}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            min={new Date(0, 0, 0, 8, 0, 0)}
            max={new Date(0, 0, 0, 23, 0, 0)}
            step={60}
            timeslots={1}
            messages={{
              allDay: 'Tam Gün', previous: '‹', next: '›', today: 'Bugün',
              month: 'Ay', week: 'Hafta', day: 'Gün', agenda: 'Takvim',
              noEventsInRange: 'Bu dönemde etkinlik yok',
            }}
          />
        )}
      </div>

      {/* Booking panel */}
      {selectedStart && (
        <div className="mt-4 rs-card p-5 border-[#10b981]/30 animate-fade-up" data-testid="booking-panel">
          <h3 className="text-sm font-semibold text-white mb-3">Rezervasyon Özeti</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-[#0d0d0f] rounded-lg text-center">
              <p className="text-[10px] font-mono uppercase text-[#a1a1aa] mb-1">Baslangic</p>
              <p className="text-xs font-semibold text-white">{format(selectedStart, 'dd/MM HH:mm')}</p>
            </div>
            <div className="p-3 bg-[#0d0d0f] rounded-lg text-center">
              <p className="text-[10px] font-mono uppercase text-[#a1a1aa] mb-1">Sure</p>
              <p className="text-xl font-bold text-[#10b981]">{totalHours}h</p>
            </div>
            <div className="p-3 bg-[#0d0d0f] rounded-lg text-center">
              <p className="text-[10px] font-mono uppercase text-[#a1a1aa] mb-1">Toplam</p>
              <p className="text-base font-bold text-[#10b981]">₺{totalPrice.toFixed(0)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-md mb-4">
            <Shield size={13} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#a1a1aa]">
              Ödeme escrow'da tutulur. Stüdyo sahibi onayı sonrası hesabınızdan düşülür.
              %15 platform komisyonu dahildir.
            </p>
          </div>
          <input
            type="text"
            value={requirements}
            onChange={e => setRequirements(e.target.value)}
            placeholder="Özel notlar / gereksinimler (opsiyonel)"
            className="rs-input text-sm mb-3"
            data-testid="reservation-requirements"
          />
          {bookingError && <p className="text-[#ec4899] text-sm mb-3">{bookingError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setSelectedStart(null); setSelectedEnd(null); }}
              className="flex-1 border border-white/10 text-[#a1a1aa] hover:text-white py-2.5 rounded-md text-sm transition-colors"
            >
              Iptal
            </button>
            <button
              onClick={handleBook}
              disabled={booking || !token}
              className="flex-2 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-md transition-all flex items-center justify-center gap-2"
              data-testid="confirm-reservation-btn"
            >
              {booking ? <Loader size={14} className="animate-spin" /> : <><Check size={14} /> Rezerve Et — ₺{totalPrice.toFixed(0)}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioAvailabilityCalendar;
