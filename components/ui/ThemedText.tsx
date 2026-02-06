import { Text, type TextProps, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  variant?: 'default' | 'title' | 'subtitle' | 'muted' | 'link';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
};

export function ThemedText({
  style,
  variant = 'default',
  size = 'base',
  ...props
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const textColor =
    variant === 'muted'
      ? colors.textMuted
      : variant === 'subtitle'
      ? colors.textSecondary
      : variant === 'link'
      ? colors.accent
      : variant === 'title'
      ? colors.textPrimary
      : colors.textPrimary;

  const fontSize =
    size === 'xs'
      ? 12
      : size === 'sm'
      ? 14
      : size === 'lg'
      ? 18
      : size === 'xl'
      ? 20
      : size === '2xl'
      ? 24
      : size === '3xl'
      ? 30
      : 16;

  const fontWeight = variant === 'title' ? '700' : variant === 'subtitle' ? '600' : '400';

  return (
    <Text
      style={[
        { color: textColor, fontSize, fontWeight: fontWeight as any },
        style,
      ]}
      {...props}
    />
  );
}
