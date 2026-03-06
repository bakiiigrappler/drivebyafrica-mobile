import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type VehicleSource = 'korea' | 'china' | 'dubai';

export interface CartItem {
  vehicleId: string;
  vehicleSource: VehicleSource;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePriceUSD: number;
  imageUrl: string | null;
  addedAt: number;
}

const MAX_ITEMS = 3;
const STORAGE_KEY = 'cart-items';

interface CartState {
  items: CartItem[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  addItem: (item: Omit<CartItem, 'addedAt'>) => { success: boolean; error?: string };
  removeItem: (vehicleId: string) => void;
  clearCart: () => void;
  canAdd: (source: VehicleSource) => { allowed: boolean; reason?: string };
}

async function saveItems(items: CartItem[]) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isInitialized: false,

  initialize: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as CartItem[];
        set({ items, isInitialized: true });
        return;
      }
    } catch {}
    set({ isInitialized: true });
  },

  canAdd: (source: VehicleSource) => {
    const { items } = get();
    if (items.length >= MAX_ITEMS) {
      return { allowed: false, reason: 'cart.errorMaxItems' };
    }
    if (items.length > 0 && items[0].vehicleSource !== source) {
      return { allowed: false, reason: 'cart.errorDifferentSource' };
    }
    return { allowed: true };
  },

  addItem: (item) => {
    const { items, canAdd } = get();

    if (items.some((i) => i.vehicleId === item.vehicleId)) {
      return { success: false, error: 'cart.errorDuplicate' };
    }

    const check = canAdd(item.vehicleSource);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    const newItems = [...items, { ...item, addedAt: Date.now() }];
    set({ items: newItems });
    saveItems(newItems);
    return { success: true };
  },

  removeItem: (vehicleId) => {
    const newItems = get().items.filter((i) => i.vehicleId !== vehicleId);
    set({ items: newItems });
    saveItems(newItems);
  },

  clearCart: () => {
    set({ items: [] });
    saveItems([]);
  },
}));
