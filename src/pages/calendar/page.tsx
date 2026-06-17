import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, addDays, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';
import { Plus, X, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
import { CalendarEvent } from '../../types';
import AppLayout from '../../components/layout/AppLayout';

// ─── Properties ────────────────────────────────────────────────────
import { CALENDAR_PROPERTIES as PROPERTIES } from '../../config/properties';

const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TOTAL_FUTURE_MONTHS = 6; // Show 6 months into the future

// ─── Helpers ────────────────────────────────────────────────────
function getChannelColor(event: any): string {
  if (event.type === 'booked') {
    const ch = event.reservation?.channel || event.channel || '';
    return ch === 'airbnb' ? '#4CAF50' : '#2196F3';
  }
  if (event.type === 'maintenance') return '#F59E0B';
  return '#9E9E9E'; // blocked
}

function getEventLabel(event: any): string {
  if (event.type === 'booked') {
    const name = event.reservation?.guestName || event.title?.split(' - ')[0] || 'Guest';
    const ch = event.reservation?.channel || event.channel || '';
    const startD = new Date(((event.start || '') + 'T00:00:00'));
    const endD = new Date(((event.end || '') + 'T00:00:00'));
    const nights = Math.round((endD.getTime() - startD.getTime()) / 86400000);
    const chLabel = ch === 'airbnb' ? 'Airbnb' : 'Direct';
    return `${name}\n${chLabel} ${nights} night${nights !== 1 ? 's' : ''}`;
  }
  if (event.type === 'maintenance') return 'Maintenance';
  return 'Blocked';
}

// ─── Main Component ────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gridStartDate = addDays(today, -2); // 2 days before today

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
  const [isCreateBlockOpen, setIsCreateBlockOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(format(today, 'MMMM yyyy'));
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthMarkerRefs = useRef<{ [key: string]: number }>({});

  // Build continuous day array: today-2 through end of month+6
  const { days, monthBoundaries } = useMemo(() => {
    const endDate = endOfMonth(addMonths(today, TOTAL_FUTURE_MONTHS));
    const totalDays = differenceInCalendarDays(endDate, gridStartDate) + 1;
    const arr: Date[] = [];
    const boundaries: { label: string; dayIndex: number }[] = [];

    let lastMonth = '';
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(gridStartDate, i);
      arr.push(d);
      const monthLabel = format(d, 'MMMM yyyy');
      if (monthLabel !== lastMonth) {
        boundaries.push({ label: monthLabel, dayIndex: i });
        lastMonth = monthLabel;
      }
    }
    return { days: arr, monthBoundaries: boundaries };
  }, []);

  // Build month dropdown options from boundaries
  const monthOptions = useMemo(() => monthBoundaries.map(b => b.label), [monthBoundaries]);

  // Fetch ALL events for the entire range once
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const fetchStart = format(addDays(gridStartDate, -3), 'yyyy-MM-dd');
        const fetchEnd = format(addDays(days[days.length - 1], 2), 'yyyy-MM-dd');
        const data = await api.calendar.getEvents(fetchStart, fetchEnd);
        setEvents(data || []);
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        setEvents([]);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  // Track which month is visible as user scrolls
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const DAY_W = 32;
    const PROP_W = 80;

    const onScroll = () => {
      const scrollLeft = el.scrollLeft;
      const centerCol = Math.floor((scrollLeft + PROP_W + 60) / DAY_W);
      if (centerCol >= 0 && centerCol < days.length) {
        const m = format(days[centerCol], 'MMMM yyyy');
        setVisibleMonth(m);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [days]);

  // Jump to a month when selected from dropdown
  const jumpToMonth = useCallback((monthLabel: string) => {
    const boundary = monthBoundaries.find(b => b.label === monthLabel);
    if (boundary && scrollRef.current) {
      const DAY_W = 32;
      scrollRef.current.scrollLeft = boundary.dayIndex * DAY_W;
    }
  }, [monthBoundaries]);

  // Group events by property
  const eventsByProperty = useMemo(() => {
    const grouped: { [pid: string]: any[] } = {};
    PROPERTIES.forEach(p => { grouped[p.id] = []; });
    events.forEach((ev: any) => {
      const pid = ev.propertyId || ev.property_id || '';
      if (grouped[pid]) {
        grouped[pid].push(ev);
      }
    });
    return grouped;
  }, [events]);

  // Build booking bars for each property across the full timeline
  const getBookingBars = (propertyId: string) => {
    const propEvents = eventsByProperty[propertyId] || [];
    const bars: { event: any; startCol: number; span: number; label: string; color: string }[] = [];
    if (days.length === 0) return bars;

    const numDays = days.length;

    propEvents.forEach((ev: any) => {
      const evStart = new Date(ev.start + 'T00:00:00');
      const evEnd = new Date(ev.end + 'T00:00:00');

      const visibleStart = evStart < gridStartDate ? gridStartDate : evStart;
      const visibleEnd = evEnd > addDays(days[days.length - 1], 1) ? addDays(days[days.length - 1], 1) : evEnd;

      const startCol = differenceInCalendarDays(visibleStart, gridStartDate);
      const endCol = differenceInCalendarDays(visibleEnd, gridStartDate);
      const span = endCol - startCol;

      if (span > 0 && startCol < numDays && endCol > 0) {
        bars.push({
          event: ev,
          startCol: Math.max(0, startCol),
          span: Math.min(span, numDays - Math.max(0, startCol)),
          label: getEventLabel(ev),
          color: getChannelColor(ev),
        });
      }
    });

    return bars;
  };

  const todayStr = format(today, 'yyyy-MM-dd');

  // Auto-scroll to today on load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const todayIdx = 2; // today is always at index 2 (gridStart is today-2)
      const DAY_W = 32;
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_W - 20);
    }
  }, [loading]);

  const handleRefreshEvents = useCallback(() => {
    const fetchStart = format(addDays(gridStartDate, -3), 'yyyy-MM-dd');
    const fetchEnd = format(addDays(days[days.length - 1], 2), 'yyyy-MM-dd');
    api.calendar.getEvents(fetchStart, fetchEnd).then(data => setEvents(data || [])).catch(() => {});
  }, [days]);

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-600 mt-1">All properties - availability overview</p>
          </div>
          <button
            onClick={() => setIsCreateBlockOpen(true)}
            className="flex items-center gap-2 bg-[#7C9082] hover:bg-[#6B7F71] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Block
          </button>
        </div>

        {/* Month Selector + Today Button */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="relative flex items-center gap-2">
              <select
                value={visibleMonth}
                onChange={(e) => jumpToMonth(e.target.value)}
                className="appearance-none text-lg font-bold text-gray-900 bg-transparent pr-7 cursor-pointer focus:outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              onClick={() => {
                if (scrollRef.current) {
                  const DAY_W = 32;
                  scrollRef.current.scrollTo({ left: 2 * DAY_W - 20, behavior: 'smooth' });
                }
              }}
              className="px-3 py-1 text-sm font-medium text-[#6B7F71] bg-[#F0F4F1] hover:bg-[#E0EBE3] rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4CAF50' }}></div>
            <span className="text-gray-600">Airbnb</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2196F3' }}></div>
            <span className="text-gray-600">Direct</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="text-gray-600">Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9E9E9E' }}></div>
            <span className="text-gray-600">Blocked</span>
          </div>
        </div>

        {/* Continuous Scrolling Calendar Grid */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C9082]" />
            </div>
          ) : (
            <div className="overflow-x-auto" ref={scrollRef} style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="border-collapse" style={{ width: `${80 + days.length * 32}px` }}>
                {/* Day headers with month separators */}
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 text-xs sm:text-sm sticky left-0 bg-gray-50 z-20 border-r border-gray-200" style={{ minWidth: '80px', width: '80px' }}>
                      Property
                    </th>
                    {days.map((day, i) => {
                      const dayOfWeek = day.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const isToday = format(day, 'yyyy-MM-dd') === todayStr;
                      const isFirstOfMonth = day.getDate() === 1;
                      return (
                        <th
                          key={i}
                          className={`text-center py-1 px-0 border-l ${isFirstOfMonth ? 'border-l-2 border-gray-400' : 'border-gray-100'} ${isToday ? 'bg-green-50/40' : ''}`}
                          style={{ minWidth: '30px', maxWidth: '36px' }}
                        >
                          {isFirstOfMonth && (
                            <div className="text-[8px] font-bold text-[#7C9082] uppercase tracking-wider leading-none mb-0.5">
                              {format(day, 'MMM')}
                            </div>
                          )}
                          <div className={`text-[10px] font-medium ${isToday ? 'text-green-600 font-bold' : isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                            {DAY_NAMES_SHORT[dayOfWeek]}
                          </div>
                          <div className={`text-[10px] ${isToday ? 'font-bold text-green-700' : isWeekend ? 'text-red-500' : 'text-gray-700'}`}>
                            {day.getDate()}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Property rows */}
                <tbody>
                  {PROPERTIES.map((prop) => {
                    const bars = getBookingBars(prop.id);
                    return (
                      <tr key={prop.id} className="border-t border-gray-200 group">
                        <td className="py-2 px-2 sm:px-3 font-semibold text-gray-900 text-xs sm:text-sm whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200 group-hover:bg-gray-50" style={{ minWidth: '80px', width: '80px' }}>
                          {prop.name}
                        </td>

                        {days.map((day, i) => {
                          const isToday = format(day, 'yyyy-MM-dd') === todayStr;
                          const isFirstOfMonth = day.getDate() === 1;
                          const barStart = bars.find(b => b.startCol === i);
                          const coveredBy = bars.find(b => i >= b.startCol && i < b.startCol + b.span);

                          return (
                            <td
                              key={i}
                              className={`relative py-1 px-0 border-l ${isFirstOfMonth ? 'border-l-2 border-gray-400' : 'border-gray-100'} ${isToday ? 'bg-green-50/30' : ''}`}
                              style={{ minWidth: '30px', maxWidth: '36px', height: '44px' }}
                            >
                              {barStart ? (
                                <div
                                  className="absolute top-1 left-0 bottom-1 cursor-pointer flex flex-col justify-center overflow-hidden hover:opacity-80 transition-opacity z-10"
                                  style={{
                                    backgroundColor: barStart.color,
                                    width: `calc(${barStart.span * 100}% + ${(barStart.span - 1) * 1}px)`,
                                    minHeight: '36px',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                  }}
                                  onClick={() => {
                                    if (barStart.event.type === 'booked') {
                                      setSelectedReservation(barStart.event);
                                      setReservationModalOpen(true);
                                    } else {
                                      setSelectedEvent(barStart.event);
                                    }
                                  }}
                                  title={`${barStart.label.split('\n')[0]} (${barStart.event.start} → ${barStart.event.end})`}
                                >
                                  <span className="text-white font-semibold truncate whitespace-nowrap drop-shadow-sm" style={{ fontSize: '11px', lineHeight: '14px' }}>
                                    {barStart.label.split('\n')[0]}
                                  </span>
                                  {barStart.label.includes('\n') && (
                                    <span className="text-white/80 truncate whitespace-nowrap" style={{ fontSize: '9px', lineHeight: '12px' }}>
                                      {barStart.label.split('\n')[1]}
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reservation Quick Modal */}
      {reservationModalOpen && selectedReservation && (
        <ReservationModal
          reservation={selectedReservation.reservation}
          onClose={() => {
            setReservationModalOpen(false);
            setSelectedReservation(null);
          }}
        />
      )}

      {/* Event Details Drawer */}
      {selectedEvent && (
        <EventDetailsDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRefresh={handleRefreshEvents}
        />
      )}

      {/* Create Block Drawer */}
      {isCreateBlockOpen && (
        <CreateBlockDrawer
          onClose={() => setIsCreateBlockOpen(false)}
          onCreated={() => {
            setIsCreateBlockOpen(false);
            handleRefreshEvents();
          }}
        />
      )}
    </AppLayout>
  );
}

// ─── Reservation Quick Modal ────────────────────────────────────────
function ReservationModal({ reservation, onClose }: { reservation: any; onClose: () => void }) {
  const checkInDate = new Date(reservation.checkIn + 'T00:00:00');
  const checkOutDate = new Date(reservation.checkOut + 'T00:00:00');
  const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86400000);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Reservation Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <p className="text-3xl font-bold text-gray-900" style={{ color: '#1f2937' }}>
                {reservation.guestName}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Check-in</label>
                <p className="text-base text-gray-900 mt-1 font-medium">
                  {format(checkInDate, 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Check-out</label>
                <p className="text-base text-gray-900 mt-1 font-medium">
                  {format(checkOutDate, 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F0F4F1] rounded-lg p-3">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nights</label>
                <p className="text-2xl font-bold text-[#7C9082] mt-1">{nights}</p>
              </div>
              <div className="bg-[#F0F4F1] rounded-lg p-3">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Guests</label>
                <p className="text-2xl font-bold text-[#7C9082] mt-1">{reservation.guests}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Channel</label>
              <span
                className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                  reservation.channel === 'airbnb'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {reservation.channel === 'airbnb' ? 'Airbnb' : 'Direct'}
              </span>
            </div>

            <div className="bg-gradient-to-br from-[#7C9082] to-[#6B7F71] rounded-lg p-4 text-white">
              <label className="text-xs font-medium text-white/80 uppercase tracking-wide">Total Payout</label>
              <p className="text-3xl font-bold mt-2">${reservation.totalAmount}</p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Event Details Drawer ────────────────────────────────────────
function EventDetailsDrawer({ event, onClose, onRefresh }: { event: any; onClose: () => void; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleUnblock = async () => {
    if (!confirm('Are you sure you want to unblock these dates?')) return;
    setDeleting(true);
    try {
      await api.calendar.deleteBlock(event.id);
      onRefresh();
      onClose();
    } catch (e) {
      console.error('Failed to unblock:', e);
    }
    setDeleting(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {event.type === 'booked' ? 'Reservation Details' : 'Block Details'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {event.reservation ? (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Guest Name</label>
                <p className="text-base font-medium text-gray-900 mt-1">{event.reservation.guestName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Check-in</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {format(new Date(event.reservation.checkIn + 'T00:00:00'), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Check-out</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {format(new Date(event.reservation.checkOut + 'T00:00:00'), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Guests</label>
                  <p className="text-sm text-gray-900 mt-1">{event.reservation.guests}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Total Amount</label>
                  <p className="text-sm text-gray-900 mt-1">${event.reservation.totalAmount}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Channel</label>
                <span className={`
                  inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full
                  ${event.reservation.channel === 'airbnb' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}
                `}>
                  {event.reservation.channel === 'airbnb' ? 'Airbnb' : 'Direct'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
                  {event.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Start Date</label>
                  <p className="text-sm text-gray-900 mt-1">{event.start}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">End Date</label>
                  <p className="text-sm text-gray-900 mt-1">{event.end}</p>
                </div>
              </div>

              {(event.type === 'blocked' || event.type === 'maintenance' || event.type === 'hold') && (
                <button
                  onClick={handleUnblock}
                  disabled={deleting}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {deleting ? 'Unblocking...' : 'Unblock Dates'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Create Block Drawer ────────────────────────────────────────
function CreateBlockDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    propertyId: '',
    startDate: '',
    endDate: '',
    type: 'blocked',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.calendar.createBlock(formData);
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create block');
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Block</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
            <select
              value={formData.propertyId}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none"
              required
            >
              <option value="">Select property</option>
              {PROPERTIES.map(property => (
                <option key={property.id} value={property.id}>{property.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Block Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none"
            >
              <option value="blocked">Blocked</option>
              <option value="maintenance">Maintenance</option>
              <option value="hold">Hold</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none resize-none"
              placeholder="Add any notes..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#7C9082] hover:bg-[#6B7F71] disabled:bg-[#8BA894] text-white rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Block'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
