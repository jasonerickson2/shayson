import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Calendar, MessageSquare, ChevronDown, ChevronUp, Send, X } from 'lucide-react';
import { format, differenceInDays, isToday, isTomorrow, addDays, isSameDay } from 'date-fns';
import AppLayout from '../../components/layout/AppLayout';
import PullToRefresh from '../../components/PullToRefresh';

import { PROPERTY_NAMES as PROP_NAMES, PROPERTY_IDS as ALL_PROPS } from '../../config/properties';

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function HomePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['reservations'] });
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    await queryClient.invalidateQueries({ queryKey: ['calendarEvents14'] });
  }, [queryClient]);

  const { data: reservations, isLoading: resLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: api.reservations.getAll,
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.conversations.getAll,
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ['calendarEvents14'],
    queryFn: async () => {
      const today = new Date();
      const start = today.toISOString().split('T')[0];
      const end14 = new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0];
      return api.calendar.getEvents(start, end14);
    },
  });

  const [homeReservationModal, setHomeReservationModal] = useState<any | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get check-ins and check-outs for next 7 days
  const upcomingCheckIns = reservations
    ?.filter((r) => {
      const checkIn = new Date(r.checkIn + 'T00:00:00');
      const diff = differenceInDays(checkIn, today);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => new Date(a.checkIn + 'T00:00:00').getTime() - new Date(b.checkIn + 'T00:00:00').getTime())
    .slice(0, 5) || [];

  const upcomingCheckOuts = reservations
    ?.filter((r) => {
      const checkIn = new Date(r.checkIn + 'T00:00:00');
      const checkOut = new Date(r.checkOut + 'T00:00:00');
      const diff = differenceInDays(checkOut, today);
      // Only show checkouts for guests who have already checked in
      return checkIn <= today && diff >= 0 && diff <= 7;
    })
    .sort((a, b) => new Date(a.checkOut + 'T00:00:00').getTime() - new Date(b.checkOut + 'T00:00:00').getTime())
    .slice(0, 5) || [];

  // Get unread messages
  const unreadMessages = conversations
    ?.filter((c) => c.unreadCount > 0)
    .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
    .slice(0, 3) || [];

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) || 0;

  // Current guests: checked in today (check_in <= today < check_out)
  const currentGuests = reservations?.filter((r) => {
    const ci = new Date(r.checkIn + 'T00:00:00');
    const co = new Date(r.checkOut + 'T00:00:00');
    return ci <= today && today < co;
  }) || [];

  // Match current guests to conversations by guest name or hostexId
  const guestConversations: Record<string, any> = {};
  if (conversations && currentGuests.length > 0) {
    for (const guest of currentGuests) {
      const gName = (guest.guestName || '').toLowerCase().trim();
      const hostexId = (guest as any).hostexId;
      const match = conversations.find((c) => {
        // Match by Hostex reservation ID
        if (hostexId && c.reservationId && String(c.reservationId) === String(hostexId)) return true;
        // Match by guest name
        const cName = (c.guestName || '').toLowerCase().trim();
        return cName && gName && (cName === gName || cName.includes(gName) || gName.includes(cName));
      });
      if (match) guestConversations[guest.id] = match;
    }
  }

  if (resLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-6 bg-gray-200 rounded w-40 mb-3 animate-pulse" />
                <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Calendar Data (7 days mobile, 14 desktop) ──────────────────
  const numDays = isMobile ? 7 : 14;
  const calDays: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    calDays.push(d);
  }

  const eventsByProp: { [pid: string]: any[] } = {};
  (calendarEvents || []).forEach((ev: any) => {
    const pid = ev.propertyId || ev.property_id || '';
    if (!eventsByProp[pid]) eventsByProp[pid] = [];
    eventsByProp[pid].push(ev);
  });

  const dayStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Today's Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Booking Timeline (7 days mobile, 14 desktop) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7C9082]" />
              Next {numDays} Days
            </h2>
            <button
              onClick={() => navigate('/calendar')}
              className="text-sm text-[#7C9082] font-medium hover:text-[#6B7F71] cursor-pointer whitespace-nowrap"
            >
              Full Calendar →
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col className="w-16 sm:w-24" />
                {calDays.map((_, i) => (
                  <col key={i} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 font-medium text-gray-500 text-xs bg-white border-r border-gray-100" />
                  {calDays.map((d, i) => {
                    const isTodayCol = i === 0;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={i} className="text-center py-1.5 sm:py-2 px-0 border-l border-gray-100">
                        {isTodayCol ? (
                          <>
                            <div className="text-[10px] sm:text-xs font-bold text-green-600">{isMobile ? d.getDate() : 'Today'}</div>
                            <div className="text-[10px] sm:text-xs font-medium text-green-600">{isMobile ? dayNamesShort[d.getDay()] : dayNames[d.getDay()]}</div>
                          </>
                        ) : (
                          <>
                            <div className={`text-[10px] sm:text-xs font-medium ${isWeekend ? 'text-red-500' : 'text-gray-500'}`}>
                              {d.getDate()}
                            </div>
                            <div className={`text-[10px] sm:text-xs ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                              {isMobile ? dayNamesShort[d.getDay()] : dayNames[d.getDay()]}
                            </div>
                          </>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ALL_PROPS.map((pid) => {
                  const propEvents = eventsByProp[pid] || [];
                  const bars: { event: any; startIdx: number; span: number; color: string; guestName: string; channelLabel: string }[] = [];
                  propEvents.forEach((ev: any) => {
                    const eStart = (ev.start || '').split('T')[0];
                    const eEnd = (ev.end || '').split('T')[0];
                    let startIdx = -1;
                    let endIdx = -1;
                    for (let j = 0; j < numDays; j++) {
                      const ds = dayStr(calDays[j]);
                      if (ds >= eStart && ds < eEnd) {
                        if (startIdx === -1) startIdx = j;
                        endIdx = j;
                      }
                    }
                    if (startIdx === -1) return;
                    const span = endIdx - startIdx + 1;
                    let color = '#9E9E9E';
                    let gName = '';
                    let channelLabel = '';
                    if (ev.type === 'booked') {
                      const ch = ev.reservation?.channel || ev.channel || '';
                      color = ch === 'airbnb' ? '#4CAF50' : '#2196F3';
                      gName = ev.reservation?.guestName || ev.title?.split(' - ')[0] || '';
                      const startD = new Date(eStart + 'T00:00:00');
                      const endD = new Date(eEnd + 'T00:00:00');
                      const nights = Math.round((endD.getTime() - startD.getTime()) / 86400000);
                      channelLabel = `${ch === 'airbnb' ? 'Airbnb' : 'Direct'} ${nights}n`;
                    } else {
                      gName = 'Blocked';
                    }
                    bars.push({ event: ev, startIdx, span, color, guestName: gName, channelLabel });
                  });

                  return (
                    <tr key={pid} className="border-t border-gray-100" style={{ height: isMobile ? '40px' : '48px' }}>
                      <td className="py-1 px-2 sm:px-3 font-medium text-gray-900 text-[10px] sm:text-xs whitespace-nowrap bg-white border-r border-gray-100 truncate">
                        {PROP_NAMES[pid] || pid}
                      </td>
                      {calDays.map((d, i) => {
                        const isTodayCol = i === 0;
                        const barStart = bars.find(b => b.startIdx === i);
                        return (
                          <td
                            key={i}
                            className={`relative px-0 border-l border-gray-100 ${isTodayCol ? 'bg-green-50/30' : ''}`}
                            style={{ padding: '3px 0', height: isMobile ? '40px' : '48px' }}
                          >
                            {barStart && (
                              <div
                                className="absolute top-1 bottom-1 flex flex-col justify-center text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity z-10"
                                style={{
                                  backgroundColor: barStart.color,
                                  left: '1px',
                                  width: `calc(${barStart.span * 100}% + ${(barStart.span - 1) * 1}px - 2px)`,
                                  borderRadius: '5px',
                                  padding: isMobile ? '1px 4px' : '2px 8px',
                                  minHeight: isMobile ? '30px' : '38px',
                                }}
                                title={`${barStart.guestName}${barStart.channelLabel ? ' - ' + barStart.channelLabel : ''}`}
                                onClick={() => {
                                  if (barStart.event.type === 'booked' && barStart.event.reservation) {
                                    setHomeReservationModal(barStart.event.reservation);
                                  }
                                }}
                              >
                                <span className="truncate font-semibold whitespace-nowrap" style={{ fontSize: isMobile ? '9px' : '11px', lineHeight: isMobile ? '12px' : '14px' }}>{barStart.guestName}</span>
                                {barStart.channelLabel && !isMobile && (
                                  <span className="truncate opacity-90 whitespace-nowrap" style={{ fontSize: '9px', lineHeight: '12px' }}>{barStart.channelLabel}</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Current Guests with Messages */}
        {currentGuests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-[#7C9082]" />
              Current Guests
            </h2>
            <div className="space-y-3">
              {currentGuests.map((guest) => (
                <CurrentGuestCard
                  key={guest.id}
                  reservation={guest}
                  conversation={guestConversations[guest.id]}
                  propName={PROP_NAMES[guest.propertyId] || guest.propertyId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Check-ins */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7C9082]" />
              Upcoming Check-ins
            </h2>
            <button
              onClick={() => navigate('/calendar')}
              className="text-sm text-[#7C9082] font-medium hover:text-[#6B7F71] cursor-pointer whitespace-nowrap"
            >
              View Calendar →
            </button>
          </div>

          {upcomingCheckIns.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No check-ins in the next 7 days</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {upcomingCheckIns.map((reservation) => {
                const checkInDate = new Date(reservation.checkIn + 'T00:00:00');
                const isTodayCheckIn = isToday(checkInDate);
                const isTomorrowCheckIn = isTomorrow(checkInDate);
                const daysUntilCheckIn = differenceInDays(checkInDate, today);

                return (
                  <div
                    key={reservation.id}
                    className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isTodayCheckIn ? 'bg-[#F0F4F1]/50' : ''
                    }`}
                    onClick={() => navigate('/calendar')}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                        isTodayCheckIn
                          ? 'bg-[#7C9082] text-white'
                          : isTomorrowCheckIn
                          ? 'bg-[#E0EBE3] text-[#5A6E5F]'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase">
                        {format(checkInDate, 'MMM')}
                      </span>
                      <span className="text-xl font-bold leading-tight">
                        {format(checkInDate, 'd')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {reservation.guestName}
                        </p>
                        {isTodayCheckIn && (
                          <span className="px-2 py-0.5 bg-[#7C9082] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                            TODAY
                          </span>
                        )}
                        {isTomorrowCheckIn && (
                          <span className="px-2 py-0.5 bg-[#E0EBE3] text-[#5A6E5F] text-[10px] font-bold rounded-full whitespace-nowrap">
                            TOMORROW
                          </span>
                        )}
                        {!isTodayCheckIn && !isTomorrowCheckIn && daysUntilCheckIn > 1 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full whitespace-nowrap">
                            IN {daysUntilCheckIn} DAYS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {PROP_NAMES[reservation.propertyId] || reservation.propertyId} · {reservation.guests} guest
                        {reservation.guests > 1 ? 's' : ''}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${
                        reservation.channel === 'airbnb'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {reservation.channel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming Check-outs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Upcoming Check-outs
            </h2>
          </div>

          {upcomingCheckOuts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No check-outs in the next 7 days</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {upcomingCheckOuts.map((reservation) => {
                const checkOutDate = new Date(reservation.checkOut + 'T00:00:00');
                const isTodayCheckOut = isToday(checkOutDate);
                const isTomorrowCheckOut = isTomorrow(checkOutDate);
                const daysUntilCheckOut = differenceInDays(checkOutDate, today);

                return (
                  <div
                    key={reservation.id}
                    className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isTodayCheckOut ? 'bg-amber-50/50' : ''
                    }`}
                    onClick={() => navigate('/calendar')}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                        isTodayCheckOut
                          ? 'bg-amber-600 text-white'
                          : isTomorrowCheckOut
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase">
                        {format(checkOutDate, 'MMM')}
                      </span>
                      <span className="text-xl font-bold leading-tight">
                        {format(checkOutDate, 'd')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {reservation.guestName}
                        </p>
                        {isTodayCheckOut && (
                          <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                            TODAY
                          </span>
                        )}
                        {isTomorrowCheckOut && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full whitespace-nowrap">
                            TOMORROW
                          </span>
                        )}
                        {!isTodayCheckOut && !isTomorrowCheckOut && daysUntilCheckOut > 1 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full whitespace-nowrap">
                            IN {daysUntilCheckOut} DAYS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {PROP_NAMES[reservation.propertyId] || reservation.propertyId} · {reservation.guests} guest
                        {reservation.guests > 1 ? 's' : ''}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${
                        reservation.channel === 'airbnb'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {reservation.channel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Unread Messages */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#7C9082]" />
              Unread Messages
              {totalUnread > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                  {totalUnread}
                </span>
              )}
            </h2>
            <button
              onClick={() => navigate('/messages')}
              className="text-sm text-[#7C9082] font-medium hover:text-[#6B7F71] cursor-pointer whitespace-nowrap"
            >
              View All →
            </button>
          </div>

          {unreadMessages.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">All caught up! No unread messages</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {unreadMessages.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => navigate('/messages')}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-[#8BA894] to-[#6B7F71] rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {conversation.guestName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.guestName}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatRelativeTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mb-1">
                      {conversation.lastMessage}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full whitespace-nowrap ${
                          conversation.channel === 'airbnb'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-600'
                        }`}
                      >
                        {conversation.channel}
                      </span>
                    </div>
                  </div>
                  <span className="bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                    {conversation.unreadCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Reservation Popup for Home Calendar */}
      {homeReservationModal && (
        <HomeReservationModal
          reservation={homeReservationModal}
          onClose={() => setHomeReservationModal(null)}
        />
      )}
      </PullToRefresh>
    </AppLayout>
  );
}

// ─── Home Reservation Modal ──────────────────────────────────────
function HomeReservationModal({ reservation, onClose }: { reservation: any; onClose: () => void }) {
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
              <p className="text-3xl font-bold text-gray-900">{reservation.guestName}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Check-in</label>
                <p className="text-base text-gray-900 mt-1 font-medium">{format(checkInDate, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Check-out</label>
                <p className="text-base text-gray-900 mt-1 font-medium">{format(checkOutDate, 'MMM dd, yyyy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F0F4F1] rounded-lg p-3">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nights</label>
                <p className="text-2xl font-bold text-[#7C9082] mt-1">{nights}</p>
              </div>
              <div className="bg-[#F0F4F1] rounded-lg p-3">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Guests</label>
                <p className="text-2xl font-bold text-[#7C9082] mt-1">{reservation.guests || ' - '}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Channel</label>
              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                reservation.channel === 'airbnb' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
              }`}>
                {reservation.channel === 'airbnb' ? 'Airbnb' : 'Direct'}
              </span>
            </div>

            {reservation.totalAmount && (
              <div className="bg-gradient-to-br from-[#7C9082] to-[#6B7F71] rounded-lg p-4 text-white">
                <label className="text-xs font-medium text-white/80 uppercase tracking-wide">Total Payout</label>
                <p className="text-3xl font-bold mt-2">${reservation.totalAmount}</p>
              </div>
            )}

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

// ─── Current Guest Card with expandable messages ─────────────────
function CurrentGuestCard({
  reservation,
  conversation,
  propName,
}: {
  reservation: any;
  conversation: any;
  propName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const checkIn = new Date(reservation.checkIn);
  const checkOut = new Date(reservation.checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nightsLeft = Math.max(0, Math.ceil((checkOut.getTime() - today.getTime()) / 86400000));

  const loadMessages = async () => {
    if (!conversation?.id) return;
    setLoadingMsgs(true);
    try {
      const msgs = await api.conversations.getMessages(conversation.id);
      // Sort oldest first (top) → newest last (bottom), keep last 10
      const sorted = (msgs || []).sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sorted.slice(-10));
    } catch {
      setMessages([]);
    }
    setLoadingMsgs(false);
  };

  useEffect(() => {
    if (expanded && messages.length === 0 && conversation?.id) {
      loadMessages();
    }
  }, [expanded]);

  const handleSend = async () => {
    if (!replyText.trim() || !conversation?.id || sending) return;
    setSending(true);
    try {
      await api.conversations.sendMessage(conversation.id, replyText.trim());
      setReplyText('');
      await loadMessages();
    } catch (e) {
      console.error('Failed to send:', e);
    }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Guest Header */}
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-[#8BA894] to-[#6B7F71] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {reservation.guestName?.charAt(0) || 'G'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {reservation.guestName}
            </p>
            <span className="px-2 py-0.5 bg-[#E0EBE3] text-[#5A6E5F] text-[10px] font-bold rounded-full whitespace-nowrap">
              IN HOUSE
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {propName} · {nightsLeft} night{nightsLeft !== 1 ? 's' : ''} left · checkout {format(checkOut, 'MMM d')}
          </p>
          {conversation?.lastMessage && (
            <p className="text-xs text-gray-400 mt-1 truncate">
              Last message: "{conversation.lastMessage.slice(0, 60)}{conversation.lastMessage.length > 60 ? '...' : ''}"
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-2 py-1 text-[10px] font-semibold rounded-full ${
              reservation.channel === 'airbnb' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {reservation.channel}
          </span>
          {conversation ? (
            expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : null}
        </div>
      </div>

      {/* Expanded Messages */}
      {expanded && conversation && (
        <div className="border-t border-gray-100">
          {loadingMsgs ? (
            <div className="p-4 text-center text-xs text-gray-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">No messages found</div>
          ) : (
            <div className="max-h-64 overflow-y-auto p-3 space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.sender === 'host' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                      msg.sender === 'host'
                        ? 'bg-[#7C9082] text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-[9px] mt-1 ${msg.sender === 'host' ? 'text-[#C5D6C9]' : 'text-gray-400'}`}>
                      {msg.timestamp ? formatRelativeTime(msg.timestamp) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Reply */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Quick reply..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || sending}
              className="px-3 py-2 bg-[#7C9082] hover:bg-[#6B7F71] disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* No conversation found */}
      {expanded && !conversation && (
        <div className="border-t border-gray-100 p-4 text-center text-xs text-gray-400">
          No Hostex conversation found for this guest
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d');
}
