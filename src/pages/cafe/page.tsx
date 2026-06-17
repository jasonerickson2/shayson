'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import PullToRefresh from '../../components/PullToRefresh';
import { PALETTE, PIE_COLORS } from '../../config/properties';
import { api } from '../../lib/api';

const { SAGE, SAGE_LIGHT, TAN, TAN_LIGHT, WARM_CREAM } = PALETTE;

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Types ────────────────────────────────────────────────────────
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
  };
  monthlyRev: Record<string, number[]>;
  monthlyTips: Record<string, number[]>;
  monthlyOrders: Record<string, number[]>;
  topSellers: Array<{ name: string; sold: number; gross: number; avgPrice: number }>;
  hourly: Array<{ hour: number; label: string; revenue: number; orders: number }>;
  dow: Array<{ day: string; revenue: number; orders: number }>;
  years: number[];
}

// ─── Helpers ────────────────────────────────────────────────────────
const fmtK = (n: number): string => {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
};

const fmtDollar = (n: number): string => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// ─── Record Month Label ────────────────────────────────────────────
const RecordLabel = (year: string) => (props: any) => {
  const { x, y, width, value, payload } = props;
  if (!payload?.record || payload.record !== year || !value) return null;
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#B8860B">
      &#9733;
    </text>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-gradient-to-br from-[#7C9082] to-[#6B7F71] text-white' : 'bg-white border border-gray-200'}`}>
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-white/80' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-xl sm:text-2xl font-bold ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function CafePage() {
  const [data, setData] = useState<CafeData | null>(null);
  const [rentalRevenue, setRentalRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'products' | 'hours'>('overview');

  const fetchData = useCallback(async () => {
    try {
      const [cafeResp, dashStats] = await Promise.all([
        fetch(`${import.meta.env.VITE_FUNCTIONS_BASE}/cafe-dashboard`),
        api.dashboard.getStats().catch(() => null),
      ]);
      const json = await cafeResp.json();
      setData(json);
      if (dashStats) setRentalRevenue(dashStats.totalRevenue);
    } catch (err) {
      console.error('Failed to fetch cafe data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          <p className="text-gray-600">Unable to load cafe data</p>
        </div>
      </AppLayout>
    );
  }

  const { kpi } = data;
  const currentMonthIdx = new Date().getMonth();

  // Revenue chart data - multi-year comparison
  const years = data.years.filter(y => data.monthlyRev[y.toString()]);
  const revenueChartData = monthNames.map((name, idx) => {
    const entry: any = { month: name };
    let maxVal = 0;
    let maxYear: string | null = null;
    for (const yr of years) {
      const val = (data.monthlyRev[yr.toString()] || [])[idx] || 0;
      entry[yr.toString()] = val;
      if (val > maxVal) { maxVal = val; maxYear = yr.toString(); }
    }
    entry.record = maxYear;
    return entry;
  });

  // Color assignments for up to 4 years
  const yearColors: Record<string, string> = {};
  const colorPool = [TAN_LIGHT, TAN, SAGE_LIGHT, SAGE];
  years.forEach((yr, i) => { yearColors[yr.toString()] = colorPool[i % colorPool.length]; });

  // Top sellers pie data
  const topPieData = data.topSellers.slice(0, 6).map(s => ({
    name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
    value: Math.round(s.gross),
  }));

  // Hourly bar data (filtered to 7am-7pm)
  const hourlyData = data.hourly.filter(h => h.hour >= 7 && h.hour <= 19);

  // DOW bar data
  const dowData = data.dow;

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-5 pb-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cafe</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Roadhouse Coffee Shop</p>
        </div>

        {/* View Selector */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 px-1 py-1 rounded-xl" style={{ backgroundColor: WARM_CREAM }}>
            {(['overview', 'products', 'hours'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  view === v ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                style={view === v ? { backgroundColor: SAGE } : {}}
              >
                {v === 'overview' ? 'Overview' : v === 'products' ? 'Products' : 'Hours & Days'}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {view === 'overview' && (
          <>
            {/* Portfolio Total Banner */}
            {rentalRevenue !== null && (
              <div className="rounded-xl p-4 bg-gradient-to-r from-[#3D5A45] to-[#7C9082] text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/70">Total Portfolio Revenue</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1">{fmtK(rentalRevenue + kpi.totalGross)}</p>
                    <p className="text-[10px] text-white/60 mt-1">All rentals + cafe combined</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div>
                      <p className="text-[10px] text-white/60">Rentals</p>
                      <p className="text-sm font-semibold">{fmtK(rentalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/60">Cafe</p>
                      <p className="text-sm font-semibold">{fmtK(kpi.totalGross)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="All-Time Revenue"
                value={fmtK(kpi.totalGross)}
                sub={`+ ${fmtK(kpi.totalTips)} tips`}
                accent
              />
              <StatCard
                label="Total Orders"
                value={kpi.totalOrders.toLocaleString()}
                sub={`${kpi.totalItems.toLocaleString()} items`}
              />
              <StatCard
                label="Avg Ticket"
                value={fmtDollar(kpi.avgTicket)}
                sub="per order"
              />
              <StatCard
                label="YTD Revenue"
                value={fmtK(kpi.ytdGross)}
                sub={kpi.yoyPct !== null ? `${kpi.yoyPct >= 0 ? '+' : ''}${kpi.yoyPct}% vs last yr` : 'no prior year data'}
              />
            </div>

            {/* Monthly Revenue Chart */}
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
                  {years.map(yr => (
                    <Bar key={yr} dataKey={yr.toString()} fill={yearColors[yr.toString()]} radius={[2, 2, 0, 0]}>
                      <LabelList content={RecordLabel(yr.toString())} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tips by Month */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Tips by Month</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={monthNames.map((name, idx) => {
                    const entry: any = { month: name };
                    for (const yr of years) {
                      entry[yr.toString()] = (data.monthlyTips[yr.toString()] || [])[idx] || 0;
                    }
                    return entry;
                  })}
                  margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(0)}`}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {years.map(yr => (
                    <Bar key={yr} dataKey={yr.toString()} fill={yearColors[yr.toString()]} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Month Detail Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
              <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Month-by-Month ({data.curYear})</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Month</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Revenue</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Tips</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Orders</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">vs Prev Yr</th>
                  </tr>
                </thead>
                <tbody>
                  {monthNames.map((name, idx) => {
                    const rev = (data.monthlyRev[data.curYear.toString()] || [])[idx] || 0;
                    const tips = (data.monthlyTips[data.curYear.toString()] || [])[idx] || 0;
                    const orders = (data.monthlyOrders[data.curYear.toString()] || [])[idx] || 0;
                    const prevRev = (data.monthlyRev[(data.curYear - 1).toString()] || [])[idx] || 0;
                    const pct = prevRev > 0 ? Math.round(((rev - prevRev) / prevRev) * 100) : null;
                    const isCurrent = idx === currentMonthIdx;
                    const pctColor = pct === null ? 'text-gray-400' : pct >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
                    return (
                      <tr key={idx} className={`border-b border-gray-50 ${isCurrent ? 'bg-[#F5F0E8]' : ''}`}>
                        <td className={`py-2 px-2 font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-700'}`}>{name}</td>
                        <td className="text-right py-2 px-2 font-semibold text-gray-900">{rev > 0 ? fmtK(rev) : '-'}</td>
                        <td className="text-right py-2 px-2 text-gray-600">{tips > 0 ? `$${tips.toFixed(0)}` : '-'}</td>
                        <td className="text-right py-2 px-2 text-gray-600">{orders > 0 ? orders : '-'}</td>
                        <td className="text-right py-2 px-2">
                          {pct !== null ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${pctColor}`}>
                              {pct >= 0 ? '+' : ''}{pct}%
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══ PRODUCTS TAB ═══ */}
        {view === 'products' && (
          <>
            {/* Revenue Share Pie */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue Share</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={topPieData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
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
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSellers.map((item, idx) => (
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
        )}

        {/* ═══ HOURS & DAYS TAB ═══ */}
        {view === 'hours' && (
          <>
            {/* Hourly Revenue Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue by Hour (MT)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => fmtK(v)} />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmtK(value), name === 'revenue' ? 'Revenue' : name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill={SAGE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-center text-[10px] text-gray-400 mt-2">Peak hours: 9am-12pm = 63% of daily revenue</p>
            </div>

            {/* Orders by Hour */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Orders by Hour</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }}
                  />
                  <Bar dataKey="orders" fill={TAN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Day of Week */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 text-center mb-3">Revenue by Day of Week</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dowData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DE" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => fmtK(v)} />
                  <Tooltip
                    formatter={(value: number) => fmtK(value)}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E8E4DE', fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill={SAGE} radius={[4, 4, 0, 0]}>
                    {dowData.map((entry, idx) => (
                      <Cell key={idx} fill={['Fri', 'Sat', 'Sun'].includes(entry.day) ? SAGE : TAN_LIGHT} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-center text-[10px] text-gray-400 mt-2">Fri-Sun = 75% of summer revenue</p>
            </div>
          </>
        )}
      </div>
      </PullToRefresh>
    </AppLayout>
  );
}
