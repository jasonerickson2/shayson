export interface Property {
  id: string;
  name: string;
  type: 'room' | 'apartment' | 'cabin' | 'house';
  address?: string;
  units?: Unit[];
  imageUrl?: string;
  status?: 'active' | 'inactive';
  group?: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
}

export interface Reservation {
  id: string;
  unitId: string;
  propertyId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked-in' | 'checked-out';
  channel: 'airbnb' | 'booking.com' | 'direct';
  totalAmount: number;
  guests: number;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  unitId: string;
  propertyId: string;
  title: string;
  start: Date;
  end: Date;
  type: 'booked' | 'blocked' | 'hold' | 'maintenance';
  reservation?: Reservation;
  color?: string;
}

export interface Conversation {
  id: string;
  propertyId: string;
  guestName: string;
  guestAvatar?: string;
  channel: 'airbnb' | 'booking.com' | 'direct';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  reservationId?: string;
  status: 'active' | 'archived';
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'guest' | 'host' | 'system';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'manager' | 'staff';
}

export interface DashboardStats {
  occupancyRate: number;
  adr: number;
  revpar: number;
  totalRevenue: number;
  upcomingCheckIns: number;
  upcomingCheckOuts: number;
  activeReservations: number;
  unreadMessages: number;
}

export interface AIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  endpoint: string;
}

export interface ApprovalRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  guestName: string;
  guestEmail: string;
  guestMessage?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  grossAmount?: number;
  commission?: number;
  channel: 'airbnb' | 'booking.com' | 'direct';
  status: 'pending' | 'approved' | 'declined' | 'expired';
  requestedAt: string;
  respondedAt?: string;
  declineReason?: string;
}

export interface CancellationRequest {
  id: string;
  reservation_id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  total_paid_cents: number;
  refund_amount_cents: number;
  refund_percent: number;
  policy_season: 'summer' | 'winter';
  policy_reason: string;
  square_payment_id: string;
  status: 'pending' | 'approved' | 'declined';
  requested_at: string;
  resolved_at?: string;
  square_refund_id?: string;
}

export interface PricingProposal {
  id: number;
  property_id: string;
  property_name: string;
  date: string;
  current_price: number;
  proposed_price: number;
  discount_pct: number;
  base_price: number | null;
  reason: string;
  reasoning: string | null;
  source: string;
  days_out: number | null;
  occupancy_pct: number | null;
  lead_time_percentile: number | null;
  cross_room_count: number | null;
  block_size: number | null;
  status: 'pending' | 'approved' | 'declined' | 'auto_applied';
  batch_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  expires_at: string | null;
  applied_at: string | null;
}

export interface PricingOverride {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  price: number;
  reason?: string;
  createdAt: string;
}

export type ActivityActionType =
  | 'tier_drop'
  | 'tier_skip'
  | 'tier_confirmed'
  | 'sync_summary'
  | 'event_price_set'
  | 'event_tail_drop'
  | 'min_stay_change'
  | 'gap_found'
  | 'gap_detected'
  | 'gap_fire_sale'
  | 'gap_accelerate'
  | 'gap_premium'
  | 'gap_resolved'
  | 'gap_min_stay'
  | 'booking_received'
  | 'booking_cancelled'
  | 'ai_recommendation'
  | 'ai_action_applied'
  | 'ai_price_applied'
  | 'ai_cooldown_skip'
  | 'ai_daily_digest'
  | 'ai_digest_sms_sent'
  | 'ai_action_response'
  | 'ai_owner_reply'
  | 'ai_outcome_assessed'
  | 'ai_recheck_triggered'
  | 'ai_auto_applied'
  | 'ai_advisor_response'
  | 'pricing_advisor_reply';

export interface ActivityLog {
  id: string;
  created_at: string;
  property_id: string;
  date: string | null;
  action_type: ActivityActionType;
  description: string;
  old_price: number | null;
  new_price: number | null;
  old_min_stay: number | null;
  new_min_stay: number | null;
  source: string;
  metadata: Record<string, any>;
}

export interface ActivityLogFilters {
  property?: string;
  type?: ActivityActionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
