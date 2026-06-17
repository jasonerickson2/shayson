'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, TrendingUp, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { api } from '../../lib/api';
import AppLayout from '../../components/layout/AppLayout';
import PullToRefresh from '../../components/PullToRefresh';

// ─── Types ────────────────────────────────────────────────────────
interface DashboardData {
  today: string;
  curYear: number;
  portfolio: {
    nts26: number;
    rev26: number;
    avgR26: number;
    ntsH: number;
    revH: number;
    avgRH: number;
  };
  properties: {
    [key: string]: PropertyData;
  };
  upGaps: UpcomingEvent[];
  upTails: UpcomingEvent[];
  tierDrops: TierDropEvent[];
  lwGap: { [pid: string]: LastWeekEvent[] };
  lwTail: { [pid: string]: LastWeekEvent[] };
  newBookings: BookingRecord[];
  monthlyRev: { [propShort: string]: number[] };
  monthlyRev24: { [propShort: string]: number[] };
  monthlyRev25: { [propShort: string]: number[] };
}

interface PropertyData {
  short: string;
  name: string;
  group: string;
  nts26: number;
  rev26: number;
  avgR26: number;
  adr: number;
  occRate: number;
  revpar: number;
  ntsH: number;
  revH: number;
  adrH: number;
  ntsPct: number;
  revPct: number;
  adrPct: number;
  months: MonthData[];
}

interface MonthData {
  month: number;
  name: string;
  dim: number;
  b26: number;
  bH: number;
  occ26: number;
  occH: number;
  ratio: number;
  rev26: number;
  revH: number;
  adr26: number;
  adrH: number;
  bestPaceNts: number;
  bestPaceRev: number;
  bestPaceYr: number;
  ratioBestPace: number;
  recordRev: number;
  recordNts: number;
  recordYr: number;
}

interface UpcomingEvent {
  pid: string;
  start?: string;
  end?: string;
  nts?: number;
  gapSize?: number;
  action?: string;
  actionLabel?: string;
  price?: number;
  origPrice?: number;
  minStay?: number;
  explain: string;
  date?: string;
  event?: string;
}

interface TierDropEvent {
  pid: string;
  date: string;
  fromPrice: number;
  toPrice: number;
  drop: number;
  dropPct: number;
  daysUntil: number;
  dateCount: number;
  explain: string;
}

interface LastWeekEvent {
  start?: string;
  end?: string;
  nts?: number;
  gapSize?: number;
  action?: string;
  price?: number;
  origPrice?: number;
  explain: string;
  date?: string;
  eventName?: string;
}

interface BookingRecord {
  prop: string;
  channel: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rate: number;
  payout: number;
}

// ─── Helper Functions ────────────────────────────────────────────────────────
const fmtK = (n: number): string => {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
};

const fmtDollar = (n: number): string => {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

// ─── Record Month Label - renders ★ above the bar that holds the all-time record ───
const RecordLabel = (year: string) => (props: any) => {
  const { x, y, width, value, payload } = props;
  if (!payload?.record || payload.record !== year || !value) return null;
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#B8860B">
      ★
    </text>
  );
};

const pctStr = (n: number): string => {
  if (n > 0) return '+' + n.toFixed(0) + '%';
  return n.toFixed(0) + '%';
};

