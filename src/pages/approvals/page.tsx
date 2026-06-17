
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format, differenceInDays, differenceInCalendarDays } from 'date-fns';
import AppLayout from '../../components/layout/AppLayout';
import { ApprovalRequest, CancellationRequest } from '../../types';
import PricingTab from './PricingTab';

type TopTab = 'bookings' | 'cancellations' | 'pricing';
type FilterTab = 'pending' | 'approved' | 'declined' | 'all';

export default function ApprovalsPage() {
  const [topTab, setTopTab] = useState<TopTab>('bookings');
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [cancelFilterTab, setCancelFilterTab] = useState<FilterTab>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelDeclineModal, setShowCancelDeclineModal] = useState(false);
  const [selectedCancelRequest, setSelectedCancelRequest] = useState<CancellationRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Booking approvals
  const { data: requests, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: api.approvals.getAll,
  });

  // Cancellation requests
  const { data: cancelRequests, isLoading: cancelLoading } = useQuery({
    queryKey: ['cancellation-requests'],
    queryFn: () => api.cancellations.getAll(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approvals.approve(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setSelectedRequest(null);
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to approve in Hostex. You may need to approve manually in Hostex.');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.approvals.decline(id, reason),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setSelectedRequest(null);
      setShowDeclineModal(false);
      setDeclineReason('');
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to decline in Hostex. You may need to decline manually in Hostex.');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  // Cancellation mutations
  const cancelApproveMutation = useMutation({
    mutationFn: (id: string) => api.cancellations.approve(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests'] });
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to process refund. Please try again or issue refund manually in Square.');
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests'] });
    },
  });

  const cancelDeclineMutation = useMutation({
    mutationFn: (id: string) => api.cancellations.decline(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests'] });
      setShowCancelDeclineModal(false);
      setSelectedCancelRequest(null);
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to decline cancellation request.');
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests'] });
    },
  });

  // Sort pending requests by requestedAt (newest first)
  const sortedRequests = requests ? [...requests].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'pending') {
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    }
    return 0;
  }) : [];

  const filtered = sortedRequests.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const pendingCount = sortedRequests.filter((r) => r.status === 'pending').length;

  // Cancellation data
  const sortedCancelRequests = cancelRequests ? [...cancelRequests].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'pending') {
      return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
    }
    return 0;
  }) : [];

  const filteredCancels = sortedCancelRequests.filter((r) => {
    if (cancelFilterTab === 'all') return true;
    return r.status === cancelFilterTab;
  });

  const pendingCancelCount = sortedCancelRequests.filter((r) => r.status === 'pending').length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'approved', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
    { key: 'all', label: 'All' },
  ];

  const cancelTabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: `Pending (${pendingCancelCount})` },
    { key: 'approved', label: 'Refunded' },
    { key: 'declined', label: 'Declined' },
    { key: 'all', label: 'All' },
  ];

  const handleApprove = (req: ApprovalRequest) => {
    approveMutation.mutate(req.id);
  };

  const handleDeclineClick = (req: ApprovalRequest) => {
    setSelectedRequest(req);
    setShowDeclineModal(true);
  };

  const handleDeclineConfirm = () => {
    if (selectedRequest) {
      declineMutation.mutate({
        id: selectedRequest.id,
        reason: declineReason.trim() || undefined
      });
    }
  };

  const totalPending = pendingCount + pendingCancelCount;
  const loading = topTab === 'bookings' ? isLoading : cancelLoading;

  if (loading && !requests && !cancelRequests) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-7 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 pb-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 text-center">Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalPending > 0
              ? `${totalPending} request${totalPending > 1 ? 's' : ''} waiting for your review`
              : 'No pending requests'}
          </p>
        </div>

        {/* Error banner */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-red-500 text-sm font-medium flex-shrink-0 mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700">{actionError}</p>
            </div>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer flex-shrink-0">✕</button>
          </div>
        )}

        {/* Top-level Tabs: Bookings / Cancellations / Pricing */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTopTab('bookings')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              topTab === 'bookings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bookings
            {pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTopTab('cancellations')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              topTab === 'cancellations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cancellations
            {pendingCancelCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                {pendingCancelCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTopTab('pricing')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              topTab === 'pricing'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pricing
          </button>
        </div>

        {/* === BOOKINGS TAB === */}
        {topTab === 'bookings' && (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#7C9082] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Request List */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-checkbox-circle-line text-2xl text-gray-400"></i>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {activeTab === 'pending' ? 'All caught up!' : `No ${activeTab} requests`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeTab === 'pending'
                    ? 'No booking requests need your attention right now.'
                    : 'Nothing to show here yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((req) => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    onApprove={() => handleApprove(req)}
                    onDecline={() => handleDeclineClick(req)}
                    isApproving={approveMutation.isPending && approveMutation.variables === req.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* === PRICING TAB === */}
        {topTab === 'pricing' && <PricingTab />}

        {/* === CANCELLATIONS TAB === */}
        {topTab === 'cancellations' && (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {cancelTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCancelFilterTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    cancelFilterTab === tab.key
                      ? 'bg-[#7C9082] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Cancellation List */}
            {filteredCancels.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="ri-checkbox-circle-line text-2xl text-gray-400"></i>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {cancelFilterTab === 'pending' ? 'No pending cancellations' : `No ${cancelFilterTab === 'approved' ? 'refunded' : cancelFilterTab} requests`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {cancelFilterTab === 'pending'
                    ? 'No cancellation requests need your attention right now.'
                    : 'Nothing to show here yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCancels.map((req) => (
                  <CancellationCard
                    key={req.id}
                    request={req}
                    onApprove={() => cancelApproveMutation.mutate(req.id)}
                    onDecline={() => {
                      setSelectedCancelRequest(req);
                      setShowCancelDeclineModal(true);
                    }}
                    isApproving={cancelApproveMutation.isPending && cancelApproveMutation.variables === req.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Decline Booking Modal */}
      {showDeclineModal && selectedRequest && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShowDeclineModal(false);
              setDeclineReason('');
            }}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 p-5 max-w-md mx-auto shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Decline Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Decline {selectedRequest.guestName}&apos;s booking request?
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining (optional)..."
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#7C9082] focus:border-transparent"
            />
            <p className="text-[10px] text-gray-400 text-right mt-1">{declineReason.length}/500</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineConfirm}
                disabled={declineMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium cursor-pointer hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Decline Cancellation Modal */}
      {showCancelDeclineModal && selectedCancelRequest && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShowCancelDeclineModal(false);
              setSelectedCancelRequest(null);
            }}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 p-5 max-w-md mx-auto shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Decline Cancellation</h3>
            <p className="text-sm text-gray-500 mb-4">
              Decline {selectedCancelRequest.guest_name}&apos;s cancellation request? Their booking will remain active.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Refund requested</span>
                <span className="font-semibold text-gray-900">
                  ${(selectedCancelRequest.refund_amount_cents / 100).toFixed(2)} ({selectedCancelRequest.refund_percent}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Policy</span>
                <span className="text-gray-700">{selectedCancelRequest.policy_reason}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelDeclineModal(false);
                  setSelectedCancelRequest(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  if (selectedCancelRequest) {
                    cancelDeclineMutation.mutate(selectedCancelRequest.id);
                  }
                }}
                disabled={cancelDeclineMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium cursor-pointer hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
              >
                {cancelDeclineMutation.isPending ? 'Declining...' : 'Decline Cancellation'}
              </button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function ApprovalCard({
  request,
  onApprove,
  onDecline,
  isApproving,
}: {
  request: ApprovalRequest;
  onApprove: () => void;
  onDecline: () => void;
  isApproving: boolean;
}) {
  const checkIn = new Date(request.checkIn);
  const checkOut = new Date(request.checkOut);
  const nights = differenceInCalendarDays(checkOut, checkIn);
  const daysUntil = differenceInDays(checkIn, new Date());
  const isUrgent = request.status === 'pending' && daysUntil <= 2;

  const channelColors: Record<string, string> = {
    airbnb: 'bg-red-50 text-red-700',
    direct: 'bg-green-50 text-green-700',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    declined: 'bg-red-50 text-red-700',
    expired: 'bg-gray-100 text-gray-500',
  };

  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-sm ${
        isUrgent ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gray-200'
      }`}
    >
      {/* Top Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-[#8BA894] to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {request.guestName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 truncate">{request.guestName}</p>
              {isUrgent && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full whitespace-nowrap">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {request.guests} guest{request.guests > 1 ? 's' : ''} &middot; Requested{' '}
              {formatTimeAgo(request.requestedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${channelColors[request.channel] || 'bg-gray-100 text-gray-600'}`}>
            {request.channel}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${statusColors[request.status] || 'bg-gray-100 text-gray-600'}`}>
            {request.status}
          </span>
        </div>
      </div>

      {/* Property Name - Prominently Displayed */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-[#6B7F71] bg-[#F0F4F1] rounded-lg px-3 py-2">
          <i className="ri-home-4-line text-base"></i>
          <span className="text-sm font-semibold">{request.propertyName}</span>
        </div>
      </div>

      {/* Stay Details */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase">Check-in</p>
            <p className="text-sm font-semibold text-gray-900">{format(checkIn, 'EEE, MMM d')}</p>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <div className="w-8 border-t border-dashed border-gray-300"></div>
            <span className="text-[11px] font-medium">{nights}N</span>
            <div className="w-8 border-t border-dashed border-gray-300"></div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500 font-medium uppercase">Check-out</p>
            <p className="text-sm font-semibold text-gray-900">{format(checkOut, 'EEE, MMM d')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">{request.guests} guest{request.guests > 1 ? 's' : ''}</p>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">${request.totalAmount.toLocaleString()}</p>
            {request.commission && request.commission > 0 && (
              <p className="text-[10px] text-gray-400">
                ${request.grossAmount?.toLocaleString()} − ${request.commission?.toLocaleString()} fee
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Guest Message */}
      {request.guestMessage && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 font-medium">Guest message</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2.5 italic leading-relaxed">
            &ldquo;{request.guestMessage}&rdquo;
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {request.status === 'pending' && (
        <div className="flex gap-2.5">
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Decline
          </button>
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex-1 py-2.5 rounded-xl bg-[#7C9082] text-white text-sm font-medium cursor-pointer hover:bg-[#6B7F71] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </button>
        </div>
      )}

      {/* Status info for non-pending */}
      {request.status === 'approved' && (
        <div className="flex items-center gap-2 text-emerald-600">
          <i className="ri-checkbox-circle-fill text-base"></i>
          <span className="text-xs font-medium">Approved {request.respondedAt ? formatTimeAgo(request.respondedAt) : ''}</span>
        </div>
      )}
      {request.status === 'declined' && (
        <div>
          <div className="flex items-center gap-2 text-red-600">
            <i className="ri-close-circle-fill text-base"></i>
            <span className="text-xs font-medium">Declined {request.respondedAt ? formatTimeAgo(request.respondedAt) : ''}</span>
          </div>
          {request.declineReason && (
            <p className="text-xs text-gray-500 mt-1 ml-6">Reason: {request.declineReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

function CancellationCard({
  request,
  onApprove,
  onDecline,
  isApproving,
}: {
  request: CancellationRequest;
  onApprove: () => void;
  onDecline: () => void;
  isApproving: boolean;
}) {
  const PROP_NAMES: Record<string, string> = {
    carriage_house: 'Carriage House',
    room_1: 'Room 1 – King Suite',
    room_2: 'Room 2 – Queen Room',
    room_3: 'Room 3 – Twin Room',
    room_4: 'Room 4 – Queen Room',
    full_house: 'Full House',
  };

  const checkIn = new Date(request.check_in + 'T12:00:00');
  const checkOut = new Date(request.check_out + 'T12:00:00');
  const nights = differenceInCalendarDays(checkOut, checkIn);
  const refundDollars = (request.refund_amount_cents / 100).toFixed(2);
  const totalPaid = (request.total_paid_cents / 100).toFixed(2);
  const isSummer = request.policy_season === 'summer';
  const propertyName = PROP_NAMES[request.property_id] || request.property_id;

  const refundColor =
    request.refund_percent === 100
      ? 'bg-green-50 border-green-200 text-green-800'
      : request.refund_percent === 50
      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
      : 'bg-red-50 border-red-200 text-red-700';

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    declined: 'bg-red-50 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-sm">
      {/* Top Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {request.guest_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 truncate">{request.guest_name}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Requested {formatTimeAgo(request.requested_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${
            isSummer ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {isSummer ? 'Summer' : 'Winter'}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${statusColors[request.status] || 'bg-gray-100 text-gray-600'}`}>
            {request.status === 'approved' ? 'refunded' : request.status}
          </span>
        </div>
      </div>

      {/* Property */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-[#6B7F71] bg-[#F0F4F1] rounded-lg px-3 py-2">
          <i className="ri-home-4-line text-base"></i>
          <span className="text-sm font-semibold">{propertyName}</span>
        </div>
      </div>

      {/* Stay Details */}
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase">Check-in</p>
            <p className="text-sm font-semibold text-gray-900">{format(checkIn, 'EEE, MMM d')}</p>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <div className="w-8 border-t border-dashed border-gray-300"></div>
            <span className="text-[11px] font-medium">{nights}N</span>
            <div className="w-8 border-t border-dashed border-gray-300"></div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500 font-medium uppercase">Check-out</p>
            <p className="text-sm font-semibold text-gray-900">{format(checkOut, 'EEE, MMM d')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">Total paid</p>
          <p className="text-sm font-bold text-gray-900">${totalPaid}</p>
        </div>
      </div>

      {/* Refund Details */}
      <div className={`rounded-lg border p-3 mb-3 ${refundColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">
              {request.refund_percent > 0 ? `$${refundDollars} refund` : 'Non-refundable'}
            </p>
            <p className="text-xs mt-0.5 opacity-80">{request.policy_reason}</p>
          </div>
          <span className="text-lg font-bold">{request.refund_percent}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      {request.status === 'pending' && (
        <div className="flex gap-2.5">
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Decline
          </button>
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isApproving ? 'Processing Refund...' : `Approve Refund ($${refundDollars})`}
          </button>
        </div>
      )}

      {/* Status info for non-pending */}
      {request.status === 'approved' && (
        <div className="flex items-center gap-2 text-emerald-600">
          <i className="ri-refund-2-line text-base"></i>
          <span className="text-xs font-medium">
            Refunded ${refundDollars} {request.resolved_at ? formatTimeAgo(request.resolved_at) : ''}
          </span>
          {request.square_refund_id && (
            <span className="text-[10px] text-gray-400 ml-auto">Ref: {request.square_refund_id.slice(0, 8)}...</span>
          )}
        </div>
      )}
      {request.status === 'declined' && (
        <div className="flex items-center gap-2 text-red-600">
          <i className="ri-close-circle-fill text-base"></i>
          <span className="text-xs font-medium">Declined {request.resolved_at ? formatTimeAgo(request.resolved_at) : ''}</span>
        </div>
      )}
    </div>
  );
}

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
