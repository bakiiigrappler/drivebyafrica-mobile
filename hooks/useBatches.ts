import { useQuery } from '@tanstack/react-query';
import type { VehicleBatch, PaginatedBatches } from '@/types';

// Use environment variables for Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const ITEMS_PER_PAGE = 12;

export type BatchSourceFilter = 'all' | 'korea' | 'china' | 'dubai';
export type BatchSortBy = 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'quantity_desc';

interface UseBatchesOptions {
  page?: number;
  source?: BatchSourceFilter;
  sortBy?: BatchSortBy;
  search?: string;
  enabled?: boolean;
}

// Query key factory for better cache management
export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (options: UseBatchesOptions) => [...batchKeys.lists(), options] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
};

/**
 * Fetch batches from API
 */
async function fetchBatches(options: UseBatchesOptions): Promise<PaginatedBatches> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing');
  }

  const { page = 0, source = 'all', sortBy = 'newest', search } = options;

  const params = new URLSearchParams();
  params.set('select', '*');

  // Only show approved and visible batches
  params.append('status', 'eq.approved');
  params.append('is_visible', 'eq.true');
  params.append('available_quantity', 'gt.0');

  // Apply source filter
  if (source !== 'all') {
    params.append('source_country', `eq.${source}`);
  }

  // Apply search filter
  if (search && search.trim().length >= 2) {
    const searchTerm = search.trim();
    params.append('or', `(make.ilike.*${searchTerm}*,model.ilike.*${searchTerm}*,title.ilike.*${searchTerm}*)`);
  }

  // Apply sorting
  let orderBy = 'created_at.desc';
  switch (sortBy) {
    case 'newest':
      orderBy = 'created_at.desc';
      break;
    case 'price_asc':
      orderBy = 'price_per_unit_usd.asc';
      break;
    case 'price_desc':
      orderBy = 'price_per_unit_usd.desc';
      break;
    case 'year_desc':
      orderBy = 'year.desc';
      break;
    case 'quantity_desc':
      orderBy = 'available_quantity.desc';
      break;
  }
  params.set('order', orderBy);

  // Apply pagination
  const offset = page * ITEMS_PER_PAGE;
  params.set('offset', offset.toString());
  params.set('limit', ITEMS_PER_PAGE.toString());

  const url = `${SUPABASE_URL}/rest/v1/vehicle_batches?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=estimated',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch batches: ${response.status}`);
  }

  const data = await response.json();
  const batches = (data as VehicleBatch[]) || [];

  // Get total count from Content-Range header
  const contentRange = response.headers.get('Content-Range');
  let totalCount = 0;
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) {
      totalCount = parseInt(match[1], 10);
    }
  }

  if (totalCount === 0 && batches.length > 0) {
    totalCount = batches.length === ITEMS_PER_PAGE ? batches.length * 10 : batches.length;
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return {
    data: batches,
    total: totalCount,
    page,
    totalPages,
  };
}

/**
 * Fetch single batch by ID
 */
async function fetchBatch(id: string): Promise<VehicleBatch> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing');
  }

  const url = `${SUPABASE_URL}/rest/v1/vehicle_batches?id=eq.${id}&select=*`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch batch: ${response.status}`);
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error('Batch not found');
  }

  return data[0] as VehicleBatch;
}

/**
 * Hook for fetching paginated batches
 */
export function useBatches(options: UseBatchesOptions = {}) {
  const { enabled = true, ...restOptions } = options;

  return useQuery({
    queryKey: batchKeys.list(restOptions),
    queryFn: () => fetchBatches(restOptions),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for fetching single batch
 */
export function useBatch(id: string) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: () => fetchBatch(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
