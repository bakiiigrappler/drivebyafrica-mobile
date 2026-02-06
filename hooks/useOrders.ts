import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import type { Order, OrderTracking, OrderWithTracking, PaginatedOrders, OrderStatusType } from '@/types';

// Order status helpers - 13-step workflow (matches web implementation)
export const ORDER_STATUSES = {
  // Main workflow statuses (13 steps)
  deposit_paid: {
    label: 'Acompte paye',
    color: '#EAB308', // yellow-500
    step: 1,
    description: "L'acompte de 1000$ a ete verse",
  },
  vehicle_locked: {
    label: 'Vehicule bloque',
    color: '#3B82F6', // blue-500
    step: 2,
    description: 'Le vehicule est reserve pour vous',
  },
  inspection_sent: {
    label: 'Inspection envoyee',
    color: '#06B6D4', // cyan-500
    step: 3,
    description: "Le rapport d'inspection a ete envoye",
  },
  full_payment_received: {
    label: 'Totalite du paiement recu',
    color: '#22C55E', // green-500
    step: 4,
    description: 'Le paiement complet a ete confirme',
  },
  vehicle_purchased: {
    label: 'Vehicule achete',
    color: '#10B981', // emerald-500
    step: 5,
    description: 'Le vehicule a ete achete',
  },
  export_customs: {
    label: 'Douane export',
    color: '#F59E0B', // amber-500
    step: 6,
    description: "Le vehicule passe la douane d'exportation",
  },
  in_transit: {
    label: 'En transit',
    color: '#A855F7', // purple-500
    step: 7,
    description: 'Le vehicule est en transit vers le port',
  },
  at_port: {
    label: 'Au port',
    color: '#0EA5E9', // sky-500
    step: 8,
    description: 'Le vehicule est arrive au port',
  },
  shipping: {
    label: 'En mer',
    color: '#6366F1', // indigo-500
    step: 9,
    description: 'Le vehicule est en mer',
  },
  documents_ready: {
    label: 'Remise documentation',
    color: '#8B5CF6', // violet-500
    step: 10,
    description: 'Les documents sont disponibles au telechargement',
  },
  customs: {
    label: 'En douane',
    color: '#F97316', // orange-500
    step: 11,
    description: 'Le vehicule est en cours de dedouanement',
  },
  ready_pickup: {
    label: 'Pret pour retrait',
    color: '#14B8A6', // teal-500
    step: 12,
    description: 'Le vehicule est pret a etre retire',
  },
  delivered: {
    label: 'Livre',
    color: '#16A34A', // green-600
    step: 13,
    description: 'Le vehicule a ete livre',
  },
  // Special statuses
  cancelled: {
    label: 'Annule',
    color: '#EF4444', // red-500
    step: 0,
    description: 'La commande a ete annulee',
  },
  pending_reassignment: {
    label: 'Vehicule non disponible',
    color: '#CA8A04', // yellow-600
    step: 0,
    description: "Le vehicule n'est plus disponible, reassignation en cours",
  },
  // Legacy statuses for backwards compatibility
  deposit_pending: {
    label: "En attente de l'acompte",
    color: '#EAB308',
    step: 1,
    description: "Versez l'acompte de 1000$",
  },
  deposit_received: {
    label: 'Vehicule bloque',
    color: '#3B82F6',
    step: 2,
    description: 'Le vehicule est reserve',
  },
  inspection_pending: {
    label: 'Inspection en cours',
    color: '#06B6D4',
    step: 3,
    description: 'Inspection en cours',
  },
  inspection_complete: {
    label: 'Inspection envoyee',
    color: '#06B6D4',
    step: 3,
    description: "Rapport d'inspection disponible",
  },
  payment_pending: {
    label: 'En attente du paiement',
    color: '#EAB308',
    step: 4,
    description: 'Effectuez le paiement du solde',
  },
  payment_received: {
    label: 'Paiement recu',
    color: '#22C55E',
    step: 4,
    description: 'Le paiement a ete recu',
  },
  preparing_export: {
    label: 'Douane export',
    color: '#F59E0B',
    step: 6,
    description: "Preparation pour l'export",
  },
  shipped: {
    label: 'En transit',
    color: '#A855F7',
    step: 7,
    description: 'Le vehicule est en route',
  },
  customs_clearance: {
    label: 'En douane',
    color: '#F97316',
    step: 11,
    description: 'En cours de dedouanement',
  },
  completed: {
    label: 'Livre',
    color: '#16A34A',
    step: 13,
    description: 'La commande est terminee',
  },
  pending_payment: {
    label: 'En attente de paiement',
    color: '#EAB308',
    step: 4,
    description: 'En attente du paiement',
  },
  paid: {
    label: 'Paiement recu',
    color: '#22C55E',
    step: 4,
    description: 'Le paiement a ete recu',
  },
  processing: {
    label: 'En traitement',
    color: '#3B82F6',
    step: 2,
    description: 'Le vehicule est bloque, en attente de traitement',
  },
} as const;

