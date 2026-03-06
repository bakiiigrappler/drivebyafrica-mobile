import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Vehicle, VehicleFilters, PaginatedVehicles } from '@/types';
import { ITEMS_PER_PAGE } from '@/constants';

// Use environment variables for Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface UseVehiclesOptions {
  filters?: VehicleFilters;
  enabled?: boolean;
}

// Query key factory for better cache management
export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (filters: VehicleFilters | undefined, page: number) =>
    [...vehicleKeys.lists(), { filters, page }] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
};

/**
 * Check if filters have active constraints (matches web implementation)
 */
function hasActiveFilters(filters: VehicleFilters | undefined): boolean {
  if (!filters) return false;
  return !!(
    (filters.source && filters.source !== 'all') ||
    (filters.makes && filters.makes.length > 0) ||
    (filters.models && filters.models.length > 0) ||
    filters.yearFrom ||
    filters.yearTo ||
    filters.priceFrom ||
    filters.priceTo ||
    filters.mileageMax ||
    filters.transmission ||
    filters.fuelType ||
    filters.driveType ||
    filters.color ||
    filters.bodyType ||
    filters.status ||
    filters.newArrivals ||
    (filters.search && filters.search.trim().length >= 3)
  );
}

/**
 * Build PostgREST query string from filters (matches web implementation)
 */
function buildQueryString(
  filters: VehicleFilters | undefined,
  page: number,
  limit: number
): string {
  const params = new URLSearchParams();

  // Select all columns
  params.set('select', '*');

  // Only show visible vehicles
  params.append('is_visible', 'eq.true');

  // Apply filters
  if (filters?.source && filters.source !== 'all') {
    params.append('source', `eq.${filters.source}`);
  }

  if (filters?.makes && filters.makes.length > 0) {
    params.append('make', `in.(${filters.makes.join(',')})`);
  }

  if (filters?.models && filters.models.length > 0) {
    params.append('model', `in.(${filters.models.join(',')})`);
  }

  if (filters?.yearFrom) {
    params.append('year', `gte.${filters.yearFrom}`);
  }

  if (filters?.yearTo) {
    params.append('year', `lte.${filters.yearTo}`);
  }

  if (filters?.priceFrom) {
    params.append('current_price_usd', `gte.${filters.priceFrom}`);
  }

  if (filters?.priceTo) {
    params.append('current_price_usd', `lte.${filters.priceTo}`);
  }

  if (filters?.mileageMax) {
    params.append('mileage', `lte.${filters.mileageMax}`);
  }

  if (filters?.transmission) {
    params.append('transmission', `eq.${filters.transmission}`);
  }

  if (filters?.fuelType) {
    params.append('fuel_type', `eq.${filters.fuelType}`);
  }

  if (filters?.driveType) {
    params.append('drive_type', `eq.${filters.driveType}`);
  }

  if (filters?.color) {
    params.append('color', `ilike.*${filters.color}*`);
  }

  if (filters?.bodyType) {
    params.append('body_type', `eq.${filters.bodyType}`);
  }

  if (filters?.status) {
    params.append('status', `eq.${filters.status}`);
  }

  // New arrivals: vehicles added in the last 48 hours
  if (filters?.newArrivals) {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    params.append('created_at', `gte.${since}`);
  }

  // Apply search (searches make and model)
  // Require minimum 3 characters to avoid expensive queries
  if (filters?.search && filters.search.trim().length >= 3) {
    const searchTerm = filters.search.trim();
    params.append('or', `(make.ilike.*${searchTerm}*,model.ilike.*${searchTerm}*)`);
  }

  // Apply sorting - use created_at as secondary sort for consistency (matches web)
  let orderBy = 'created_at.desc';
  switch (filters?.sortBy) {
    case 'newest':
      orderBy = 'created_at.desc';
      break;
    case 'price_asc':
      orderBy = 'fob_price_usd.asc.nullslast,created_at.desc';
      break;
    case 'price_desc':
      orderBy = 'fob_price_usd.desc.nullsfirst,created_at.desc';
      break;
    case 'year_desc':
      orderBy = 'year.desc.nullslast,created_at.desc';
      break;
    case 'year_asc':
      orderBy = 'year.asc.nullslast,created_at.desc';
      break;
    case 'mileage_asc':
      orderBy = 'mileage.asc.nullslast,created_at.desc';
      break;
    case 'mileage_desc':
      orderBy = 'mileage.desc.nullsfirst,created_at.desc';
      break;
  }
  params.set('order', orderBy);

  // Apply pagination using offset/limit
  const from = page * limit;
  params.set('offset', from.toString());
  params.set('limit', limit.toString());

  return params.toString();
}

/**
 * Fetch vehicles directly via PostgREST API (matches web implementation)
 */
async function fetchVehicles(
  page: number,
  filters: VehicleFilters | undefined,
  limit: number = ITEMS_PER_PAGE
): Promise<PaginatedVehicles> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing');
  }

  const queryString = buildQueryString(filters, page, limit);
  const url = `${SUPABASE_URL}/rest/v1/vehicles?${queryString}`;

  let response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': hasActiveFilters(filters) ? 'count=exact' : 'count=estimated',
    },
  });

  // If count=exact times out (500), retry with count=estimated
  if (!response.ok && hasActiveFilters(filters)) {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=estimated',
      },
    });
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch vehicles: ${response.status}`);
  }

  const data = await response.json();
  const vehicles = (data as Vehicle[]) || [];

  // Get total count from Content-Range header
  const contentRange = response.headers.get('Content-Range');
  let totalCount = 0;
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) {
      totalCount = parseInt(match[1], 10);
    }
  }

  // Estimate if no count available
  if (totalCount === 0 && vehicles.length > 0) {
    totalCount = vehicles.length === limit ? vehicles.length * 100 : vehicles.length;
  }

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: vehicles,
    total: totalCount,
    page,
    totalPages,
    hasMore: page < totalPages - 1,
  };
}

/**
 * Fetch single vehicle via PostgREST API
 */
async function fetchVehicle(id: string): Promise<Vehicle> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing');
  }

  const url = `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${id}&select=*`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vehicle: ${response.status}`);
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error('Vehicle not found');
  }

  return data[0] as Vehicle;
}

export function useVehicles({ filters, enabled = true }: UseVehiclesOptions = {}) {
  return useInfiniteQuery({
    queryKey: ['vehicles', filters],
    queryFn: ({ pageParam = 0 }) => fetchVehicles(pageParam, filters),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 0,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

interface UseVehiclesPaginatedOptions {
  filters?: VehicleFilters;
  page: number;
  enabled?: boolean;
}

/**
 * Hook for paginated vehicles with page-based navigation
 */
export function useVehiclesPaginated({ filters, page, enabled = true }: UseVehiclesPaginatedOptions) {
  return useQuery({
    queryKey: vehicleKeys.list(filters, page),
    queryFn: () => fetchVehicles(page, filters),
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => fetchVehicle(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to invalidate vehicle cache
 */
export function useInvalidateVehicles() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(id) }),
  };
}
