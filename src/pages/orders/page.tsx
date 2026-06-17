'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────
interface OrderItem {
  name: string;
  variation: string;
  qty: number;
  category: string;
  modifiers: string[];
}

interface Order {
  orderId: string;
  createdAt: string;
  items: OrderItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function formatModifiers(modifiers: string[]): string {
  if (!modifiers || modifiers.length === 0) return '';
  return modifiers.join(' · ');
}

const API = `${import.meta.env.VITE_FUNCTIONS_BASE}/cafe-orders`;

// ─── Order Card ────────────────────────────────────────────────────────
function OrderCard({ order, onClear, isDone }: { order: Order; onClear?: () => void; isDone?: boolean }) {
  return (
    <div
      onClick={onClear}
      className={`rounded-xl p-4 transition-all ${
        isDone
          ? 'bg-gray-50 border border-gray-200 opacity-50'
          : 'bg-white border-2 border-[#7C9082] shadow-sm active:scale-[0.98] cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-medium ${isDone ? 'text-gray-400' : 'text-[#7C9082]'}`}>
          {timeAgo(order.createdAt)}
        </span>
        {!isDone && (
          <span className="text-xs text-gray-400">tap to clear</span>
        )}
        {isDone && (
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">done</span>
        )}
      </div>
      <div className="space-y-2">
        {order.items.map((item, idx) => {
          const mods = formatModifiers(item.modifiers);
          return (
            <div key={idx}>
              <div className="flex items-baseline gap-2">
                <span className={`text-base font-semibold ${isDone ? 'text-gray-400' : 'text-gray-900'}`}>
                  {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                </span>
                {item.variation && (
                  <span className={`text-sm font-medium ${isDone ? 'text-gray-300' : 'text-gray-500'}`}>
                    {item.variation}
                  </span>
                )}
              </div>
              {mods && (
                <div className={`text-sm mt-0.5 ${isDone ? 'text-gray-300' : 'text-[#7C9082]'}`}>
                  {mods}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Orders Page ────────────────────────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
  const sessionStart = useRef(new Date().toISOString());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected, setConnected] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  // Set browser tab title
  useEffect(() => {
    document.title = 'Roadhouse - Orders';
    return () => { document.title = 'Shayson'; };
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const resp = await fetch(`${API}?since=${encodeURIComponent(sessionStart.current)}`);
      const data = await resp.json();
      if (data.orders) {
        setOrders(data.orders);
        setConnected(true);
        // Count new (uncleared) orders
        const newCount = data.orders.filter((o: Order) => !clearedIds.has(o.orderId)).length;
        setOrderCount(newCount);
      }
    } catch {
      setConnected(false);
    }
  }, [clearedIds]);

  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOrders]);

  const clearOrder = (orderId: string) => {
    setClearedIds(prev => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
  };

  const clearAll = () => {
    setClearedIds(new Set(orders.map(o => o.orderId)));
  };

  const activeOrders = orders.filter(o => !clearedIds.has(o.orderId));
  const doneOrders = orders.filter(o => clearedIds.has(o.orderId));

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F8F6F1] border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Orders</h1>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
          </div>
          <div className="flex items-center gap-3">
            {activeOrders.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs font-medium text-[#7C9082] px-3 py-1.5 rounded-lg border border-[#7C9082]/30"
              >
                Clear All
              </button>
            )}
            <span className="text-sm font-semibold text-gray-900 bg-white rounded-full w-8 h-8 flex items-center justify-center border border-gray-200">
              {activeOrders.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Empty state */}
        {activeOrders.length === 0 && doneOrders.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">☕</p>
            <p className="text-gray-500 text-sm">Waiting for orders...</p>
            <p className="text-gray-400 text-xs mt-1">New orders will appear here automatically</p>
          </div>
        )}

        {/* Active orders - oldest first */}
        {activeOrders.map(order => (
          <OrderCard key={order.orderId} order={order} onClear={() => clearOrder(order.orderId)} />
        ))}

        {/* Done section */}
        {doneOrders.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Done ({doneOrders.length})</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {doneOrders.map(order => (
              <OrderCard key={order.orderId} order={order} isDone />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
