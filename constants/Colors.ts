/**
 * Driveby Africa Design System - Mobile
 * Orange, White, Black/Navy color scheme
 */

export const Colors = {
  light: {
    // Primary Colors
    background: '#FFFFFF',
    foreground: '#1E293B',
    surface: '#F8FAFC',
    surfaceHover: '#F1F5F9',

    // Brand Colors - Orange primary
    primary: '#F97316',
    primaryDark: '#EA580C',
    secondary: '#1E3A5F',
    secondaryDark: '#0F2744',

    // Legacy names for compatibility
    mandarin: '#F97316',
    royalBlue: '#1E3A5F',
    jewel: '#15803D',

    // Semantic Colors
    accent: '#F97316',
    accentSecondary: '#1E3A5F',
    success: '#22C55E',
    error: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Text Colors
    textPrimary: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textOnPrimary: '#FFFFFF',

    // Border & Card
    border: '#E2E8F0',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',

    // Input
    inputBg: '#F8FAFC',
    inputBorder: '#CBD5E1',

    // Tab bar
    tabIconDefault: '#64748B',
    tabIconSelected: '#F97316',
    tabBarBg: '#FFFFFF',
  },
  dark: {
    // Primary Colors - Navy/Dark Blue background
    background: '#0F172A',
    foreground: '#F8FAFC',
    surface: '#1E293B',
    surfaceHover: '#334155',

    // Brand Colors - Orange primary
    primary: '#F97316',
    primaryDark: '#EA580C',
    secondary: '#1E3A5F',
    secondaryDark: '#0F2744',

    // Legacy names for compatibility
    mandarin: '#F97316',
    royalBlue: '#1E3A5F',
    jewel: '#22C55E',

    // Semantic Colors
    accent: '#F97316',
    accentSecondary: '#3B82F6',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#FBBF24',
    info: '#3B82F6',

    // Text Colors
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',

    // Border & Card
    border: '#334155',
    cardBg: '#1E293B',
    cardBorder: '#334155',

    // Input
    inputBg: '#1E293B',
    inputBorder: '#475569',

    // Tab bar
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#F97316',
    tabBarBg: '#0F172A',
  },
};

// App theme colors (for consistent styling)
export const AppTheme = {
  orange: '#F97316',
  orangeDark: '#EA580C',
  orangeLight: '#FDBA74',
  navy: '#1E3A5F',
  navyDark: '#0F2744',
  navyLight: '#334155',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

// Source country flags
export const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

export const SOURCE_NAMES: Record<string, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  available: '#22C55E',
  reserved: '#F97316',
  sold: '#DC2626',
  pending: '#3B82F6',
};

export const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  sold: 'Vendu',
  pending: 'En attente',
};

// Order status colors - 13-step workflow matching web
export const ORDER_STATUS_COLORS: Record<string, string> = {
  // Main workflow statuses (13 steps)
  deposit_paid: '#EAB308', // yellow-500
  vehicle_locked: '#3B82F6', // blue-500
  inspection_sent: '#06B6D4', // cyan-500
  full_payment_received: '#22C55E', // green-500
  vehicle_purchased: '#10B981', // emerald-500
  export_customs: '#F59E0B', // amber-500
  in_transit: '#8B5CF6', // purple-500
  at_port: '#0EA5E9', // sky-500
  shipping: '#6366F1', // indigo-500
  documents_ready: '#8B5CF6', // violet-500
  customs: '#F97316', // orange-500
  ready_pickup: '#14B8A6', // teal-500
  delivered: '#16A34A', // green-600
  // Special statuses
  cancelled: '#DC2626', // red-500
  pending_reassignment: '#CA8A04', // yellow-600
  // Legacy statuses
  pending: '#EAB308',
  confirmed: '#3B82F6',
  deposit_pending: '#EAB308',
  deposit_received: '#3B82F6',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  // Main workflow statuses (13 steps)
  deposit_paid: 'Acompte payé',
  vehicle_locked: 'Véhicule bloqué',
  inspection_sent: 'Inspection envoyée',
  full_payment_received: 'Paiement reçu',
  vehicle_purchased: 'Véhicule acheté',
  export_customs: 'Douane export',
  in_transit: 'En transit',
  at_port: 'Au port',
  shipping: 'En mer',
  documents_ready: 'Documents prêts',
  customs: 'En douane',
  ready_pickup: 'Prêt retrait',
  delivered: 'Livré',
  // Special statuses
  cancelled: 'Annulé',
  pending_reassignment: 'En réassignation',
  // Legacy statuses
  pending: 'En attente',
  confirmed: 'Confirmée',
  deposit_pending: 'En attente acompte',
  deposit_received: 'Véhicule bloqué',
};

// Order status step numbers for progress tracking
export const ORDER_STATUS_STEPS: Record<string, number> = {
  deposit_paid: 1,
  vehicle_locked: 2,
  inspection_sent: 3,
  full_payment_received: 4,
  vehicle_purchased: 5,
  export_customs: 6,
  in_transit: 7,
  at_port: 8,
  shipping: 9,
  documents_ready: 10,
  customs: 11,
  ready_pickup: 12,
  delivered: 13,
  cancelled: 0,
  pending_reassignment: 0,
};
