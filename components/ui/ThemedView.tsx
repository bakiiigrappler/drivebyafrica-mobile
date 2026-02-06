import { View, type ViewProps } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedViewProps = ViewProps & {
  variant?: 'default' | 'surface' | 'card';
};

export function ThemedView({ style, variant = 'default', ...props }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const backgroundColor =
    variant === 'surface'
      ? colors.surface
      : variant === 'card'
      ? colors.cardBg
      : colors.background;

  return <View style={[{ backgroundColor }, style]} {...props} />;
}
