import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/store';

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const darkMode = useSettingsStore((s) => s.darkMode);

  if (darkMode === true) return 'dark';
  if (darkMode === false) return 'light';
  return systemScheme ?? 'dark';
}
