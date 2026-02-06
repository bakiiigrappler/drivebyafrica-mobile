import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';
import type { Language } from '@/lib/i18n';

const STORAGE_KEY = 'driveby_settings';

function detectDeviceLanguage(): Language {
  try {
    let locale = 'en';
    if (Platform.OS === 'ios') {
      locale =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'en';
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
    const lang = locale.substring(0, 2).toLowerCase();
    if (lang === 'fr') return 'fr';
    if (lang === 'zh') return 'zh';
    return 'en';
  } catch {
    return 'en';
  }
}

interface SettingsState {
  language: Language;
  currency: string;
  shippingCountry: string;
  pushNotifications: boolean;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  darkMode: boolean | null; // null = system default
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  setCurrency: (currency: string) => void;
  setShippingCountry: (country: string) => void;
  setPushNotifications: (value: boolean) => void;
  setEmailNotifications: (value: boolean) => void;
  setWhatsappNotifications: (value: boolean) => void;
  setDarkMode: (value: boolean | null) => void;
}

async function loadSettings(): Promise<Partial<SettingsState>> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return {};
}

async function saveSettings(state: Partial<SettingsState>) {
  try {
    const data = {
      language: state.language,
      currency: state.currency,
      shippingCountry: state.shippingCountry,
      pushNotifications: state.pushNotifications,
      emailNotifications: state.emailNotifications,
      whatsappNotifications: state.whatsappNotifications,
      darkMode: state.darkMode,
    };
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'fr',
  currency: 'XAF',
  shippingCountry: 'Gabon',
  pushNotifications: true,
  emailNotifications: true,
  whatsappNotifications: false,
  darkMode: null,
  isInitialized: false,

  initialize: async () => {
    const saved = await loadSettings();
    // On first launch (no saved language), detect device language
    const language = saved.language || detectDeviceLanguage();
    set({
      ...saved,
      language,
      isInitialized: true,
    });
    // Save detected language if it wasn't saved before
    if (!saved.language) {
      saveSettings({ ...get(), language });
    }
  },

  setLanguage: (language) => {
    set({ language });
    saveSettings({ ...get(), language });
  },

  setCurrency: (currency) => {
    set({ currency });
    saveSettings({ ...get(), currency });
  },

  setShippingCountry: (shippingCountry) => {
    set({ shippingCountry });
    saveSettings({ ...get(), shippingCountry });
  },

  setPushNotifications: (pushNotifications) => {
    set({ pushNotifications });
    saveSettings({ ...get(), pushNotifications });
  },

  setEmailNotifications: (emailNotifications) => {
    set({ emailNotifications });
    saveSettings({ ...get(), emailNotifications });
  },

  setWhatsappNotifications: (whatsappNotifications) => {
    set({ whatsappNotifications });
    saveSettings({ ...get(), whatsappNotifications });
  },

  setDarkMode: (darkMode) => {
    set({ darkMode });
    saveSettings({ ...get(), darkMode });
  },
}));
