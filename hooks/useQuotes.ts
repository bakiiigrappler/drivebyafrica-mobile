import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Quote, PaginatedQuotes, QuoteStatus } from '@/types';
import { useAuthStore } from '@/store';

export type QuoteStatusFilter = QuoteStatus | 'all';

interface UseQuotesOptions {
  status?: QuoteStatusFilter;
  page?: number;
  enabled?: boolean;
}

// Query key factory
export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (status: QuoteStatusFilter | undefined, page: number) =>
    [...quoteKeys.lists(), { status, page }] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
};

const ITEMS_PER_PAGE = 20;

/**
 * Fetch user quotes from Supabase (like web version)
 */
async function fetchQuotes(
  userId: string,
  status?: QuoteStatusFilter,
  page: number = 0
): Promise<PaginatedQuotes> {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Build query
  let query = supabase
    .from('quotes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply pagination
  query = query.range(from, to);

  const { data: quotes, error, count } = await query;

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

  // Fetch vehicle images separately (like web version)
  let quotesWithImages = quotes || [];
  if (quotes && quotes.length > 0) {
    const vehicleIds = [...new Set(quotes.map(q => q.vehicle_id).filter(Boolean))];
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, images')
        .in('id', vehicleIds);

      if (vehicles) {
        const vehicleMap = new Map(vehicles.map(v => [v.id, v.images]));
        quotesWithImages = quotes.map(q => ({
          ...q,
          vehicles: q.vehicle_id && vehicleMap.has(q.vehicle_id)
            ? { images: vehicleMap.get(q.vehicle_id) }
            : null
        }));
      }
    }
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return {
    data: quotesWithImages as Quote[],
    total: totalCount,
    page,
    totalPages,
  };
}

/**
 * Delete a quote
 */
async function deleteQuote(quoteId: string, userId: string): Promise<void> {
  // First verify the quote belongs to the user and check its status
  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('id, status, user_id')
    .eq('id', quoteId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !quote) {
    throw new Error('Devis non trouve');
  }

  // Only allow deletion of pending or expired quotes
  if (quote.status === 'accepted') {
    throw new Error('Impossible de supprimer un devis accepte');
  }

  // Delete the quote
  const { error: deleteError } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error('Erreur lors de la suppression');
  }
}

/**
 * Hook for fetching user quotes
 */
export function useQuotes({ status, page = 0, enabled = true }: UseQuotesOptions = {}) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: quoteKeys.list(status, page),
    queryFn: () => fetchQuotes(user?.id || '', status, page),
    enabled: enabled && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for deleting a quote
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (quoteId: string) => deleteQuote(quoteId, user?.id || ''),
    onSuccess: () => {
      // Invalidate quotes list to refresh
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
  });
}

/**
 * Create quote data interface
 */
export interface CreateQuoteData {
  quote_number: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  vehicle_source: string;
  destination_id: string;
  destination_name: string;
  destination_country: string;
  shipping_type: 'container' | 'groupage';
  shipping_cost_xaf: number;
  insurance_cost_xaf: number;
  inspection_fee_xaf: number;
  total_cost_xaf: number;
}

/**
 * Hook for creating a quote (like web version)
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (quoteData: CreateQuoteData) => {
      if (!user) {
        throw new Error('Non authentifie');
      }

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          quote_number: quoteData.quote_number,
          user_id: user.id,
          vehicle_id: quoteData.vehicle_id,
          vehicle_make: quoteData.vehicle_make,
          vehicle_model: quoteData.vehicle_model,
          vehicle_year: quoteData.vehicle_year,
          vehicle_price_usd: Math.round(quoteData.vehicle_price_usd),
          vehicle_source: quoteData.vehicle_source,
          destination_id: quoteData.destination_id,
          destination_name: quoteData.destination_name,
          destination_country: quoteData.destination_country,
          shipping_type: quoteData.shipping_type || 'container',
          shipping_cost_xaf: Math.round(quoteData.shipping_cost_xaf),
          insurance_cost_xaf: Math.round(quoteData.insurance_cost_xaf),
          inspection_fee_xaf: Math.round(quoteData.inspection_fee_xaf),
          total_cost_xaf: Math.round(quoteData.total_cost_xaf),
          status: 'pending',
          valid_until: validUntil.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Quote creation error:', error);
        // Check constraint violation
        if (error.code === '23514') {
          throw new Error('Donnees invalides: source ou type d\'expedition incorrect');
        }
        throw new Error(error.message || 'Erreur lors de la creation du devis');
      }

      return data as Quote;
    },
    onSuccess: () => {
      // Invalidate quotes list to refresh
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
  });
}

/**
 * Hook to invalidate quotes cache
 */
export function useInvalidateQuotes() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: quoteKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: quoteKeys.lists() }),
  };
}
