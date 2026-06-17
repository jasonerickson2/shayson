
import {
  Property,
  Reservation,
  Conversation,
  Message,
  DashboardStats,
  AIMessage,
  ApprovalRequest,
  ActivityLog,
  ActivityLogFilters,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 10_000;
const MAX_RETRIES = 2;

/**
 * Custom error class for API‑related failures.
 */
class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Retrieve the JWT (or similar) token from `sessionStorage`.
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

/**
 * Wrapper around `fetch` that adds a timeout and default JSON headers.
 *
 * @param url      Request URL.
 * @param options  Fetch options – defaults to an empty object.
 * @param timeout  Timeout in milliseconds – defaults to `REQUEST_TIMEOUT`.
 */
async function fetchWithTimeout(
  url: string,
  options: Record<string, any> = {},
  timeout = REQUEST_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const token = getAuthToken();

  // Ensure we always send JSON headers; allow caller to override/extend them.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    // Translate aborts into a more readable error.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout} ms`);
    }
    throw error;
  }
}

/**
 * Generic API request helper with built‑in retry logic.
 *
 * @param endpoint API endpoint (relative to `API_BASE_URL`).
 * @param options  Fetch options.
 * @param retries  Remaining retry attempts.
 */
async function apiRequest<T>(
  endpoint: string,
  options: Record<string, any> = {},
  retries = MAX_RETRIES,
): Promise<T> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorBody = await response.text();
      const message = errorBody || response.statusText;

      // Auto-logout on 401: clear stored tokens and redirect to login.
      if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }

      throw new APIError(response.status, `API Error: ${message}`);
    }

    // Some endpoints may return an empty body (e.g., 204 No Content).
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (error) {
    // Retry only on network‑level failures, not on explicit API errors.
    if (retries > 0 && !(error instanceof APIError)) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      return apiRequest<T>(endpoint, options, retries - 1);
    }
    throw error;
  }
}

/**
 * Public API surface used throughout the frontend.
 */
export const api = {
  auth: {
    login: async (
      email: string,
      password: string,
    ): Promise<{ token: string; user: any }> => {
      const response = await apiRequest<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.token) {
        localStorage.setItem('token', response.token);
        sessionStorage.setItem('token', response.token); // backward compat
      }

      return response;
    },

    logout: async (): Promise<void> => {
      await apiRequest<void>('/api/auth/logout', {
        method: 'POST',
      });
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    },
  },

  properties: {
    getAll: async (): Promise<Property[]> => apiRequest<Property[]>('/api/properties'),

    getById: async (id: string): Promise<Property> => apiRequest<Property>(`/api/properties/${id}`),
  },

  reservations: {
    getAll: async (): Promise<Reservation[]> => apiRequest<Reservation[]>('/api/reservations'),

    getById: async (id: string): Promise<Reservation> => apiRequest<Reservation>(`/api/reservations/${id}`),

    update: async (id: string, data: Partial<Reservation>): Promise<Reservation> =>
      apiRequest<Reservation>(`/api/reservations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    create: async (data: Omit<Reservation, 'id'>): Promise<Reservation> =>
      apiRequest<Reservation>('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  calendar: {
    getUpcoming: async (): Promise<any[]> => {
      return apiRequest('/api/calendar/upcoming');
    },
    getEvents: async (start: string, end: string, propertyId?: string): Promise<any[]> => {
      const params = new URLSearchParams({ start, end });
      if (propertyId) params.append('property', propertyId);
      return apiRequest(`/api/calendar/events?${params.toString()}`);
    },
    createBlock: async (data: {
      propertyId: string;
      startDate: string;
      endDate: string;
      type: string;
      notes?: string;
    }): Promise<any> => {
      return apiRequest('/api/calendar/blocks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    deleteBlock: async (id: string): Promise<void> => {
      return apiRequest(`/api/calendar/blocks/${id}`, {
        method: 'DELETE',
      });
    },
  },

  conversations: {
    getAll: async (): Promise<any[]> => {
      return apiRequest('/api/conversations');
    },
    getMessages: async (conversationId: string): Promise<any[]> => {
      return apiRequest(`/api/conversations/${conversationId}/messages`);
    },
    sendMessage: async (conversationId: string, content: string): Promise<any> => {
      return apiRequest(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    markAsRead: async (conversationId: string): Promise<void> => {
      return apiRequest(`/api/conversations/${conversationId}/read`, {
        method: 'PATCH',
      });
    },
  },

  dashboard: {
    getStats: async (): Promise<DashboardStats> => apiRequest<DashboardStats>('/api/dashboard/stats'),
  },

  ai: {
    sendMessage: async (message: string, history: any[]): Promise<any> => {
      return apiRequest('/api/ai/command', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      });
    },
    executeAction: async (actionId: string): Promise<any> => {
      return apiRequest('/api/ai/command', {
        method: 'POST',
        body: JSON.stringify({ approve: actionId }),
      });
    },
  },

  events: {
    getAll: async (): Promise<{ name: string; start_date: string; end_date: string }[]> => {
      return apiRequest('/api/events');
    },
  },

  logs: {
    getAll: async (filters: ActivityLogFilters = {}): Promise<ActivityLog[]> => {
      const params = new URLSearchParams();
      if (filters.property) params.append('property', filters.property);
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', String(filters.limit));
      const qs = params.toString();
      return apiRequest<ActivityLog[]>(`/api/logs${qs ? '?' + qs : ''}`);
    },
  },

  notifications: {
    getCounts: async (): Promise<{ pendingApprovals: number; unreadMessages: number }> => {
      return apiRequest('/api/notifications/counts');
    },
  },

  approvals: {
    getAll: async (): Promise<any[]> => {
      return apiRequest('/api/approvals');
    },
    approve: async (id: string): Promise<any> => {
      return apiRequest(`/api/approvals/${id}/approve`, {
        method: 'POST',
      });
    },
    decline: async (id: string, reason?: string): Promise<any> => {
      return apiRequest(`/api/approvals/${id}/decline`, {
        method: 'POST',
        body: reason ? JSON.stringify({ reason }) : undefined,
      });
    },
  },

  cancellations: {
    getAll: async (status?: string): Promise<any[]> => {
      const qs = status ? `?status=${status}` : '';
      return apiRequest(`/api/cancellation-requests${qs}`);
    },
    approve: async (id: string): Promise<any> => {
      return apiRequest(`/api/cancellation-requests/${id}/approve`, {
        method: 'POST',
      });
    },
    decline: async (id: string): Promise<any> => {
      return apiRequest(`/api/cancellation-requests/${id}/decline`, {
        method: 'POST',
      });
    },
  },
};