const fmtDate = (s: string): string => {
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getColorClass = (pct: number): string => {
  if (pct >= 90) return 'bg-green-100 text-green-800';
  if (pct >= 65) return 'bg-yellow-100 text-yellow-800';
  if (pct >= 40) return 'bg-orange-100 text-orange-800';
  if (pct > 0) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

import { PROPERTY_NAMES_WITH_AGGREGATE as propertyNameMap, PROPERTY_GROUP as propertyGroupMap, LODGE_PROPERTIES as lodgeProperties } from '../../config/properties';

const MN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function tileSummary(prop: PropertyData): string {
  const revPct = prop.revPct || 0;
  const ntsPct = prop.ntsPct || 0;
  const adrPct = prop.adrPct || 0;
  const cm = new Date().getMonth() + 1; // 1-based
  const m = (prop.months || [])[cm - 1];
  let s = '';
  if (revPct >= 10) s += `Revenue +${Math.round(revPct)}% ahead of avg pace. `;
  else if (revPct >= 0) s += `Revenue tracking near average. `;
  else s += `Revenue ${Math.round(revPct)}% behind avg pace. `;
  if (ntsPct < -5 && adrPct > 5) s += `Nights down but ADR up ${Math.round(adrPct)}% - higher rates may be limiting bookings.`;
  else if (ntsPct > 5 && adrPct < -5) s += `More nights booked but at lower rates.`;
  else if (ntsPct > 5) s += `Booking volume is strong.`;
  else if (ntsPct < -10) s += `Demand is softer than usual this season.`;
  if (m && m.bH > 0) {
    const diff = m.b26 - m.bH;
    if (diff > 0) s += ` ${MN[cm]}: ${diff} nights ahead of average.`;
    else if (diff < 0) s += ` ${MN[cm]}: ${Math.abs(diff)} nights behind average.`;
  }
  return s;
}

// ─── KPI Card Component ────────────────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: string;
  change: number;
  unit?: string;
}

function KPICard({ label, value, change, unit }: KPICardProps) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {unit && <p className="text-xs text-gray-500 mt-1">{unit}</p>}
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          <span className="text-sm font-semibold">{pctStr(change)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Property Card Component (for overview) ────────────────────────────────────
interface PropertyCardProps {
  propId: string;
  data: PropertyData;
  onClick: () => void;
  size?: 'large' | 'small';
}

function PropertyCard({ propId, data, onClick, size = 'large' }: PropertyCardProps) {
  if (size === 'small') {
    return (
      <button
        onClick={onClick}
        className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-[#A3B8A0] hover:shadow-md transition-all"
      >
        <h3 className="font-semibold text-gray-900 mb-3">{propertyNameMap[propId] || data.name}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Occupancy</span>
            <span className="font-semibold text-gray-900">{data.occRate.toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Revenue</span>
            <span className="font-semibold text-gray-900">{fmtK(data.rev26)}</span>
          </div>
          <div className={`flex justify-between text-xs pt-2 border-t border-gray-100 ${data.revPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            <span>vs Historical</span>
            <span className="font-semibold">{pctStr(data.revPct)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{tileSummary(data)}</p>
        </div>
      </button>
    );
  }

  // Large card
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 text-left hover:border-[#A3B8A0] hover:shadow-md transition-all"
    >
      <h3 className="font-semibold text-gray-900 mb-4 text-lg">{propertyNameMap[propId] || data.name}</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-600 mb-1">Occupancy</p>
          <p className="text-2xl font-bold text-gray-900">{data.occRate.toFixed(0)}%</p>
          <p className={`text-xs mt-1 ${data.ntsPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>{pctStr(data.ntsPct)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{fmtK(data.rev26)}</p>
          <p className={`text-xs mt-1 ${data.revPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>{pctStr(data.revPct)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-600 mb-1">ADR</p>
          <p className="text-xl font-bold text-gray-900">{fmtDollar(data.adr)}</p>
          <p className={`text-xs mt-1 ${data.adrPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>{pctStr(data.adrPct)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">RevPAR</p>
          <p className="text-xl font-bold text-gray-900">{fmtDollar(data.revpar)}</p>
          <p className="text-xs text-gray-500 mt-1">per available night</p>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-4 leading-relaxed">{tileSummary(data)}</p>
    </button>
  );
}

// ─── Event Card Component ────────────────────────────────────────────────────────
interface EventCardProps {
  event: UpcomingEvent | TierDropEvent | LastWeekEvent;
  propMap: { [key: string]: string };
  type: 'gap' | 'tail' | 'drop' | 'lwgap' | 'lwtail';
}

function EventCard({ event, propMap, type }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPid = 'pid' in event;
  const propId = isPid ? event.pid : '';
  const propName = propId ? propertyNameMap[propId] || propMap[propId] || propId : '';

  let title = '';
  let description = '';
  let price = 0;

  if (type === 'gap' && 'gapSize' in event) {
    title = `Gap: ${event.nts} nights`;
    description = `Dates: ${fmtDate(event.start!)} - ${fmtDate(event.end!)}`;
    price = event.price || 0;
  } else if (type === 'tail' && 'date' in event) {
    title = `Tail pricing`;
    description = `Date: ${fmtDate(event.date!)}`;
    price = event.price || 0;
  } else if (type === 'drop' && 'fromPrice' in event) {
    const drop = event as TierDropEvent;
    title = `Price drop: ${drop.fromPrice} → ${drop.toPrice}`;
    description = `In ${drop.daysUntil} days`;
    price = drop.toPrice;
  } else if (type === 'lwgap' && 'gapSize' in event) {
    title = `Last week gap: ${event.nts} nights`;
    description = `Dates: ${fmtDate(event.start!)} - ${fmtDate(event.end!)}`;
    price = event.price || 0;
  } else if (type === 'lwtail' && 'date' in event) {
    title = `Last week tail pricing`;
    description = `Date: ${fmtDate(event.date!)}`;
    price = event.price || 0;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{propName}</p>
          <p className="text-xs text-gray-600 mt-0.5">{title}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
          {price > 0 && <p className="text-sm font-semibold text-gray-900 mt-2">{fmtDollar(price)}</p>}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#7C9082] text-xs font-medium hover:text-[#6B7F71]"
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-700 leading-relaxed">{event.explain}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [calendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'property'>('overview');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedLodgeProperty, setSelectedLodgeProperty] = useState<string>('all_lodge');
  const [expandedUpcomingIndex, setExpandedUpcomingIndex] = useState(0);
  const [expandedLastWeekIndex, setExpandedLastWeekIndex] = useState(0);

  const fetchDashboard = useCallback(async () => {
    try {
      const dashResponse = await fetch(`${import.meta.env.VITE_FUNCTIONS_BASE}/dashboard`);
      const json = await dashResponse.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load dashboard data</p>
        </div>
      </AppLayout>
    );
  }

  if (view === 'property' && selectedProperty) {
    const propData = data.properties[selectedProperty];
    if (!propData) {
      return <AppLayout><div className="text-center py-12">Property not found</div></AppLayout>;
    }

    const group = propertyGroupMap[selectedProperty];
    const isLodge = group === 'lodge';
    const lodgeTabs = isLodge ? lodgeProperties : [selectedProperty];
    const currentTab = isLodge ? selectedLodgeProperty : selectedProperty;

    const tabData = data.properties[currentTab];
    if (!tabData) {
      return <AppLayout><div className="text-center py-12">Tab data not found</div></AppLayout>;
    }

    const currentMonthIndex = new Date().getMonth();
    const currentMonth = tabData.months[currentMonthIndex];

    // Prepare monthly data for heatmap
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
      <AppLayout>
        <div className="space-y-6 pb-6">
          {/* Back Button */}
          <button
            onClick={() => {
              setView('overview');
              setSelectedProperty('');
              setSelectedLodgeProperty('all_lodge');
            }}
            className="flex items-center gap-2 text-[#7C9082] hover:text-[#6B7F71] font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Overview
          </button>

          {/* Property Tabs */}
          {isLodge && (
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
              {lodgeTabs.map((propId) => (
                <button
                  key={propId}
                  onClick={() => setSelectedLodgeProperty(propId)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    currentTab === propId
                      ? 'border-[#7C9082] text-[#7C9082]'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {propertyNameMap[propId] || 'Unknown'}
                </button>
              ))}
            </div>
          )}

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{propertyNameMap[currentTab] || tabData.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Performance details and analytics</p>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Occupancy Rate"
              value={`${tabData.occRate.toFixed(0)}%`}
              change={tabData.ntsPct}
            />
            <KPICard
              label="Revenue (2026)"
              value={fmtK(tabData.rev26)}
              change={tabData.revPct}
            />
            <KPICard
              label="ADR"
              value={fmtDollar(tabData.adr)}
              change={tabData.adrPct}
            />
            <KPICard
              label="RevPAR"
              value={fmtDollar(tabData.revpar)}
              change={((tabData.revpar - (tabData.revpar * tabData.revPct / 100)) > 0 ? ((tabData.revpar / (tabData.revpar - (tabData.revpar * tabData.revPct / 100)) - 1) * 100) : 0)}
            />
          </div>

          {/* Health Summary */}
          <div className={`rounded-lg border p-4 ${tabData.revPct >= 0 ? 'bg-[#F0F4F1] border-[#A3B8A0]' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`text-sm ${tabData.revPct >= 0 ? 'text-[#4A5D4E]' : 'text-orange-900'}`}>
              <span className="font-semibold">Health:</span>{' '}
              Revenue {tabData.revPct >= 0 ? `+${tabData.revPct.toFixed(0)}% above` : `${tabData.revPct.toFixed(0)}% below`} historical.{' '}
              ADR {tabData.adrPct >= 0 ? 'strong' : 'soft'} at {pctStr(tabData.adrPct)} vs avg.{' '}
              Occupancy at {tabData.occRate.toFixed(0)}% ({tabData.ntsPct >= 0 ? '+' : ''}{tabData.ntsPct.toFixed(0)}% vs historical).
            </p>
          </div>

          {/* Current Month Spotlight */}
          {currentMonth && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {currentMonth.name} Spotlight
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Nights Booked</p>
                  <p className="text-3xl font-bold text-gray-900">{currentMonth.b26}</p>
                  <p className="text-xs text-gray-500 mt-1">of {currentMonth.dim} days</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Revenue On Books</p>
                  <p className="text-3xl font-bold text-gray-900">{fmtK(currentMonth.rev26)}</p>
                  <p className="text-xs text-gray-500 mt-1">vs {fmtK(currentMonth.revH)} historical</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Record to Beat</p>
                  <p className="text-3xl font-bold text-gray-900">{fmtK(currentMonth.recordRev)}</p>
                  <p className="text-xs text-gray-500 mt-1">from {currentMonth.recordYr}</p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-900">vs Average Pace</p>
                    <p className={`text-sm font-semibold ${currentMonth.ratio >= 100 ? 'text-green-700' : 'text-red-700'}`}>
                      {currentMonth.ratio}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${currentMonth.ratio >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(currentMonth.ratio, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-900">vs Best Month Record</p>
                    <p className={`text-sm font-semibold ${currentMonth.ratioBestPace >= 100 ? 'text-green-700' : 'text-red-700'}`}>
                      {currentMonth.ratioBestPace}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${currentMonth.ratioBestPace >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(currentMonth.ratioBestPace, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                {currentMonth.b26 > currentMonth.bH
                  ? `${currentMonth.b26 - currentMonth.bH} nights ahead of your typical ${currentMonth.name} pace. Revenue at ${currentMonth.ratio}% of historical average.`
                  : currentMonth.b26 < currentMonth.bH
                  ? `${currentMonth.bH - currentMonth.b26} nights behind your typical ${currentMonth.name} pace. Revenue at ${currentMonth.ratio}% of historical average.`
                  : `Right on pace for ${currentMonth.name}. Revenue at ${currentMonth.ratio}% of historical average.`}
              </p>
            </div>
          )}

          {/* Monthly Performance Heatmap */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Month</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">Booked</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">Revenue</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">vs Avg</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">vs Record</th>
                  </tr>
                </thead>
                <tbody>
                  {tabData.months.map((month, idx) => {
                    const isCurrentMonth = idx === currentMonthIndex;
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-gray-100 ${isCurrentMonth ? 'bg-[#F0F4F1]' : ''}`}
                      >
                        <td className={`py-3 px-3 font-medium ${isCurrentMonth ? 'text-[#6B7F71]' : 'text-gray-900'}`}>
                          {month.name}
                        </td>
                        <td className="text-right py-3 px-3 font-semibold text-gray-900">
                          {month.b26}/{month.dim}
                        </td>
                        <td className="text-right py-3 px-3 font-semibold text-gray-900">
                          {fmtK(month.rev26)}
                        </td>
                        <td className="text-right py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500">{fmtK(month.avgFinalRev || month.revH)}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getColorClass(month.ratioFinal || month.ratio)}`}>
                              {month.ratioFinal || month.ratio}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500">{fmtK(month.recordRev)}</span>
                            {month.rev26 > month.recordRev && month.recordRev > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">Record</span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getColorClass(month.ratioBestPace)}`}>
                              {month.ratioBestPace}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Property Revenue Chart */}
          {(() => {
            const propShort = tabData.short;
            const rev24Arr = data.monthlyRev24?.[propShort] || [];
            const rev25Arr = data.monthlyRev25?.[propShort] || [];
            const rev26Arr = data.monthlyRev?.[propShort] || [];
            const propChartData = monthNames.map((name, idx) => {
              const r24 = rev24Arr[idx] || 0, r25 = rev25Arr[idx] || 0, r26 = rev26Arr[idx] || 0;
              const max = Math.max(r24, r25, r26);
              const record = max > 0 ? (r26 === max ? '2026' : r25 === max ? '2025' : '2024') : null;
              return { month: name, '2024': r24, '2025': r25, '2026': r26, record };
            });
            return (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Month</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={propChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <Tooltip formatter={(value) => fmtK(value as number)} contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="2024" fill="#D4C4A0" radius={[2, 2, 0, 0]}>
                      <LabelList content={RecordLabel('2024')} />
                    </Bar>
                    <Bar dataKey="2025" fill="#C4A97D" radius={[2, 2, 0, 0]}>
                      <LabelList content={RecordLabel('2025')} />
                    </Bar>
                    <Bar dataKey="2026" fill="#7C9082" radius={[2, 2, 0, 0]}>
                      <LabelList content={RecordLabel('2026')} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      </AppLayout>
    );
  }

  // Overview View
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const portfolioChange = data.portfolio.revH > 0 ? ((data.portfolio.rev26 - data.portfolio.revH) / data.portfolio.revH) * 100 : 0;

  // Prepare chart data - sum all properties per month (exclude "Roadhouse Lodge" aggregate to avoid double-counting)
  const chartData = monthNames.map((name, idx) => {
    let rev24 = 0, rev25 = 0, rev26 = 0;
    Object.entries(data.monthlyRev24 || {}).forEach(([k, arr]) => { if (k !== 'Roadhouse Lodge') rev24 += arr[idx] || 0; });
    Object.entries(data.monthlyRev25 || {}).forEach(([k, arr]) => { if (k !== 'Roadhouse Lodge') rev25 += arr[idx] || 0; });
    Object.entries(data.monthlyRev || {}).forEach(([k, arr]) => { if (k !== 'Roadhouse Lodge') rev26 += arr[idx] || 0; });
    return { month: name, '2024': rev24, '2025': rev25, '2026': rev26 };
  });

  // Collect all upcoming events
  const allUpcomingEvents = [
    ...data.upGaps.map(e => ({ ...e, type: 'gap' as const })),
    ...data.upTails.map(e => ({ ...e, type: 'tail' as const })),
    ...data.tierDrops.map(e => ({ ...e, type: 'drop' as const })),
  ].sort((a, b) => {
    const dateA = (a as any).start || (a as any).date;
    const dateB = (b as any).start || (b as any).date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  // Collect all last week events
  const allLastWeekEvents: any[] = [];
  Object.entries(data.lwGap).forEach(([pid, events]) => {
    events.forEach(e => allLastWeekEvents.push({ ...e, pid, type: 'lwgap' }));
  });
  Object.entries(data.lwTail).forEach(([pid, events]) => {
    events.forEach(e => allLastWeekEvents.push({ ...e, pid, type: 'lwtail' }));
  });
  allLastWeekEvents.sort((a, b) => {
    const dateA = (a as any).start || (a as any).date;
    const dateB = (b as any).start || (b as any).date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  const upcomingToShow = allUpcomingEvents.slice(0, 4);
  const hasMoreUpcoming = allUpcomingEvents.length > 4;
  const lastWeekToShow = allLastWeekEvents.slice(0, 4);
  const hasMoreLastWeek = allLastWeekEvents.length > 4;

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Portfolio performance overview</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Total Revenue"
            value={fmtK(data.portfolio.rev26)}
            change={data.portfolio.revH > 0 ? ((data.portfolio.rev26 - data.portfolio.revH) / data.portfolio.revH) * 100 : 0}
          />
          <KPICard
            label="Occupancy %"
            value={((data.portfolio.nts26 / 2190) * 100).toFixed(0) + '%'}
            change={data.portfolio.ntsH > 0 ? ((data.portfolio.nts26 - data.portfolio.ntsH) / data.portfolio.ntsH) * 100 : 0}
          />
          <KPICard
            label="ADR"
            value={fmtDollar(data.portfolio.avgR26)}
            change={data.portfolio.avgRH > 0 ? ((data.portfolio.avgR26 - data.portfolio.avgRH) / data.portfolio.avgRH) * 100 : 0}
          />
          <KPICard
            label="RevPAR"
            value={fmtDollar(Math.round(data.portfolio.rev26 / 2190))}
            change={portfolioChange}
          />
        </div>

        {/* Health Summary */}
        <div className={`rounded-lg border p-4 ${portfolioChange >= 0 ? 'bg-[#F0F4F1] border-[#A3B8A0]' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-sm ${portfolioChange >= 0 ? 'text-[#4A5D4E]' : 'text-orange-900'}`}>
            <span className="font-semibold">Portfolio Health:</span>{' '}
            Revenue is {portfolioChange >= 0 ? `${Math.abs(portfolioChange).toFixed(0)}% above` : `${Math.abs(portfolioChange).toFixed(0)}% below`} historical pace at {fmtDollar(data.portfolio.rev26)}.{' '}
            ADR {data.portfolio.avgR26 > data.portfolio.avgRH ? 'trending strong' : 'below target'} at {fmtDollar(data.portfolio.avgR26)}{' '}
            ({data.portfolio.avgR26 > data.portfolio.avgRH ? '+' : ''}{((data.portfolio.avgR26 - data.portfolio.avgRH) / data.portfolio.avgRH * 100).toFixed(0)}% vs historical {fmtDollar(data.portfolio.avgRH)}).
          </p>
        </div>

        {/* Property Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PropertyCard
            propId="grizzly_maze"
            data={data.properties.grizzly_maze}
            onClick={() => {
              setSelectedProperty('grizzly_maze');
              setView('property');
            }}
            size="large"
          />
          <PropertyCard
            propId="all_lodge"
            data={data.properties.all_lodge}
            onClick={() => {
              setSelectedProperty('all_lodge');
              setSelectedLodgeProperty('all_lodge');
              setView('property');
            }}
            size="large"
          />
        </div>

        {/* Property Cards - Row 2 */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {['roadhouse_lodge_room_1', 'roadhouse_lodge_room_2', 'roadhouse_lodge_room_3', 'carriage_house', 'penthouse'].map(
              (propId) => (
                <PropertyCard
                  key={propId}
                  propId={propId}
                  data={data.properties[propId]}
                  onClick={() => {
                    setSelectedProperty('all_lodge');
                    setSelectedLodgeProperty(propId);
                    setView('property');
                  }}
                  size="small"
                />
              )
            )}
          </div>
        </div>

        {/* Upcoming & Last Week Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Week */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Week</h2>
            <div className="space-y-3">
              {upcomingToShow.length > 0 ? (
                <>
                  {upcomingToShow.map((event, idx) => (
                    <EventCard
                      key={idx}
                      event={event as UpcomingEvent | TierDropEvent}
                      propMap={propertyNameMap}
                      type={event.type}
                    />
                  ))}
                  {hasMoreUpcoming && (
                    <button className="w-full py-2 text-center text-sm text-[#7C9082] hover:text-[#6B7F71] font-medium">
                      Show {allUpcomingEvents.length - 4} more
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm">No upcoming events</p>
              )}
            </div>
          </div>

          {/* Last Week Detections */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Last Week Detections</h2>
            <div className="space-y-3">
              {lastWeekToShow.length > 0 ? (
                <>
                  {lastWeekToShow.map((event, idx) => (
                    <EventCard
                      key={idx}
                      event={event as any}
                      propMap={propertyNameMap}
                      type={event.type}
                    />
                  ))}
                  {hasMoreLastWeek && (
                    <button className="w-full py-2 text-center text-sm text-[#7C9082] hover:text-[#6B7F71] font-medium">
                      Show {allLastWeekEvents.length - 4} more
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm">No recent detections</p>
              )}
            </div>
          </div>
        </div>

        {/* New Bookings Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Bookings</h2>
          {data.newBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Property</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Channel</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Check-In</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">Check-Out</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">Nights</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">Rate</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {data.newBookings.map((booking, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-900 font-medium">
                        {propertyNameMap[booking.prop] || booking.prop}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            booking.channel.toLowerCase() === 'airbnb'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {booking.channel.charAt(0).toUpperCase() + booking.channel.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-700">{fmtDate(booking.checkIn)}</td>
                      <td className="py-3 px-3 text-gray-700">{fmtDate(booking.checkOut)}</td>
                      <td className="text-right py-3 px-3 text-gray-900 font-semibold">{booking.nights}</td>
                      <td className="text-right py-3 px-3 text-gray-900 font-semibold">
                        {fmtDollar(booking.rate)}
                      </td>
                      <td className="text-right py-3 px-3 text-gray-900 font-bold">
                        {fmtDollar(booking.payout)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No new bookings</p>
          )}
        </div>

        {/* Revenue chart moved to Analytics page - tap Analytics in nav for full charts */}
      </div>
      </PullToRefresh>
    </AppLayout>
  );
}
