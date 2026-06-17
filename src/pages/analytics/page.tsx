'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LabelList } from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import PullToRefresh from '../../components/PullToRefresh';

// ─── Cafe Types ────────────────────────────────────────────────────
interface CafeData {
  curYear: number;
  curMonth: number;
  totalRows: number;
  kpi: {
    totalGross: number;
    totalTips: number;
    totalOrders: number;
    totalItems: number;
    avgTicket: number;
    ytdGross: number;
    ytdTips: number;
    ytdOrders: number;
    currentMonthRev: number;
    currentMonthOrders: number;
    yoyPct: number | null;
    ytdCashOnHand: number;
    totalCashOnHand: number;
    todaySales: number;
    todaySalesGross: number;
    todayTips: number;
    todayOrders: number;
    tipJarBalance: number;
    totalTipsWithJar: number;
  };
  monthlyRev: Record<string, number[]>;
  monthlyTips: Record<string, number[]>;
  monthlyOrders: Record<string, number[]>;
  topSellers: Array<{ name: string; sold: number; gross: number; avgPrice: number }>;
  hourly: Array<{ hour: number; label: string; revenue: number; orders: number }>;
  dow: Array<{ day: string; revenue: number; orders: number }>;
  years: number[];
}

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

// ─── Constants ────────────────────────────────────────────────────────
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

import { PROPERTY_NAMES_WITH_AGGREGATE as propertyNameMap, PALETTE, PIE_COLORS } from '../../config/properties';

const { SAGE, SAGE_LIGHT, TAN, TAN_LIGHT, WARM_CREAM, SLATE } = PALETTE;

// ─── Helpers ────────────────────────────────────────────────────────
const fmtK = (n: number): string => {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
};

const fmtDollar = (n: number): string => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtCents = (n: number): string => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// ─── Occupancy Ring Component ────────────────────────────────────────────────
function OccupancyRing({ value, label, size = 80 }: { value: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? SAGE : value >= 40 ? TAN : '#DC6B5A';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E8E4DE" strokeWidth="5" fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color} strokeWidth="5" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-600 font-medium">{label}</span>
    </div>
  );
}

// ─── Stat Card Component ────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-gradient-to-br from-[#7C9082] to-[#6B7F71] text-white' : 'bg-white border border-gray-200'}`}>
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-white/80' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-xl sm:text-2xl font-bold ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

