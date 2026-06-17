import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate if scrolled to top
    const scrollTop = containerRef.current?.closest('[data-pull-scroll]')?.scrollTop
      ?? document.documentElement.scrollTop
      ?? 0;
    if (scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Dampen the pull - diminishing returns
      const dampened = Math.min(delta * 0.4, 100);
      setPullDistance(dampened);
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } catch (e) {
        console.error('Pull-to-refresh error:', e);
      }
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pulling, pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: pullDistance > 0 || refreshing ? Math.max(pullDistance, refreshing ? 40 : 0) : 0,
          opacity: pullDistance > 10 || refreshing ? 1 : 0,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 text-[#7C9082] transition-transform ${refreshing ? 'animate-spin' : ''}`}
          style={{
            transform: refreshing ? undefined : `rotate(${(pullDistance / THRESHOLD) * 360}deg)`,
          }}
        />
        {!refreshing && pullDistance >= THRESHOLD && (
          <span className="text-xs text-[#7C9082] ml-2 font-medium">Release to refresh</span>
        )}
        {refreshing && (
          <span className="text-xs text-[#7C9082] ml-2 font-medium">Refreshing...</span>
        )}
      </div>

      {children}
    </div>
  );
}
