// ─── Centralized Property Configuration ──────────────────────────────────────
// Single source of truth for all property IDs, names, colors, and groupings.
// All pages import from here instead of defining inline constants.
// ─────────────────────────────────────────────────────────────────────────────

export type PropertyId =
  | 'grizzly_maze'
  | 'roadhouse_lodge_room_1'
  | 'roadhouse_lodge_room_2'
  | 'roadhouse_lodge_room_3'
  | 'carriage_house'
  | 'penthouse';

// ─── Core property list (canonical order) ────────────────────────────────────

export const PROPERTY_IDS: PropertyId[] = [
  'grizzly_maze',
  'roadhouse_lodge_room_1',
  'roadhouse_lodge_room_2',
  'roadhouse_lodge_room_3',
  'carriage_house',
  'penthouse',
];

// ─── Display names ───────────────────────────────────────────────────────────

export const PROPERTY_NAMES: Record<string, string> = {
  grizzly_maze: 'Grizzly Maze',
  roadhouse_lodge_room_1: 'Room 1',
  roadhouse_lodge_room_2: 'Room 2',
  roadhouse_lodge_room_3: 'Room 3',
  carriage_house: 'Carriage House',
  penthouse: 'Penthouse',
};

export const PROPERTY_SHORT_NAMES: Record<string, string> = {
  grizzly_maze: 'GM',
  roadhouse_lodge_room_1: 'R1',
  roadhouse_lodge_room_2: 'R2',
  roadhouse_lodge_room_3: 'R3',
  carriage_house: 'CH',
  penthouse: 'PH',
};

// Includes aggregate "all_lodge" for dashboard/analytics
export const PROPERTY_NAMES_WITH_AGGREGATE: Record<string, string> = {
  grizzly_maze: 'Grizzly Maze',
  all_lodge: 'Roadhouse Lodge',
  roadhouse_lodge_room_1: 'Room 1',
  roadhouse_lodge_room_2: 'Room 2',
  roadhouse_lodge_room_3: 'Room 3',
  carriage_house: 'Carriage House',
  penthouse: 'Penthouse',
};

// ─── Groupings ───────────────────────────────────────────────────────────────

export const PROPERTY_GROUP: Record<string, string> = {
  grizzly_maze: 'grizzly',
  all_lodge: 'lodge',
  roadhouse_lodge_room_1: 'lodge',
  roadhouse_lodge_room_2: 'lodge',
  roadhouse_lodge_room_3: 'lodge',
  carriage_house: 'lodge',
  penthouse: 'lodge',
};

export const LODGE_PROPERTIES = [
  'all_lodge',
  'roadhouse_lodge_room_1',
  'roadhouse_lodge_room_2',
  'roadhouse_lodge_room_3',
  'carriage_house',
  'penthouse',
];

// ─── Colors (hex) for calendar & charts ──────────────────────────────────────

export const PROPERTY_COLORS: Record<string, string> = {
  grizzly_maze: '#7C9082',
  roadhouse_lodge_room_1: '#6366F1',
  roadhouse_lodge_room_2: '#8B5CF6',
  roadhouse_lodge_room_3: '#A855F7',
  carriage_house: '#EC4899',
  penthouse: '#F59E0B',
};

// Analytics palette
export const PALETTE = {
  SAGE: '#7C9082',
  SAGE_LIGHT: '#A3B8A0',
  TAN: '#C4A97D',
  TAN_LIGHT: '#D4C4A0',
  WARM_CREAM: '#F5F0E8',
  SLATE: '#64748B',
} as const;

export const PIE_COLORS = [
  PALETTE.SAGE, PALETTE.TAN, '#8B7355',
  PALETTE.SAGE_LIGHT, PALETTE.TAN_LIGHT, PALETTE.SLATE,
];

// ─── Tailwind themes for logs page ───────────────────────────────────────────

export interface PropertyTheme {
  gradient: string;
  accent: string;
  light: string;
  ring: string;
}

export const PROPERTY_THEMES: Record<string, PropertyTheme> = {
  grizzly_maze:           { gradient: 'from-amber-500 to-orange-600', accent: 'text-amber-600', light: 'bg-amber-50', ring: 'ring-amber-200' },
  penthouse:              { gradient: 'from-violet-500 to-purple-600', accent: 'text-violet-600', light: 'bg-violet-50', ring: 'ring-violet-200' },
  carriage_house:         { gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600', light: 'bg-emerald-50', ring: 'ring-emerald-200' },
  roadhouse_lodge_room_1: { gradient: 'from-blue-500 to-indigo-600', accent: 'text-blue-600', light: 'bg-blue-50', ring: 'ring-blue-200' },
  roadhouse_lodge_room_2: { gradient: 'from-sky-500 to-blue-600', accent: 'text-sky-600', light: 'bg-sky-50', ring: 'ring-sky-200' },
  roadhouse_lodge_room_3: { gradient: 'from-cyan-500 to-teal-600', accent: 'text-cyan-600', light: 'bg-cyan-50', ring: 'ring-cyan-200' },
};

// ─── Emojis for logs page ────────────────────────────────────────────────────

export const PROPERTY_EMOJIS: Record<string, string> = {
  grizzly_maze: '\u{1F43B}',
  penthouse: '\u{1F3D4}\uFE0F',
  carriage_house: '\u{1F3E1}',
  roadhouse_lodge_room_1: '1\uFE0F\u20E3',
  roadhouse_lodge_room_2: '2\uFE0F\u20E3',
  roadhouse_lodge_room_3: '3\uFE0F\u20E3',
};

// ─── Logs page property order (different from canonical) ─────────────────────

export const PROPERTY_ORDER_LOGS = [
  'grizzly_maze', 'penthouse', 'carriage_house',
  'roadhouse_lodge_room_1', 'roadhouse_lodge_room_2',
  'roadhouse_lodge_room_3',
];

// ─── Pre-built arrays for common page patterns ──────────────────────────────

/** Calendar page: [{id, name, color}] */
export const CALENDAR_PROPERTIES = PROPERTY_IDS.map(id => ({
  id,
  name: PROPERTY_NAMES[id],
  color: PROPERTY_COLORS[id],
}));

/** Messages page: [{id, name}] with "All Properties" prepended */
export const MESSAGE_PROPERTIES = [
  { id: 'all', name: 'All Properties' },
  ...PROPERTY_IDS.map(id => ({ id, name: PROPERTY_NAMES[id] })),
];

// ─── AI system prompt property description ───────────────────────────────────

export const AI_PROPERTY_DESCRIPTION = 'Properties include Grizzly Maze (cabin), and Roadhouse Lodge rooms (Room 1, Room 2, Room 3, Carriage House, Penthouse).';