// ─── Month Heatmap Bar ────────────────────────────────────────────────
function MonthBar({ month, occ, isCurrentMonth }: { month: string; occ: number; isCurrentMonth: boolean }) {
  const height = Math.max(4, (occ / 100) * 60);
  const color = occ >= 70 ? SAGE : occ >= 40 ? TAN : '#DC6B5A';
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
        <div
          className="w-full max-w-[20px] rounded-t-sm transition-all duration-500"
          style={{ height, backgroundColor: color, opacity: isCurrentMonth ? 1 : 0.7 }}
        />
      </div>
      <span className={`text-[10px] font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
        {month}
      </span>
    </div>
  );
}

// ─── Main Analytics Component ────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cafeData, setCafeData] = useState<CafeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProp, setSelectedProp] = useState<string>('portfolio');
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [tipInput, setTipInput] = useState('');
  const [tipSaving, setTipSaving] = useState(false);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashMode, setCashMode] = useState<'deposit' | 'withdrawal' | null>(null);
  const [cashInput, setCashInput] = useState('');
  const [cashSaving, setCashSaving] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [dashResp, cafeResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_FUNCTIONS_BASE}/dashboard`),
        fetch(`${import.meta.env.VITE_FUNCTIONS_BASE}/cafe-dashboard`).catch(() => null),
      ]);
      const json = await dashResp.json();
      setData(json);
      if (cafeResp) {
        const cafeJson = await cafeResp.json();
        setCafeData(cafeJson);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  const saveTipJar = useCallback(async () => {
    const val = parseFloat(tipInput);
    if (isNaN(val) || val < 0) return;
    setTipSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_FUNCTIONS_BASE}/cafe-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tip_jar_balance', value: val }),
      });
      setTipModalOpen(false);
      setTipInput('');
      await fetchAnalytics();
    } catch (err) {
      console.error('Failed to save tip jar:', err);
    } finally {
      setTipSaving(false);
    }
  }, [tipInput, fetchAnalytics]);

  const saveCashAdjustment = useCallback(async () => {
    const val = parseFloat(cashInput);
    if (isNaN(val) || val <= 0 || !cashMode || !cafeData) return;
    setCashSaving(true);
    const current = cafeData.kpi.totalCashOnHand || 0;
    const newVal = cashMode === 'deposit' ? current + val : current - val;
    // We adjust historical_cash_balance to achieve the desired total
    // totalCashOnHand = historical_cash_balance + tracked_cash_sales
    // So new_seed = newVal - tracked_cash_sales
    // tracked_cash_sales = totalCashOnHand - historical_cash_balance_current
    // But simpler: just adjust the seed by the delta
    const delta = cashMode === 'deposit' ? val : -val;
    const currentSeed = (cafeData.kpi.totalCashOnHand || 0) - (cafeData.kpi.ytdCashOnHand || 0);
    const newSeed = currentSeed + delta;
    try {
      await fetch(`${import.meta.env.VITE_FUNCTIONS_BASE}/cafe-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'historical_cash_balance', value: newSeed }),
      });
      setCashModalOpen(false);
      setCashMode(null);
      setCashInput('');
      await fetchAnalytics();
    } catch (err) {
      console.error('Failed to save cash adjustment:', err);
    } finally {
      setCashSaving(false);
    }
  }, [cashInput, cashMode, cafeData, fetchAnalytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 p-2">
          <div className="h-6 bg-gray-200 rounded w-40 mx-auto animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Unable to load analytics</p>
        </div>
      </AppLayout>
    );
  }

  const currentMonthIdx = new Date().getMonth();
  const portfolio = data.portfolio;

  // Cafe 2026 revenue (sum monthly rev for current year)
  const cafeRev26 = cafeData ? (cafeData.monthlyRev[data.curYear.toString()] || []).reduce((s, v) => s + v, 0) : 0;
  const cafeRev25 = cafeData ? (cafeData.monthlyRev[(data.curYear - 1).toString()] || []).reduce((s, v) => s + v, 0) : 0;
  const cafeRev24 = cafeData ? (cafeData.monthlyRev[(data.curYear - 2).toString()] || []).reduce((s, v) => s + v, 0) : 0;

  // Revenue chart data - 3-year comparison
  const revenueChartData = monthNames.map((name, idx) => {
    let rev24 = 0, rev25 = 0, rev26 = 0;
    if (selectedProp === 'portfolio') {
      // Exclude "Roadhouse Lodge" (all_lodge aggregate) to avoid double-counting individual rooms
      // Cafe has its own tab - keep All Properties chart rental-only
      Object.entries(data.monthlyRev24 || {}).forEach(([k, arr]) => { if (k !== 'Roadhouse Lodge') rev24 += arr[idx] || 0; });
      Object.entries(data.monthlyRev25 || {}).forEach(([k, arr]) => { if (k !== 'Roadhouse Lodge') rev25 += arr[idx] || 0; });
      Object.entries(data.monthlyRev || {}).forEach(([k, arr]) => { if (k !== 'Roadhouse Lodge') rev26 += arr[idx] || 0; });
    } else if (selectedProp === 'cafe') {
      if (cafeData) {
        rev24 = (cafeData.monthlyRev[(data.curYear - 2).toString()] || [])[idx] || 0;
        rev25 = (cafeData.monthlyRev[(data.curYear - 1).toString()] || [])[idx] || 0;
        rev26 = (cafeData.monthlyRev[data.curYear.toString()] || [])[idx] || 0;
      }
    } else {
      const propData = data.properties[selectedProp];
      if (propData) {
        const s = propData.short;
        rev24 = (data.monthlyRev24?.[s] || [])[idx] || 0;
        rev25 = (data.monthlyRev25?.[s] || [])[idx] || 0;
        rev26 = (data.monthlyRev?.[s] || [])[idx] || 0;
      }
    }
    // Determine which year holds the record for this month
    const max = Math.max(rev24, rev25, rev26);
    const record = max > 0 ? (rev26 === max ? '2026' : rev25 === max ? '2025' : '2024') : null;
    return { month: name, '2024': rev24, '2025': rev25, '2026': rev26, record };
  });

  // Occupancy trend data - paced comparison (bookings made by equivalent date in prior years)
  const occTrendData = monthNames.map((name, idx) => {
    if (selectedProp === 'portfolio') {
      // Average occupancy across properties
      const props = Object.entries(data.properties).filter(([id]) => id !== 'all_lodge').map(([, p]) => p);
      const avg26 = props.reduce((s, p) => s + (p.months?.[idx]?.occ26 || 0), 0) / (props.length || 1);
      const avgH = props.reduce((s, p) => s + (p.months?.[idx]?.occH || 0), 0) / (props.length || 1);
      return { month: name, 'Current Pace': Math.round(avg26), 'Historical Pace': Math.round(avgH) };
    } else {
      const propData = data.properties[selectedProp];
      const m = propData?.months?.[idx];
      return { month: name, 'Current Pace': Math.round(m?.occ26 || 0), 'Historical Pace': Math.round(m?.occH || 0) };
    }
  });

  // Revenue breakdown by property for pie chart
  const revenueBreakdown = Object.entries(data.properties)
    .filter(([id]) => !['all_lodge'].includes(id))
    .filter(([, p]) => p.rev26 > 0)
    .map(([id, p]) => ({
      name: propertyNameMap[id] || p.name,
      value: Math.round(p.rev26),
    }));
  // Cafe has its own tab - keep All Properties pie rental-only
  revenueBreakdown.sort((a, b) => b.value - a.value);

  // Property selector options - fixed order: All Properties, Grizzly, Lodge, Penthouse, R1, R2, R3, Carriage House
  const PROP_ORDER = ['portfolio', 'grizzly_maze', 'all_lodge', 'penthouse', 'roadhouse_lodge_room_1', 'roadhouse_lodge_room_2', 'roadhouse_lodge_room_3', 'carriage_house', 'cafe'];
  const propOptions = PROP_ORDER
    .filter(id => id === 'portfolio' || id === 'cafe' || data.properties[id])
    .filter(id => id !== 'cafe' || cafeData) // only show cafe if data loaded
    .map(id => ({
      id,
      label: id === 'portfolio' ? 'All Properties' : id === 'cafe' ? 'Cafe' : (propertyNameMap[id] || data.properties[id]?.name || id),
    }));

  // Dynamic denominator: count active properties (exclude all_lodge aggregate)
  const activePropertyCount = Object.keys(data.properties).filter(id => id !== 'all_lodge').length;
  const totalAvailNights = 365 * activePropertyCount;

  // Get current property stats
  // All Properties tab shows rental-only revenue (cafe has its own tab)
  const rentalRevPct = portfolio.revH > 0 ? ((portfolio.rev26 - portfolio.revH) / portfolio.revH) * 100 : 0;
  const combinedRev = portfolio.rev26 + cafeRev26;
  const currentStats = selectedProp === 'portfolio'
    ? {
        rev: portfolio.rev26,
        adr: portfolio.avgR26,
        occ: totalAvailNights > 0 ? Math.round((portfolio.nts26 / totalAvailNights) * 100) : 0,
        revpar: totalAvailNights > 0 ? Math.round(portfolio.rev26 / totalAvailNights) : 0,
        revPct: rentalRevPct,
      }
    : selectedProp === 'cafe'
    ? {
        rev: cafeRev26,
        adr: cafeData ? Math.round(cafeData.kpi.avgTicket) : 0,
        occ: 0,
        revpar: 0,
        revPct: cafeRev25 > 0 ? ((cafeRev26 - cafeRev25) / cafeRev25) * 100 : 0,
      }
    : (() => {
        const p = data.properties[selectedProp];
        return p ? { rev: p.rev26, adr: p.adr, occ: Math.round(p.occRate), revpar: p.revpar, revPct: p.revPct } : { rev: 0, adr: 0, occ: 0, revpar: 0, revPct: 0 };
      })();

  // Monthly occupancy for heatmap
  const monthlyOcc = selectedProp === 'portfolio'
    ? monthNames.map((_, idx) => {
        const props = Object.entries(data.properties).filter(([id]) => id !== 'all_lodge').map(([, p]) => p);
        return Math.round(props.reduce((s, p) => s + (p.months?.[idx]?.occ26 || 0), 0) / (props.length || 1));
      })
    : (data.properties[selectedProp]?.months || []).map(m => Math.round(m.occ26 || 0));

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-5 pb-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Visual performance insights</p>
        </div>

        {/* Property Selector */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 overflow-x-auto px-1 py-1 rounded-xl" style={{ backgroundColor: WARM_CREAM }}>
            {propOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedProp(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  selectedProp === opt.id
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={selectedProp === opt.id ? { backgroundColor: SAGE } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Stats Grid - Cafe view */}
        {selectedProp === 'cafe' && cafeData && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="All Properties" value={fmtK(combinedRev)} sub={`Rentals + Cafe`} accent />
            <StatCard label="Cafe YTD" value={fmtK(cafeRev26)} sub={<>{fmtK(cafeRev26 + cafeData.kpi.ytdTips)} w/ tips<br/>{currentStats.revPct >= 0 ? '+' : ''}{currentStats.revPct.toFixed(0)}% vs last yr</>} />
            <StatCard label="Today's Sales" value={fmtCents(cafeData.kpi.todaySales || 0)} sub={`${fmtCents(cafeData.kpi.todaySalesGross || 0)} + ${fmtCents(cafeData.kpi.todayTips || 0)} tips`} />
            <div onClick={() => { setTipInput(''); setTipModalOpen(true); }} className="cursor-pointer active:scale-95 transition-transform">
              <StatCard label="Tips (2026)" value={fmtK(cafeData.kpi.totalTipsWithJar)} sub={`${fmtK(cafeData.kpi.ytdTips)} card + ${fmtCents(cafeData.kpi.tipJarBalance || 0)} cash`} />
            </div>
            <div onClick={() => { setCashMode(null); setCashInput(''); setCashModalOpen(true); }} className="cursor-pointer active:scale-95 transition-transform">
              <StatCard label="Cash on Hand" value={fmtCents(cafeData.kpi.totalCashOnHand || 0)} sub={`${fmtCents(cafeData.kpi.ytdCashOnHand || 0)} tracked`} />
            </div>
            <StatCard label="Avg Ticket" value={fmtDollar(cafeData.kpi.avgTicket)} sub="per order" />
          </div>
        )}

        {/* Top Stats Grid - Rental view */}
        {selectedProp !== 'cafe' && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Revenue" value={fmtK(currentStats.rev)} sub={`${currentStats.revPct >= 0 ? '+' : ''}${currentStats.revPct.toFixed(0)}% vs avg`} accent />
          <StatCard label="Occupancy" value={`${currentStats.occ}%`} sub="booked nights" />
          <StatCard label="ADR" value={fmtDollar(currentStats.adr)} sub="avg daily rate" />
          <StatCard label="RevPAR" value={fmtDollar(currentStats.revpar)} sub="per available night" />
        </div>
        )}

        {/* ═══ CAFE-SPECIFIC CHARTS ═══ */}
        {selectedProp === 'cafe' && cafeData && (() => {
          const cafeYears = cafeData.years.filter(y => cafeData.monthlyRev[y.toString()]);
          const cafeColorPool = [TAN_LIGHT, TAN, SAGE_LIGHT, SAGE];
          const cafeYearColors: Record<string, string> = {};
          cafeYears.forEach((yr, i) => { cafeYearColors[yr.toString()] = cafeColorPool[i % cafeColorPool.length]; });
          const cafeRevChart = monthNames.map((name, idx) => {
            const entry: any = { month: name };
            let maxVal = 0; let maxYear: string | null = null;
            for (const yr of cafeYears) {
              const val = (cafeData.monthlyRev[yr.toString()] || [])[idx] || 0;
              entry[yr.toString()] = val;
              if (val > maxVal) { maxVal = val; maxYear = yr.toString(); }
            }
            entry.record = maxYear;
            return entry;
          });
          const topPieData = cafeData.topSellers.slice(0, 6).map(s => ({
            name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
            value: Math.round(s.gross),
          }));
          const hourlyData = cafeData.hourly.filter(h => h.hour >= 7 && h.hour <= 19);
          return (
            <>
              {/* Cafe Revenue by Month */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue by Month</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cafeRevChart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: number) => fmtK(value)} contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {cafeYears.map(yr => (
                      <Bar key={yr} dataKey={yr.toString()} fill={cafeYearColors[yr.toString()]} radius={[2, 2, 0, 0]}>
                        <LabelList content={RecordLabel(yr.toString())} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Share Pie */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue Share</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={topPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {topPieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => fmtK(value)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                    {topPieData.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-xs text-gray-600">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Revenue by Hour */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue by Hour (MT)</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => fmtK(v)} />
                    <Tooltip formatter={(value: number, name: string) => [fmtK(value), name === 'revenue' ? 'Revenue' : name]} contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }} />
                    <Bar dataKey="revenue" fill={SAGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue by Day of Week */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue by Day of Week</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cafeData.dow} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => fmtK(v)} />
                    <Tooltip formatter={(value: number) => fmtK(value)} contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }} />
                    <Bar dataKey="revenue" fill={SAGE} radius={[4, 4, 0, 0]}>
                      {cafeData.dow.map((entry, idx) => (
                        <Cell key={idx} fill={['Fri', 'Sat', 'Sun'].includes(entry.day) ? SAGE : TAN_LIGHT} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Sellers Table */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
                <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Top Sellers</h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">#</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-600">Item</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Sold</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Revenue</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-600">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cafeData.topSellers.map((item, idx) => (
                      <tr key={item.name} className="border-b border-gray-50">
                        <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium text-gray-900 capitalize">{item.name}</td>
                        <td className="text-right py-2 px-2 text-gray-600">{item.sold.toLocaleString()}</td>
                        <td className="text-right py-2 px-2 font-semibold text-gray-900">{fmtK(item.gross)}</td>
                        <td className="text-right py-2 px-2 text-gray-600">${item.avgPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}

        {/* Occupancy Rings by Property */}
        {selectedProp === 'portfolio' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 text-center mb-4">Occupancy by Property</h2>
            <div className="flex justify-around flex-wrap gap-3">
              {Object.entries(data.properties)
                .filter(([id]) => !['all_lodge'].includes(id))
                .map(([id, p]) => (
                  <OccupancyRing key={id} value={Math.round(p.occRate)} label={propertyNameMap[id] || p.name} />
                ))}
            </div>
          </div>
        )}

        {/* ═══ RENTAL-ONLY SECTIONS (hidden when cafe selected) ═══ */}
        {selectedProp !== 'cafe' && (<>
        {/* Monthly Occupancy Heatmap */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Monthly Occupancy</h2>
          <div className="flex items-end gap-0.5">
            {monthNames.map((m, idx) => (
              <MonthBar key={m} month={m} occ={monthlyOcc[idx] || 0} isCurrentMonth={idx === currentMonthIdx} />
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SAGE }} />
              <span className="text-[10px] text-gray-500">70%+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TAN }} />
              <span className="text-[10px] text-gray-500">40-70%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#DC6B5A' }} />
              <span className="text-[10px] text-gray-500">&lt;40%</span>
            </div>
          </div>
        </div>

        {/* Revenue Chart - 3-Year Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue by Month</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value: number) => fmtK(value)}
                contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="2024" fill={TAN_LIGHT} radius={[2, 2, 0, 0]}>
                <LabelList content={RecordLabel('2024')} />
              </Bar>
              <Bar dataKey="2025" fill={TAN} radius={[2, 2, 0, 0]}>
                <LabelList content={RecordLabel('2025')} />
              </Bar>
              <Bar dataKey="2026" fill={SAGE} radius={[2, 2, 0, 0]}>
                <LabelList content={RecordLabel('2026')} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Trend - Area Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Occupancy Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={occTrendData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="sageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SAGE} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SAGE} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="tanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TAN} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={TAN} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number) => `${value}%`}
                contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Current Pace" stroke={SAGE} fill="url(#sageGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Historical Pace" stroke={TAN} fill="url(#tanGrad)" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown Pie */}
        {selectedProp === 'portfolio' && revenueBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue Share</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmtK(value)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {revenueBreakdown.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Detail Table - compact */}
        {selectedProp !== 'portfolio' && data.properties[selectedProp] && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Month-by-Month</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold text-gray-600">Month</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600">Booked</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600">Rev</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-600">vs Avg</th>
                </tr>
              </thead>
              <tbody>
                {data.properties[selectedProp].months.map((m, idx) => {
                  const isCurrent = idx === currentMonthIdx;
                  const pct = m.ratio;
                  const pctColor = pct >= 90 ? 'text-green-700 bg-green-50' : pct >= 65 ? 'text-yellow-700 bg-yellow-50' : pct >= 40 ? 'text-orange-700 bg-orange-50' : 'text-red-700 bg-red-50';
                  return (
                    <tr key={idx} className={`border-b border-gray-50 ${isCurrent ? 'bg-[#F5F0E8]' : ''}`}>
                      <td className={`py-2 px-2 font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-700'}`}>{m.name}</td>
                      <td className="text-right py-2 px-2 text-gray-900">{m.b26}/{m.dim}</td>
                      <td className="text-right py-2 px-2 font-semibold text-gray-900">{fmtK(m.rev26)}</td>
                      <td className="text-right py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${pctColor}`}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </>)}
      </div>

      {/* Tip Jar Modal */}
      {tipModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setTipModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cash Tip Jar</h3>
            <p className="text-xs text-gray-500 mb-4">Enter the total cash tips collected</p>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={tipInput}
                onChange={e => setTipInput(e.target.value)}
                className="w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C9082] focus:border-transparent"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTipModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveTipJar}
                disabled={tipSaving || !tipInput}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#7C9082' }}
              >
                {tipSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cash on Hand Modal */}
      {cashModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setCashModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cash on Hand</h3>
            {!cashMode ? (
              <>
                <p className="text-xs text-gray-500 mb-4">What would you like to do?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCashMode('deposit')}
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-white"
                    style={{ backgroundColor: '#7C9082' }}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setCashMode('withdrawal')}
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-[#C4956A]"
                  >
                    Withdrawal
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  {cashMode === 'deposit' ? 'Add cash to the balance' : 'Remove cash from the balance'}
                </p>
                <div className="relative mb-4">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={cashInput}
                    onChange={e => setCashInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C9082] focus:border-transparent"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCashMode(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700"
                  >
                    Back
                  </button>
                  <button
                    onClick={saveCashAdjustment}
                    disabled={cashSaving || !cashInput}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: cashMode === 'deposit' ? '#7C9082' : '#C4956A' }}
                  >
                    {cashSaving ? 'Saving...' : cashMode === 'deposit' ? 'Deposit' : 'Withdraw'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </PullToRefresh>
    </AppLayout>
  );
}
