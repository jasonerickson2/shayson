import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollText, ChevronDown, ChevronRight, RefreshCw, Filter, Clock, Zap, AlertTriangle, TrendingDown, Shield, CheckCircle, CalendarCheck, LayoutGrid, List, SkipForward, CheckCheck, FileText, MessageSquare, Bot, Thermometer, Send } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import { api } from '../../lib/api';
import { ActivityLog, ActivityActionType, ActivityLogFilters } from '../../types';

// ── Constants ──────────────────────────────────────────────────────

import {
  PROPERTY_SHORT_NAMES as PROPERTY_SHORT,
  PROPERTY_NAMES as PROPERTY_FULL,
  PROPERTY_ORDER_LOGS as PROPERTY_ORDER,
  PROPERTY_EMOJIS as PROPERTY_EMOJI,
  PROPERTY_THEMES as PROPERTY_THEME,
} from '../../config/properties';

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GAP_ACTION_TYPES = [
  'gap_found', 'gap_detected', 'gap_fire_sale', 'gap_accelerate',
  'gap_premium', 'gap_resolved',
];

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon?: any }> = {
  gap_found:              { label: 'Gap',          color: '#fff',    bg: '#94a3b8', icon: AlertTriangle },
  gap_detected:           { label: 'Gap',          color: '#fff',    bg: '#94a3b8', icon: AlertTriangle },
  gap_fire_sale:          { label: 'Fire Sale',    color: '#fff',    bg: '#ef4444', icon: TrendingDown },
  gap_accelerate:         { label: 'Accelerate',   color: '#fff',    bg: '#f97316', icon: Zap },
  gap_premium:            { label: 'Premium',      color: '#fff',    bg: '#8b5cf6', icon: Shield },
  gap_resolved:           { label: 'Resolved',     color: '#fff',    bg: '#22c55e', icon: CheckCircle },
  gap_min_stay:           { label: 'Gap MinStay',  color: '#fff',    bg: '#64748b', icon: Shield },
  event_tail_drop:        { label: 'Event',        color: '#000',    bg: '#ffcc00' },
  event_price_set:        { label: 'Event $',      color: '#000',    bg: '#ffcc00' },
  tier_drop:              { label: 'Tier Drop',    color: '#fff',    bg: '#3b82f6', icon: TrendingDown },
  tier_skip:              { label: 'Tier Skip',    color: '#fff',    bg: '#94a3b8', icon: SkipForward },
  booked_skip:            { label: 'Booked',       color: '#fff',    bg: '#64748b', icon: CalendarCheck },
  tier_confirmed:         { label: 'Tier OK',      color: '#fff',    bg: '#0ea5e9', icon: CheckCheck },
  sync_summary:           { label: 'Summary',      color: '#fff',    bg: '#1e293b', icon: FileText },
  min_stay_change:        { label: 'MinStay',      color: '#fff',    bg: '#64748b' },
  booking_received:       { label: 'Booked',       color: '#fff',    bg: '#34c759' },
  booking_cancelled:      { label: 'Cancelled',    color: '#fff',    bg: '#ef4444' },
  ai_recommendation:      { label: 'AI Rec',       color: '#fff',    bg: '#8b5cf6', icon: Bot },
  ai_action_applied:      { label: 'AI Act',       color: '#fff',    bg: '#8b5cf6', icon: Bot },
  ai_price_applied:       { label: 'AI Price',     color: '#fff',    bg: '#7c3aed', icon: Bot },
  ai_cooldown_skip:       { label: 'AI Cooldown',  color: '#fff',    bg: '#a78bfa', icon: Thermometer },
  ai_daily_digest:        { label: 'AI Digest',    color: '#fff',    bg: '#6d28d9', icon: Bot },
  ai_digest_sms_sent:     { label: 'SMS Sent',     color: '#fff',    bg: '#6d28d9', icon: Send },
  ai_action_response:     { label: 'AI Resp',      color: '#fff',    bg: '#7c3aed', icon: Bot },
  ai_owner_reply:         { label: 'Owner Reply',  color: '#fff',    bg: '#059669', icon: MessageSquare },
  ai_outcome_assessed:    { label: 'AI Outcome',   color: '#fff',    bg: '#0891b2', icon: Bot },
  ai_recheck_triggered:   { label: 'AI Recheck',   color: '#fff',    bg: '#d97706', icon: Bot },
  ai_auto_applied:        { label: 'Auto-Applied', color: '#fff',    bg: '#16a34a', icon: Bot },
  ai_advisor_response:    { label: 'Advisor Resp',  color: '#fff',   bg: '#7c3aed', icon: Bot },
  pricing_advisor_reply:  { label: 'Advisor Reply', color: '#fff',   bg: '#059669', icon: MessageSquare },
};