export type OrderStatusKey = keyof typeof ORDER_STATUSES;

export function getOrderStatus(status: string) {
  return ORDER_STATUSES[status as OrderStatusKey] || {
    label: status,
    color: '#6B7280', // gray-500
    step: 0,
    description: '',
  };
}

// Status filter types
export type OrderStatusFilter = OrderStatusType | 'all' | 'active' | 'completed';

// Query key factory
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (status: OrderStatusFilter | undefined, page: number) =>
    [...orderKeys.lists(), { status, page }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  stats: (userId: string) => [...orderKeys.all, 'stats', userId] as const,
};

const ITEMS_PER_PAGE = 20;

// Active statuses (not delivered or cancelled)
const ACTIVE_STATUSES = [
  'deposit_pending',
  'deposit_paid',
  'vehicle_locked',
  'inspection_sent',
  'full_payment_received',
  'vehicle_purchased',
  'export_customs',
  'in_transit',
  'at_port',
  'shipping',
  'documents_ready',
  'customs',
  'ready_pickup',
];

interface UseOrdersOptions {
  status?: OrderStatusFilter;
  page?: number;
  enabled?: boolean;
}

/**
 * Fetch user orders with filtering and pagination (like web version)
 */
async function fetchOrders(
  userId: string,
  status?: OrderStatusFilter,
  page: number = 0
): Promise<PaginatedOrders> {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Build query
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Apply status filter
  if (status && status !== 'all') {
    if (status === 'active') {
      query = query.in('status', ACTIVE_STATUSES);
    } else if (status === 'completed') {
      query = query.eq('status', 'delivered');
    } else {
      query = query.eq('status', status);
    }
  }

  // Apply pagination
  query = query.range(from, to);

  const { data: orders, error, count } = await query;

  if (error) {
    // Table doesn't exist yet - return empty array
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return { data: [], total: 0, page, totalPages: 0 };
    }
    // Permission denied - RLS policy issue
    if (error.code === '42501' || error.message?.includes('permission denied')) {
      return { data: [], total: 0, page, totalPages: 0 };
    }
    throw new Error(error.message);
  }

  // Fetch tracking and vehicle data (like web version)
  const ordersWithData: OrderWithTracking[] = [];

  if (orders && orders.length > 0) {
    // Fetch all tracking data in one query
    const orderIds = orders.map(o => o.id);
    const { data: trackingData } = await supabase
      .from('order_tracking')
      .select('*')
      .in('order_id', orderIds)
      .order('completed_at', { ascending: true });

    // Group tracking by order_id
    const trackingMap = new Map<string, OrderTracking[]>();
    if (trackingData) {
      for (const track of trackingData) {
        const existing = trackingMap.get(track.order_id) || [];
        existing.push(track as OrderTracking);
        trackingMap.set(track.order_id, existing);
      }
    }

    // Fetch vehicle data
    const vehicleIds = [...new Set(orders.map(o => o.vehicle_id).filter(Boolean))];
    let vehicleMap = new Map<string, { make: string; model: string; year: number; images?: string[] }>();

    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, make, model, year, images')
        .in('id', vehicleIds);

      if (vehicles) {
        vehicleMap = new Map(vehicles.map(v => [v.id, {
          make: v.make,
          model: v.model,
          year: v.year ?? 0,
          images: v.images ?? undefined,
        }]));
      }
    }

    // Combine orders with tracking and vehicle data
    for (const order of orders) {
      ordersWithData.push({
        ...(order as Order),
        tracking: trackingMap.get(order.id) || [],
        vehicle: order.vehicle_id ? vehicleMap.get(order.vehicle_id) : undefined,
      });
    }
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return {
    data: ordersWithData,
    total: totalCount,
    page,
    totalPages,
  };
}

/**
 * Hook for fetching user orders with filtering and pagination
 */
export function useOrders({ status, page = 0, enabled = true }: UseOrdersOptions = {}) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: orderKeys.list(status, page),
    queryFn: () => fetchOrders(user?.id || '', status, page),
    enabled: enabled && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for fetching a single order with tracking
 */
export function useOrder(id: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async (): Promise<OrderWithTracking | null> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Fetch tracking
      const { data: trackingData } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', id)
        .order('completed_at', { ascending: true });

      // Fetch vehicle
      let vehicle;
      if (data.vehicle_id) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('id, make, model, year, images')
          .eq('id', data.vehicle_id)
          .single();

        if (vehicleData) {
          vehicle = {
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year ?? 0,
            images: vehicleData.images ?? undefined,
          };
        }
      }

      return {
        ...(data as Order),
        tracking: (trackingData || []) as OrderTracking[],
        vehicle,
      };
    },
    enabled: !!user && !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching order tracking
 */
export function useOrderTracking(orderId: string) {
  return useQuery({
    queryKey: ['orderTracking', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('completed_at', { ascending: true });

      if (error) throw error;

      return data as OrderTracking[];
    },
    enabled: !!orderId,
  });
}

/**
 * Get order stats (counts by status)
 */
