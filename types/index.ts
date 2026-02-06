export * from './database';

export type VehicleSource = 'korea' | 'china' | 'dubai';
export type VehicleStatus = 'available' | 'reserved' | 'sold' | 'pending';
export type TransmissionType = 'automatic' | 'manual' | 'cvt';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg';

export interface VehicleFilters {
  source?: VehicleSource | 'all';
  makes?: string[];
  models?: string[];
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  mileageMax?: number;
  transmission?: TransmissionType | string;
  fuelType?: FuelType | string;
  search?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc';
}

export interface PaginatedVehicles {
  data: import('./database').Vehicle[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

// Vehicle Batch types for bulk purchases
export interface VehicleBatch {
  id: string;
  added_by_collaborator_id: string;
  make: string;
  model: string;
  year: number;
  title: string;
  description?: string;
  source: string;
  source_country: 'china' | 'korea' | 'dubai';
  price_per_unit_usd: number;
  total_quantity: number;
  available_quantity: number;
  minimum_order_quantity: number;
  images: string[];
  thumbnail_url?: string;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  drive_type?: string;
  engine_size?: string;
  body_type?: string;
  color?: string;
  condition?: string;
  features?: Record<string, unknown>[];
  status: 'pending' | 'approved' | 'rejected' | 'sold_out';
  approved_by_admin_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  is_visible: boolean;
  collaborator_notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedBatches {
  data: VehicleBatch[];
  total: number;
  page: number;
  totalPages: number;
}

// Quote types for user quotes/devis
export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'validated';

export interface Quote {
  id: string;
  quote_number: string;
  user_id: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  vehicle_source: VehicleSource;
  destination_id: string;
  destination_name: string;
  destination_country: string;
  shipping_type?: 'container' | 'groupage';
  shipping_cost_xaf: number;
  insurance_cost_xaf: number;
  inspection_fee_xaf: number;
  total_cost_xaf: number;
  status: QuoteStatus;
  valid_until: string;
  created_at: string;
  updated_at?: string;
  vehicles?: {
    images?: string[];
  };
}

export interface PaginatedQuotes {
  data: Quote[];
  total: number;
  page: number;
  totalPages: number;
}

// Order types (matching web version)
export type OrderStatusType =
  | 'deposit_pending'
  | 'deposit_paid'
  | 'vehicle_locked'
  | 'inspection_sent'
  | 'full_payment_received'
  | 'vehicle_purchased'
  | 'export_customs'
  | 'in_transit'
  | 'at_port'
  | 'shipping'
  | 'documents_ready'
  | 'customs'
  | 'ready_pickup'
  | 'delivered'
  | 'cancelled'
  | 'pending_reassignment';

export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  title: string;
  description?: string;
  location?: string;
  completed_at?: string;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  vehicle_id: string;
  bid_id?: string;
  order_number?: string;
  invoice_number?: string;
  status: OrderStatusType;
  vehicle_price_usd: number;
  shipping_price_usd?: number;
  insurance_price_usd?: number;
  customs_estimate_usd?: number;
  total_price_usd?: number;
  destination_country: string;
  destination_port?: string;
  destination_city?: string;
  shipping_method?: string;
  container_type?: string;
  shipping_type?: 'container' | 'groupage';
  shipping_cost_xaf?: number;
  deposit_amount_usd?: number;
  deposit_amount_xaf?: number;
  deposit_paid_at?: string;
  balance_amount_xaf?: number;
  balance_paid_at?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_arrival?: string;
  shipping_eta?: string;
  documents?: Record<string, unknown>;
  uploaded_documents?: string[];
  customer_name?: string;
  customer_email?: string;
  customer_whatsapp?: string;
  customer_country?: string;
  admin_notes?: string;
  customer_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderWithTracking extends Order {
  tracking?: OrderTracking[];
  vehicle?: {
    make: string;
    model: string;
    year: number;
    images?: string[];
  };
}

export interface PaginatedOrders {
  data: OrderWithTracking[];
  total: number;
  page: number;
  totalPages: number;
}

// Order status configuration (matching web version)
export const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; step: number; description: string }> = {
  deposit_pending: {
    label: 'En attente de l\'acompte',
    color: '#F59E0B',
    step: 0,
    description: 'Versez l\'acompte de 1000$',
  },
  deposit_paid: {
    label: 'Acompte paye',
    color: '#F59E0B',
    step: 1,
    description: 'L\'acompte de 1000$ a ete verse',
  },
  vehicle_locked: {
    label: 'Vehicule bloque',
    color: '#3B82F6',
    step: 2,
    description: 'Le vehicule est reserve pour vous',
  },
  inspection_sent: {
    label: 'Inspection envoyee',
    color: '#06B6D4',
    step: 3,
    description: 'Le rapport d\'inspection a ete envoye',
  },
  full_payment_received: {
    label: 'Paiement complet recu',
    color: '#22C55E',
    step: 4,
    description: 'Le paiement complet a ete confirme',
  },
  vehicle_purchased: {
    label: 'Vehicule achete',
    color: '#10B981',
    step: 5,
    description: 'Le vehicule a ete achete',
  },
  export_customs: {
    label: 'Douane export',
    color: '#F59E0B',
    step: 6,
    description: 'Le vehicule passe la douane d\'exportation',
  },
  in_transit: {
    label: 'En transit',
    color: '#8B5CF6',
    step: 7,
    description: 'Le vehicule est en transit vers le port',
  },
  at_port: {
    label: 'Au port',
    color: '#0EA5E9',
    step: 8,
    description: 'Le vehicule est arrive au port',
  },
  shipping: {
    label: 'En mer',
    color: '#6366F1',
    step: 9,
    description: 'Le vehicule est en mer',
  },
  documents_ready: {
    label: 'Documentation prete',
    color: '#8B5CF6',
    step: 10,
    description: 'Les documents sont disponibles',
  },
  customs: {
    label: 'En douane',
    color: '#F97316',
    step: 11,
    description: 'Le vehicule est en cours de dedouanement',
  },
  ready_pickup: {
    label: 'Pret pour retrait',
    color: '#14B8A6',
    step: 12,
    description: 'Le vehicule est pret a etre retire',
  },
  delivered: {
    label: 'Livre',
    color: '#22C55E',
    step: 13,
    description: 'Le vehicule a ete livre',
  },
  cancelled: {
    label: 'Annule',
    color: '#EF4444',
    step: 0,
    description: 'La commande a ete annulee',
  },
  pending_reassignment: {
    label: 'Vehicule non disponible',
    color: '#EAB308',
    step: 0,
    description: 'Le vehicule n\'est plus disponible',
  },
}