const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'sync_summary', label: 'Sync Summary' },
  { value: 'tier_drop', label: 'Tier Drop' },
  { value: 'tier_skip', label: 'Tier Skip' },
  { value: 'booked_skip', label: 'Booked Skip' },
  { value: 'tier_confirmed', label: 'Tier Confirmed' },
  { value: 'booking_received', label: 'Booking' },
  { value: 'booking_cancelled', label: 'Cancellation' },
  { value: 'gap_detected', label: 'Gap Detected' },
  { value: 'gap_fire_sale', label: 'Gap Fire Sale' },
  { value: 'gap_accelerate', label: 'Gap Accelerate' },
  { value: 'gap_premium', label: 'Gap Premium' },
  { value: 'gap_min_stay', label: 'Gap Min-Stay' },
  { value: 'event_price_set', label: 'Event Price' },
  { value: 'event_tail_drop', label: 'Event Tail Drop' },
  { value: 'min_stay_change', label: 'Min-Stay' },
  { value: 'ai_price_applied', label: 'AI Price Applied' },
  { value: 'ai_cooldown_skip', label: 'AI Cooldown Skip' },
  { value: 'pricing_advisor_reply', label: 'Advisor Reply' },
  { value: 'ai_recommendation', label: 'AI Rec' },
  { value: 'ai_action_applied', label: 'AI Action' },
  { value: 'ai_outcome_assessed', label: 'AI Outcome' },
  { value: 'ai_recheck_triggered', label: 'AI Recheck' },
  { value: 'ai_auto_applied', label: 'Auto-Applied' },
];

const PROPERTY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Properties' },
  ...PROPERTY_ORDER.map(id => ({ value: id, label: PROPERTY_FULL[id] || id })),
];

// ── Helpers ────────────────────────────────────────────────────────

