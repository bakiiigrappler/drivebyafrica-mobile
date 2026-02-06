import { create } from 'zustand';
import type { VehicleFilters } from '@/types';

interface FilterState {
  filters: VehicleFilters;
  setFilters: (filters: Partial<VehicleFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: VehicleFilters = {
  source: 'all',
  sortBy: 'newest',
};

export const useFilterStore = create<FilterState>((set) => ({
  filters: defaultFilters,

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () => set({ filters: defaultFilters }),
}));
