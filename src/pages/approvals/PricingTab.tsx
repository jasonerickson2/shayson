// PricingTab.tsx - Pricing proposals approval tab for the Approvals page
// Fetches from Supabase edge function: pricing-proposals
// Pattern matches existing dashboard/analytics pages (direct fetch, no auth)

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { PricingProposal } from '../../types';
import { PROPERTY_NAMES, PROPERTY_SHORT_NAMES, PROPERTY_THEMES, PROPERTY_COLORS } from '../../config/properties';

const PROPOSALS_API = `${import.meta.env.VITE_FUNCTIONS_BASE}/pricing-proposals`;

type FilterTab = 'pending' | 'approved' | 'declined' | 'all';

// ── API helpers ─────────────────────────────────────────────────────────────

async function fetchProposals(status: string): Promise<PricingProposal[]> {
  const res = await fetch(`${PROPOSALS_API}?action=list&status=${status}`);
  if (!res.ok) throw new Error('Failed to fetch proposals');
  return res.json();
}

async function approveProposal(id: number, note?: string): Promise<any> {
  const res = await fetch(`${PROPOSALS_API}?action=approve&id=${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve');
  }
  return res.json();
}

async function declineProposal(id: number, note?: string): Promise<any> {
  const res = await fetch(`${PROPOSALS_API}?action=decline&id=${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to decline');
  }
  return res.json();
}

async function batchApprove(batchId: string, note?: string): Promise<any> {
  const res = await fetch(`${PROPOSALS_API}?action=batch_approve&batch_id=${batchId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to batch approve');
  }
  return res.json();
}

async function batchDecline(batchId: string, note?: string): Promise<any> {
  const res = await fetch(`${PROPOSALS_API}?action=batch_decline&batch_id=${batchId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to batch decline');
  }
  return res.json();
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PricingTab() {
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch proposals - "recent" for non-pending tabs to include last 48h resolved
  const queryStatus = filterTab === 'pending' ? 'pending' : 'recent';
  const { data: proposals, isLoading } = useQuery({
    queryKey: ['pricing-proposals', queryStatus],
    queryFn: () => fetchProposals(queryStatus),
    refetchInterval: 30_000,
  });

  // Mutations
  const approveMut = useMutation({
    mutationFn: (id: number) => approveProposal(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['pricing-proposals'] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  const declineMut = useMutation({
    mutationFn: (id: number) => declineProposal(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['pricing-proposals'] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  const batchApproveMut = useMutation({
    mutationFn: (batchId: string) => batchApprove(batchId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['pricing-proposals'] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  const batchDeclineMut = useMutation({
    mutationFn: (batchId: string) => batchDecline(batchId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['pricing-proposals'] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Filter + group
  const filtered = useMemo(() => {
    if (!proposals) return [];
    if (filterTab === 'all') return proposals;
    if (filterTab === 'pending') return proposals.filter(p => p.status === 'pending');
    if (filterTab === 'approved') return proposals.filter(p => p.status === 'approved' || p.status === 'auto_applied');
    if (filterTab === 'declined') return proposals.filter(p => p.status === 'declined');
    return proposals;
  }, [proposals, filterTab]);

  const pendingCount = proposals?.filter(p => p.status === 'pending').length || 0;

  // Group by batch_id for batch actions
  const batches = useMemo(() => {
    const map = new Map<string, PricingProposal[]>();
    for (const p of filtered) {
      if (p.batch_id) {
        const arr = map.get(p.batch_id) || [];
        arr.push(p);
        map.set(p.batch_id, arr);
      }
    }
    return map;
  }, [filtered]);

  // Proposals without a batch
  const unbatched = filtered.filter(p => !p.batch_id);
  // Batch IDs in order
  const batchIds = [...batches.keys()];

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'approved', label: 'Applied' },
    { key: 'declined', label: 'Declined' },
    { key: 'all', label: 'All' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Error banner */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2 mb-4">
          <span className="text-red-500 text-sm font-medium flex-shrink-0 mt-0.5">!</span>
          <p className="text-sm text-red-700 flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer">x</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
              filterTab === tab.key
                ? 'bg-[#7C9082] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="ri-price-tag-3-line text-2xl text-gray-400"></i>
          </div>
          <p className="text-sm font-medium text-gray-700">
            {filterTab === 'pending' ? 'No pending price changes' : `No ${filterTab} proposals`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {filterTab === 'pending'
              ? 'The AI will propose price changes here when it spots opportunities.'
              : 'Nothing to show yet.'}
          </p>
        </div>
      )}

      {/* Batch groups */}
      {batchIds.map(batchId => {
        const items = batches.get(batchId)!;
        const pendingInBatch = items.filter(p => p.status === 'pending');
        const isExpanded = expandedBatch === batchId;
        const firstItem = items[0];
        const totalSavings = items.reduce((sum, p) => sum + (p.current_price - p.proposed_price), 0);
        const avgDiscount = Math.round(items.reduce((sum, p) => sum + (p.discount_pct || 0), 0) / items.length);

        return (
          <div key={batchId} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
            {/* Batch header */}
            <button
              onClick={() => setExpandedBatch(isExpanded ? null : batchId)}
              className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {items.length}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {firstItem.source === 'vacancy_block_detector' ? 'Vacancy Block Cuts' : firstItem.source || 'AI Recommendations'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {items.length} dates &middot; avg {avgDiscount}% off &middot; ${Math.abs(totalSavings)} total reduction
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {pendingInBatch.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700">
                    {pendingInBatch.length} pending
                  </span>
                )}
                <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-gray-400`}></i>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {/* Batch actions */}
                {pendingInBatch.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 flex gap-2 border-b border-gray-100">
                    <button
                      onClick={() => batchDeclineMut.mutate(batchId)}
                      disabled={batchDeclineMut.isPending}
                      className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 cursor-pointer hover:bg-white disabled:opacity-50"
                    >
                      Decline All
                    </button>
                    <button
                      onClick={() => batchApproveMut.mutate(batchId)}
                      disabled={batchApproveMut.isPending}
                      className="flex-1 py-2 rounded-lg bg-[#7C9082] text-white text-xs font-medium cursor-pointer hover:bg-[#6B7F71] disabled:opacity-50"
                    >
                      {batchApproveMut.isPending ? 'Approving...' : `Approve All (${pendingInBatch.length})`}
                    </button>
                  </div>
                )}

                {/* Individual cards */}
                <div className="divide-y divide-gray-100">
                  {items.map(p => (
                    <ProposalRow
                      key={p.id}
                      proposal={p}
                      isExpanded={expandedId === p.id}
                      onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      onApprove={() => approveMut.mutate(p.id)}
                      onDecline={() => declineMut.mutate(p.id)}
                      isApproving={approveMut.isPending && approveMut.variables === p.id}
                      isDeclining={declineMut.isPending && declineMut.variables === p.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Unbatched proposals */}
      {unbatched.length > 0 && (
        <div className="space-y-3">
          {unbatched.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <ProposalRow
                proposal={p}
                isExpanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                onApprove={() => approveMut.mutate(p.id)}
                onDecline={() => declineMut.mutate(p.id)}
                isApproving={approveMut.isPending && approveMut.variables === p.id}
                isDeclining={declineMut.isPending && declineMut.variables === p.id}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Individual Proposal Row ─────────────────────────────────────────────────

function ProposalRow({
  proposal: p,
  isExpanded,
  onToggle,
  onApprove,
  onDecline,
  isApproving,
  isDeclining,
}: {
  proposal: PricingProposal;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onDecline: () => void;
  isApproving: boolean;
  isDeclining: boolean;
}) {
  const date = parseISO(p.date);
  const daysOut = differenceInCalendarDays(date, new Date());
  const isUrgent = p.status === 'pending' && daysOut <= 3;
  const propName = PROPERTY_NAMES[p.property_id] || p.property_name || p.property_id;
  const propShort = PROPERTY_SHORT_NAMES[p.property_id] || propName.slice(0, 2);
  const propColor = PROPERTY_COLORS[p.property_id] || '#7C9082';

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    declined: 'bg-red-50 text-red-700',
    auto_applied: 'bg-blue-50 text-blue-700',
  };

  const changePct = p.current_price > 0
    ? Math.round(((p.proposed_price - p.current_price) / p.current_price) * 100)
    : 0;

  return (
    <div>
      {/* Compact row */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors text-left"
      >
        {/* Property badge */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: propColor }}
        >
          {propShort}
        </div>

        {/* Date + property */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {format(date, 'EEE, MMM d')}
            </p>
            {isUrgent && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded-full">
                {daysOut}d out
              </span>
            )}
            {!isUrgent && daysOut !== null && (
              <span className="text-[10px] text-gray-400">{daysOut}d</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{p.reason}</p>
        </div>

        {/* Price change */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-xs text-gray-400 line-through">${p.current_price}</span>
            <i className="ri-arrow-right-s-line text-gray-300 text-xs"></i>
            <span className="text-sm font-bold text-gray-900">${p.proposed_price}</span>
          </div>
          <span className={`text-[10px] font-medium ${changePct < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {changePct > 0 ? '+' : ''}{changePct}%
          </span>
        </div>

        {/* Status chip (non-pending only) */}
        {p.status !== 'pending' && (
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap flex-shrink-0 ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
            {p.status === 'auto_applied' ? 'auto' : p.status}
          </span>
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Reasoning */}
          {p.reasoning && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">AI Reasoning</p>
              <p className="text-sm text-gray-700 leading-relaxed">{p.reasoning}</p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {p.occupancy_pct !== null && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Occupancy</p>
                <p className="text-sm font-bold text-gray-900">{p.occupancy_pct}%</p>
              </div>
            )}
            {p.days_out !== null && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Days Out</p>
                <p className="text-sm font-bold text-gray-900">{p.days_out}</p>
              </div>
            )}
            {p.block_size !== null && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Block Size</p>
                <p className="text-sm font-bold text-gray-900">{p.block_size}d</p>
              </div>
            )}
            {p.cross_room_count !== null && p.cross_room_count > 0 && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Cross-Room</p>
                <p className="text-sm font-bold text-gray-900">{p.cross_room_count} rooms</p>
              </div>
            )}
            {p.lead_time_percentile !== null && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Lead Time</p>
                <p className="text-sm font-bold text-gray-900">P{p.lead_time_percentile}</p>
              </div>
            )}
            {p.base_price !== null && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Base Price</p>
                <p className="text-sm font-bold text-gray-900">${p.base_price}</p>
              </div>
            )}
          </div>

          {/* Source + timestamp */}
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Source: {p.source || 'AI'}</span>
            <span>{formatTimeAgo(p.created_at)}</span>
          </div>

          {/* Action buttons (pending only) */}
          {p.status === 'pending' && (
            <div className="flex gap-2.5">
              <button
                onClick={(e) => { e.stopPropagation(); onDecline(); }}
                disabled={isDeclining}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isDeclining ? 'Declining...' : 'Decline'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(); }}
                disabled={isApproving}
                className="flex-1 py-2.5 rounded-xl bg-[#7C9082] text-white text-sm font-medium cursor-pointer hover:bg-[#6B7F71] transition-colors disabled:opacity-50"
              >
                {isApproving ? 'Applying...' : `Apply $${p.proposed_price}`}
              </button>
            </div>
          )}

          {/* Applied confirmation */}
          {(p.status === 'approved' || p.status === 'auto_applied') && (
            <div className="flex items-center gap-2 text-emerald-600">
              <i className="ri-checkbox-circle-fill text-base"></i>
              <span className="text-xs font-medium">
                {p.status === 'auto_applied' ? 'Auto-applied' : 'Applied'} {p.applied_at ? formatTimeAgo(p.applied_at) : ''}
              </span>
            </div>
          )}
          {p.status === 'declined' && (
            <div className="flex items-center gap-2 text-red-600">
              <i className="ri-close-circle-fill text-base"></i>
              <span className="text-xs font-medium">Declined {p.reviewed_at ? formatTimeAgo(p.reviewed_at) : ''}</span>
              {p.review_note && <span className="text-xs text-gray-500 ml-1">- {p.review_note}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d');
}
