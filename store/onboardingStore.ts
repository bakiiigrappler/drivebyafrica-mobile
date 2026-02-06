import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  setHasSeenOnboarding: (value: boolean) => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  isLoading: true,

  checkOnboardingStatus: async () => {
    try {
      const value = await SecureStore.getItemAsync('hasSeenOnboarding');
      set({ hasSeenOnboarding: value === 'true', isLoading: false });
    } catch {
      set({ hasSeenOnboarding: false, isLoading: false });
    }
  },

  setHasSeenOnboarding: async (value: boolean) => {
    try {
      await SecureStore.setItemAsync('hasSeenOnboarding', value ? 'true' : 'false');
      set({ hasSeenOnboarding: value });
    } catch {
      set({ hasSeenOnboarding: value });
    }
  },
}));