function getDow(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return DOW_NAMES[d.getUTCDay()];
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00Z');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function sortedPropertyKeys(keys: string[]): string[] {
  return keys.sort((a, b) => {
    const ai = PROPERTY_ORDER.indexOf(a);
    const bi = PROPERTY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

/**
 * Aggressive dedup: keep only ONE gap_detected/gap_found per property+date combo.
 * No time window - just one, period.
 */
function deduplicateLogs(logs: ActivityLog[]): ActivityLog[] {
  const seen = new Set<string>();
  const result: ActivityLog[] = [];

  for (const log of logs) {
    if (log.action_type === 'gap_detected' || log.action_type === 'gap_found') {
      const key = `${log.property_id}:${log.action_type}:${log.date || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    result.push(log);
  }
  return result;
}

// ── Atomic Components ──────────────────────────────────────────────

function ActionBadge({ actionType, small }: { actionType: string; small?: boolean }) {
  const cfg = ACTION_CONFIG[actionType] || { label: actionType, color: '#fff', bg: '#999' };
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'}`}
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// ── Tier Drop Card (special prominent display) ─────────────────────

function TierDropCard({ log }: { log: ActivityLog }) {
  const tierName = log.metadata?.tier || '';
  const daysOut = log.metadata?.days_out ?? (log.date ? daysFromNow(log.date) : null);
  const oldP = log.old_price;
  const newP = log.new_price;
  const diff = oldP != null && newP != null ? newP - oldP : null;

  return (
    <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-blue-500 flex-shrink-0">
          {tierName || 'TIER'}
        </span>
        {log.date && (
          <span className="text-sm font-medium text-gray-900">
            {getDow(log.date)} {formatDateShort(log.date)}
          </span>
        )}
        {oldP != null && newP != null && (
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            <span className="text-xs font-mono text-gray-400">${oldP}</span>
            <span className="text-gray-300">&rarr;</span>
            <span className="text-sm font-mono font-bold text-blue-600">${newP}</span>
            {diff != null && (
              <span className={`text-[10px] font-bold ${diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                ({diff > 0 ? '+' : ''}{diff})
              </span>
            )}
          </div>
        )}
        <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(log.created_at)}</span>
      </div>
      {daysOut != null && (
        <div className="mt-0.5 ml-[calc(2rem+0.5rem)]">
          <span className="text-[10px] text-blue-500 font-medium">{daysOut}d out</span>
        </div>
      )}
    </div>
  );
}

// ── Booked Skip Card (tier crossover date that's booked) ───────────

function BookedSkipCard({ log }: { log: ActivityLog }) {
  const tierName = log.metadata?.tier || '';
  const daysOut = log.metadata?.days_out ?? (log.date ? daysFromNow(log.date) : null);
  const livePrice = log.metadata?.live_price;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex-shrink-0">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-slate-400">
          Booked
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {log.date && (
            <span className="text-sm font-medium text-gray-400 line-through">
              {getDow(log.date)} {formatDateShort(log.date)}
            </span>
          )}
          {tierName && (
            <span className="text-[10px] text-slate-400 font-medium">{tierName}</span>
          )}
          {daysOut != null && (
            <span className="text-[10px] text-slate-400">{daysOut}d out</span>
          )}
        </div>
      </div>
      {livePrice != null && (
        <span className="text-sm font-mono text-slate-400 flex-shrink-0">${livePrice}</span>
      )}
      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(log.created_at)}</span>
    </div>
  );
}

// ── Booking Card (special display for bookings) ────────────────────

function BookingCard({ log }: { log: ActivityLog }) {
  const isCancelled = log.action_type === 'booking_cancelled';
  const nights = log.metadata?.nights || log.metadata?.total_nights;
  const revenue = log.metadata?.revenue || log.metadata?.total_revenue;
  const guest = log.metadata?.guest_name;
  const source = log.metadata?.source || log.metadata?.channel;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isCancelled ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
      <ActionBadge actionType={log.action_type} small />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {log.date && (
            <span className="text-sm font-medium text-gray-900">
              {getDow(log.date)} {formatDateShort(log.date)}
            </span>
          )}
          {nights && <span className="text-[10px] text-gray-500">{nights}n</span>}
          {guest && <span className="text-xs text-gray-600">{guest}</span>}
          {source && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">{source}</span>}
        </div>
      </div>
      {revenue && (
        <span className={`text-sm font-mono font-bold flex-shrink-0 ${isCancelled ? 'text-red-600 line-through' : 'text-green-600'}`}>
          ${typeof revenue === 'number' ? revenue.toLocaleString() : revenue}
        </span>
      )}
      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(log.created_at)}</span>
    </div>
  );
}

// ── Gap Card (consolidated gap display) ────────────────────────────

function GapCard({ log }: { log: ActivityLog }) {
  const gapDates = log.metadata?.gap_dates || (log.date ? [log.date] : []);
  const gapSize = log.metadata?.gap_size || gapDates.length;
  const daysOut = log.metadata?.days_out ?? (log.date ? daysFromNow(log.date) : null);
  const before = log.metadata?.before_booked;
  const after = log.metadata?.after_booked;

  const firstDate = gapDates[0];
  const lastDate = gapDates[gapDates.length - 1];
  const dateRange = !firstDate ? '' : firstDate === lastDate
    ? `${getDow(firstDate)} ${formatDateShort(firstDate)}`
    : `${formatDateShort(firstDate)} – ${formatDateShort(lastDate)}`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
      <div className="flex-shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{dateRange}</span>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 rounded-full">{gapSize}n gap</span>
          {daysOut != null && <span className="text-[10px] text-gray-400">{daysOut}d out</span>}
        </div>
        {(before || after) && (
          <div className="text-[10px] text-gray-400 mt-0.5">
            {before && <span>after {formatDateShort(before)}</span>}
            {before && after && <span> · </span>}
            {after && <span>before {formatDateShort(after)}</span>}
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(log.created_at)}</span>
    </div>
  );
}

// ── Generic Log Row (for everything else) ──────────────────────────

function GenericLogRow({ log }: { log: ActivityLog }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white border border-gray-100">
      <div className="flex items-center gap-2">
        <ActionBadge actionType={log.action_type} small />
        {log.date && (
          <span className="text-xs font-medium text-gray-900">
            {getDow(log.date)} {formatDateShort(log.date)}
          </span>
        )}
        {log.old_price != null && log.new_price != null && (
          <span className="text-xs font-mono text-gray-500 ml-auto flex-shrink-0">
            ${log.old_price} <span className="text-gray-300">&rarr;</span>{' '}
            <span className={log.new_price < log.old_price ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              ${log.new_price}
            </span>
          </span>
        )}
        <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(log.created_at)}</span>
      </div>
      {log.description && (
        <p className="text-[11px] text-gray-500 mt-0.5 ml-[calc(2rem+0.5rem)] break-words">{log.description}</p>
      )}
    </div>
  );
}

// ── Expandable Metadata (for detailed view) ────────────────────────

function MetadataPanel({ metadata }: { metadata: Record<string, any> }) {
  const entries = Object.entries(metadata).filter(([k]) => k !== 'request_id');
  const requestId = metadata.request_id;
  if (entries.length === 0 && !requestId) return null;

  return (
    <div className="mt-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-600">
      {requestId && (
        <div className="text-[10px] text-gray-400 mb-1 truncate">req: {requestId}</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-1.5 min-w-0">
            <span className="text-gray-400 flex-shrink-0">{key}:</span>
            <span className="text-gray-700 truncate">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sync Summary Divider (detailed view) ────────────────────────────

function SyncSummaryDivider({ log }: { log: ActivityLog }) {
  const m = log.metadata || {};
  const parts: string[] = [];
  if (m.dates_processed) parts.push(`${m.dates_processed} dates`);
  if (m.tier_drops) parts.push(`${m.tier_drops} drops`);
  if (m.tier_confirmed) parts.push(`${m.tier_confirmed} confirmed`);
  if (m.event_tiers) parts.push(`${m.event_tiers} event`);
  if (m.booked) parts.push(`${m.booked} booked`);
  if (m.blocked) parts.push(`${m.blocked} blocked`);
  if (m.gap_overrides) parts.push(`${m.gap_overrides} gap_skip`);
  if (m.manual_overrides) parts.push(`${m.manual_overrides} manual`);
  if (m.ai_cooldowns) parts.push(`${m.ai_cooldowns} cooldown`);
  if (m.push_failures) parts.push(`${m.push_failures} fail`);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-white my-1.5">
      <FileText className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold">Daily Sync</span>
          {parts.map((p, i) => {
            const [num, label] = p.split(' ');
            const isZero = num === '0';
            return (
              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${isZero ? 'bg-slate-700 text-slate-400' : 'bg-slate-600 text-white font-semibold'}`}>
                {num} {label}
              </span>
            );
          })}
        </div>
      </div>
      <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTime(log.created_at)}</span>
    </div>
  );
}

// ── Detailed Log Row (full description + expandable metadata) ───────

function DetailedLogRow({ log }: { log: ActivityLog }) {
  const [showMeta, setShowMeta] = useState(false);
  const cfg = ACTION_CONFIG[log.action_type] || { label: log.action_type, color: '#fff', bg: '#999' };
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <div className="px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-start gap-2">
        <ActionBadge actionType={log.action_type} small />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {log.date && (
              <span className="text-xs font-medium text-gray-900">
                {getDow(log.date)} {formatDateShort(log.date)}
                <span className="text-[10px] text-gray-400 ml-1">({daysFromNow(log.date)}d)</span>
              </span>
            )}
            {log.old_price != null && log.new_price != null && (
              <span className="text-xs font-mono text-gray-500">
                ${log.old_price} &rarr;{' '}
                <span className={log.new_price < log.old_price ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  ${log.new_price}
                </span>
              </span>
            )}
            {log.old_min_stay != null && log.new_min_stay != null && log.old_min_stay !== log.new_min_stay && (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                min {log.old_min_stay}&rarr;{log.new_min_stay}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{log.description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-gray-400">{formatTime(log.created_at)}</span>
          {hasMeta && (
            <button
              onClick={() => setShowMeta(!showMeta)}
              className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                showMeta ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {showMeta ? 'meta' : '{ }'}
            </button>
          )}
        </div>
      </div>
      {showMeta && hasMeta && <MetadataPanel metadata={log.metadata} />}
    </div>
  );
}

// ── Detailed Property Accordion ─────────────────────────────────────

function DetailedPropertySection({
  propertyId,
  logs,
  defaultExpanded,
}: {
  propertyId: string;
  logs: ActivityLog[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const count = logs.length;
  const theme = PROPERTY_THEME[propertyId] || PROPERTY_THEME.roadhouse_lodge_room_1;

  // Count by category
  const summaryCount = logs.filter(l => l.action_type === 'sync_summary').length;
  const tierCount = logs.filter(l => ['tier_drop', 'tier_skip', 'tier_confirmed', 'booked_skip'].includes(l.action_type)).length;
  const gapCount = logs.filter(l => l.action_type.startsWith('gap_')).length;
  const bookingCount = logs.filter(l => l.action_type === 'booking_received' || l.action_type === 'booking_cancelled').length;
  const aiCount = logs.filter(l => l.action_type.startsWith('ai_') || l.action_type === 'pricing_advisor_reply').length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${theme.gradient} flex-shrink-0`} />
        <span className="text-base leading-none">{PROPERTY_EMOJI[propertyId] || '🏠'}</span>
        <div className="flex-1 text-left">
          <span className="text-sm font-bold text-gray-900">{PROPERTY_SHORT[propertyId]}</span>
          <span className="text-xs text-gray-400 ml-2">{PROPERTY_FULL[propertyId]}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {summaryCount > 0 && <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{summaryCount} sync</span>}
          {tierCount > 0 && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{tierCount} tier</span>}
          {gapCount > 0 && <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{gapCount} gap</span>}
          {bookingCount > 0 && <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{bookingCount} book</span>}
          {aiCount > 0 && <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{aiCount} AI</span>}
        </div>
        <span className={`text-xs font-bold ${theme.accent} ml-1`}>{count}</span>
        <div className="text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2.5 space-y-1 bg-gray-50/30">
          {count === 0 ? (
            <div className="py-4 text-center text-gray-400 text-xs">No activity</div>
          ) : (
            logs.map(log =>
              log.action_type === 'sync_summary'
                ? <SyncSummaryDivider key={log.id} log={log} />
                : <DetailedLogRow key={log.id} log={log} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Smart Log Entry (routes to correct card type) ──────────────────

function LogEntry({ log }: { log: ActivityLog }) {
  if (log.action_type === 'tier_drop') return <TierDropCard log={log} />;
  if (log.action_type === 'booked_skip') return <BookedSkipCard log={log} />;
  if (log.action_type === 'booking_received' || log.action_type === 'booking_cancelled') return <BookingCard log={log} />;
  if (log.action_type === 'gap_detected' || log.action_type === 'gap_found') return <GapCard log={log} />;
  return <GenericLogRow log={log} />;
}

// ── Mini stat pill ─────────────────────────────────────────────────

function StatPill({ count, icon: Icon, color, label }: { count: number; icon: any; color: string; label: string }) {
  if (count === 0) return null;
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-500',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${colorMap[color] || colorMap.gray}`} title={label}>
      <Icon className="w-2.5 h-2.5" />
      {count}
    </span>
  );
}

// ── Property Tile (professional design with gradient accent) ───────

function PropertyTile({
  propertyId,
  logs,
  isExpanded,
  onToggle,
}: {
  propertyId: string;
  logs: ActivityLog[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const count = logs.length;
  const bookings = logs.filter(l => l.action_type === 'booking_received').length;
  const cancellations = logs.filter(l => l.action_type === 'booking_cancelled').length;
  const gaps = logs.filter(l => l.action_type === 'gap_detected' || l.action_type === 'gap_found').length;
  const tierDrops = logs.filter(l => l.action_type === 'tier_drop').length;
  const theme = PROPERTY_THEME[propertyId] || PROPERTY_THEME.roadhouse_lodge_room_1;

  return (
    <div className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
      isExpanded
        ? `col-span-full shadow-lg ring-2 ${theme.ring}`
        : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'
    }`}>
      {/* Gradient accent bar */}
      <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />

      <div className="bg-white">
        <button
          onClick={onToggle}
          className="w-full text-left cursor-pointer"
        >
          {/* Tile header */}
          <div className="px-3.5 pt-3 pb-2.5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{PROPERTY_EMOJI[propertyId] || '🏠'}</span>
                <div>
                  <div className="text-sm font-bold text-gray-900 leading-tight">{PROPERTY_SHORT[propertyId]}</div>
                  <div className="text-[10px] text-gray-400 leading-tight">{PROPERTY_FULL[propertyId]}</div>
                </div>
              </div>
              {count > 0 ? (
                <span className={`text-xs font-bold ${theme.accent} ${theme.light} px-2 py-0.5 rounded-full`}>
                  {count}
                </span>
              ) : (
                <span className="text-[10px] text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">quiet</span>
              )}
            </div>

            {/* Activity indicators */}
            {count > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                <StatPill count={tierDrops} icon={TrendingDown} color="blue" label="Tier drops" />
                <StatPill count={bookings} icon={CalendarCheck} color="green" label="Bookings" />
                <StatPill count={cancellations} icon={AlertTriangle} color="red" label="Cancellations" />
                <StatPill count={gaps} icon={AlertTriangle} color="orange" label="Gaps" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                <span className="text-[10px] text-gray-300">No activity today</span>
              </div>
            )}
          </div>
        </button>

        {/* Expanded log entries */}
        {isExpanded && count > 0 && (
          <div className="border-t border-gray-100 px-3 py-2.5 space-y-1.5 bg-gray-50/40">
            {logs.map(log => <LogEntry key={log.id} log={log} />)}
          </div>
        )}

        {isExpanded && count === 0 && (
          <div className="border-t border-gray-100 px-3 py-4 text-center">
            <p className="text-[11px] text-gray-400">No activity recorded today</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Property Section ───────────────────────────────────────

function HistoryPropertySection({
  propertyId,
  logs,
}: {
  propertyId: string;
  logs: ActivityLog[];
}) {
  const [expanded, setExpanded] = useState(false);
  const count = logs.length;
  if (count === 0) return null;

  const tierDrops = logs.filter(l => l.action_type === 'tier_drop').length;
  const bookings = logs.filter(l => l.action_type === 'booking_received').length;
  const gaps = logs.filter(l => l.action_type === 'gap_detected' || l.action_type === 'gap_found').length;

  const parts: string[] = [];
  if (tierDrops > 0) parts.push(`${tierDrops} tier`);
  if (bookings > 0) parts.push(`${bookings} book`);
  if (gaps > 0) parts.push(`${gaps} gap`);

  const theme = PROPERTY_THEME[propertyId] || PROPERTY_THEME.roadhouse_lodge_room_1;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${theme.gradient} flex-shrink-0`} />
        <span className="text-sm">{PROPERTY_EMOJI[propertyId] || '🏠'}</span>
        <span className="text-sm font-semibold text-gray-800 flex-1 text-left">
          {PROPERTY_SHORT[propertyId]}
          <span className="text-gray-400 font-normal ml-1.5 text-xs">{PROPERTY_FULL[propertyId]}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {tierDrops > 0 && <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{tierDrops} tier</span>}
          {bookings > 0 && <span className="text-[10px] font-semibold text-green-500 bg-green-50 px-1.5 py-0.5 rounded">{bookings} book</span>}
          {gaps > 0 && <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">{gaps} gap</span>}
        </div>
        <span className={`text-xs font-bold ${theme.accent}`}>{count}</span>
        <div className="text-gray-400">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1.5 bg-gray-50/30">
          {logs.map(log => <LogEntry key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  // Filters
  const [property, setProperty] = useState('');
  const [actionType, setActionType] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const startDate = twoDaysAgo.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const filters: ActivityLogFilters = {
        ...(property ? { property } : {}),
        ...(actionType ? { type: actionType as ActivityActionType } : {}),
        startDate,
        endDate,
        limit: viewMode === 'detailed' ? 1000 : 500,
      };

      const data = await api.logs.getAll(filters);
      setLogs(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [property, actionType, viewMode]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchLogs(), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // Deduplicate (summary mode only) and split into today/history
  const dedupedLogs = useMemo(() => viewMode === 'detailed' ? logs : deduplicateLogs(logs), [logs, viewMode]);

  const today = todayStr();
  const todayLogs = useMemo(
    () => dedupedLogs.filter(l => l.created_at.startsWith(today)),
    [dedupedLogs, today]
  );
  const historyLogs = useMemo(
    () => dedupedLogs.filter(l => !l.created_at.startsWith(today)),
    [dedupedLogs, today]
  );

  // Group today's logs by property
  const todayByProperty = useMemo(() => {
    const grouped: Record<string, ActivityLog[]> = {};
    for (const propId of PROPERTY_ORDER) grouped[propId] = [];
    for (const log of todayLogs) {
      const propId = log.property_id;
      if (!grouped[propId]) grouped[propId] = [];
      grouped[propId].push(log);
    }
    return grouped;
  }, [todayLogs]);

  // Group history logs by property
  const historyByProperty = useMemo(() => {
    const grouped: Record<string, ActivityLog[]> = {};
    for (const log of historyLogs) {
      if (!grouped[log.property_id]) grouped[log.property_id] = [];
      grouped[log.property_id].push(log);
    }
    return grouped;
  }, [historyLogs]);

  const historyPropKeys = useMemo(
    () => sortedPropertyKeys(Object.keys(historyByProperty).filter(k => historyByProperty[k].length > 0)),
    [historyByProperty]
  );

  // Detailed view: all logs grouped by property (no today/history split)
  const allByProperty = useMemo(() => {
    const grouped: Record<string, ActivityLog[]> = {};
    for (const propId of PROPERTY_ORDER) grouped[propId] = [];
    for (const log of dedupedLogs) {
      const propId = log.property_id;
      if (!grouped[propId]) grouped[propId] = [];
      grouped[propId].push(log);
    }
    return grouped;
  }, [dedupedLogs]);

  const totalToday = todayLogs.length;
  const totalHistory = historyLogs.length;

  // Summary counts for header
  const todayTierDrops = todayLogs.filter(l => l.action_type === 'tier_drop').length;
  const todayBookings = todayLogs.filter(l => l.action_type === 'booking_received').length;
  const todayGaps = todayLogs.filter(l => l.action_type === 'gap_detected' || l.action_type === 'gap_found').length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-gray-800 to-gray-600 shadow-sm">
              <ScrollText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Activity</h1>
              {!loading && (
                <span className="text-[11px] text-gray-400">{dedupedLogs.length} events · 48h window</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'summary' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                Summary
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'detailed' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-3 h-3" />
                Detailed
              </button>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                autoRefresh ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {autoRefresh ? 'Live' : 'Auto'}
            </button>
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                showFilters ? 'bg-[#F0F4F1] text-[#7C9082]' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={property}
                onChange={e => setProperty(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
              >
                {PROPERTY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
              >
                {ACTION_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Loading / Error */}
        {loading && logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-red-500">
            <p className="text-xs">{error}</p>
            <button onClick={() => fetchLogs()} className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'detailed' ? (
              /* ── DETAILED VIEW ── */
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 px-1 mb-1">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-500">
                    <List className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900">Detailed Activity</span>
                    <span className="text-xs text-gray-400 ml-2">{dedupedLogs.length} entries · 48h · all types</span>
                  </div>
                </div>
                {PROPERTY_ORDER.map(propId => {
                  const propLogs = allByProperty[propId] || [];
                  return (
                    <DetailedPropertySection
                      key={propId}
                      propertyId={propId}
                      logs={propLogs}
                      defaultExpanded={propLogs.length > 0 && propLogs.length <= 20}
                    />
                  );
                })}
              </div>
            ) : (
            <>
            {/* ── TODAY: Summary bar ── */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C9082] to-[#5a6e60]">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900">Today</span>
                  {totalToday > 0 && (
                    <span className="text-xs text-gray-400 ml-2">{totalToday} events</span>
                  )}
                </div>
              </div>
              {totalToday > 0 && (
                <div className="flex items-center gap-2">
                  {todayTierDrops > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-3 h-3" />{todayTierDrops}
                    </span>
                  )}
                  {todayBookings > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <CalendarCheck className="w-3 h-3" />{todayBookings}
                    </span>
                  )}
                  {todayGaps > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />{todayGaps}
                    </span>
                  )}
                </div>
              )}
              {totalToday === 0 && (
                <span className="text-xs text-gray-300 bg-gray-50 px-2.5 py-1 rounded-full">No activity yet</span>
              )}
            </div>

            {/* ── Property Tiles: responsive grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {PROPERTY_ORDER.map(propId => (
                <PropertyTile
                  key={propId}
                  propertyId={propId}
                  logs={todayByProperty[propId] || []}
                  isExpanded={expandedProperty === propId}
                  onToggle={() => setExpandedProperty(expandedProperty === propId ? null : propId)}
                />
              ))}
            </div>

            {/* ── HISTORY ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">History</span>
                  {totalHistory > 0 && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{totalHistory}</span>
                  )}
                </div>
                <div className="text-gray-400">
                  {historyExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              {historyExpanded && (
                <div className="border-t border-gray-100 p-3 space-y-1.5">
                  {historyPropKeys.length === 0 ? (
                    <div className="py-6 text-center text-gray-400">
                      <p className="text-xs">No history in the last 48 hours</p>
                    </div>
                  ) : (
                    historyPropKeys.map(propId => (
                      <HistoryPropertySection
                        key={propId}
                        propertyId={propId}
                        logs={historyByProperty[propId]}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
            </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