export function useOrderStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: orderKeys.stats(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) return { active: 0, inTransit: 0, completed: 0, cancelled: 0 };

      const { data: orders, error } = await supabase
        .from('orders')
        .select('status')
        .eq('user_id', user.id);

      if (error || !orders) return { active: 0, inTransit: 0, completed: 0, cancelled: 0 };

      const stats = {
        active: 0,
        inTransit: 0,
        completed: 0,
        cancelled: 0,
      };

      for (const order of orders) {
        if (order.status === 'delivered' || order.status === 'completed') {
          stats.completed++;
        } else if (order.status === 'cancelled') {
          stats.cancelled++;
        } else if (['shipping', 'in_transit', 'at_port'].includes(order.status)) {
          stats.inTransit++;
        } else if (!['delivered', 'cancelled', 'completed'].includes(order.status)) {
          stats.active++;
        }
      }

      return stats;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for creating an order
 */
export function useCreateOrder() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      vehicleId: string;
      vehiclePriceUsd: number;
      destinationCountry: string;
      destinationPort?: string;
      destinationCity?: string;
      shippingMethod?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          vehicle_id: params.vehicleId,
          vehicle_price_usd: params.vehiclePriceUsd,
          destination_country: params.destinationCountry,
          destination_port: params.destinationPort || null,
          shipping_method: params.shippingMethod || 'sea',
          status: 'deposit_pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial tracking entry
      await supabase.from('order_tracking').insert({
        order_id: data.id,
        status: 'created',
        title: 'Commande creee',
        description: "Votre commande a ete creee. Versez l'acompte de 1000$ pour bloquer le vehicule.",
      });

      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// Generate order number
function generateOrderNumber(): string {
  const prefix = 'DBA';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export interface CreateOrderFromQuoteParams {
  quoteId: string;
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleSource: string;
  vehiclePriceUsd: number;
  destinationName: string;
  destinationCountry: string;
  destinationPort?: string;
  shippingType: 'container' | 'groupage';
  shippingCostXaf: number;
  insuranceCostXaf: number;
  totalCostXaf: number;
  depositAmountUsd: number;
  depositAmountXaf: number;
  depositPaymentReference: string;
  depositPaymentMethod: string;
  customerName?: string;
  customerEmail?: string;
  customerWhatsapp?: string;
}

/**
 * Hook for creating an order after successful payment from a quote
 */
export function useCreateOrderFromQuote() {
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateOrderFromQuoteParams) => {
      if (!user) throw new Error('Not authenticated');

      const orderNumber = generateOrderNumber();

      console.log('Creating order from quote:', { orderNumber, params });

      // Create the order with deposit already paid
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          quote_id: params.quoteId,
          vehicle_id: params.vehicleId,
          order_number: orderNumber,
          vehicle_make: params.vehicleMake,
          vehicle_model: params.vehicleModel,
          vehicle_year: params.vehicleYear,
          vehicle_source: params.vehicleSource,
          vehicle_price_usd: params.vehiclePriceUsd,
          shipping_cost_xaf: params.shippingCostXaf,
          insurance_cost_xaf: params.insuranceCostXaf,
          total_cost_xaf: params.totalCostXaf,
          destination_name: params.destinationName,
          destination_country: params.destinationCountry,
          destination_port: params.destinationPort || null,
          shipping_type: params.shippingType,
          shipping_method: 'sea',
          container_type: params.shippingType === 'container' ? 'fcl' : 'shared',
          // Deposit info - already paid!
          deposit_amount_usd: params.depositAmountUsd,
          deposit_amount_xaf: params.depositAmountXaf,
          deposit_paid_at: new Date().toISOString(),
          deposit_payment_method: params.depositPaymentMethod,
          deposit_payment_reference: params.depositPaymentReference,
          // Customer info
          customer_name: params.customerName || profile?.full_name || null,
          customer_email: params.customerEmail || user.email || null,
          customer_whatsapp: params.customerWhatsapp || profile?.whatsapp_number || null,
          customer_country: profile?.country || null,
          // Status - deposit already paid
          status: 'deposit_paid',
          documents: {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating order:', error);
        throw error;
      }

      console.log('Order created:', data);

      // Create initial tracking entry
      const { error: trackingError } = await supabase.from('order_tracking').insert({
        order_id: data.id,
        status: 'deposit_paid',
        title: 'Acompte paye',
        description: `Acompte de ${params.depositAmountUsd}$ recu. Votre vehicule ${params.vehicleMake} ${params.vehicleModel} est maintenant bloque.`,
        completed_at: new Date().toISOString(),
      });

      if (trackingError) {
        console.error('Error creating tracking:', trackingError);
      }

      // Update quote status to 'accepted'
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', params.quoteId);

      if (quoteError) {
        console.error('Error updating quote status:', quoteError);
      }

      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

/**
 * Hook to invalidate orders cache
 */
export function useInvalidateOrders() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
    invalidateDetail: (id: string) => queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) }),
  };
}
