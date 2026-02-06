import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface BadgeProps {
  label: string;
  color?: string;
  variant?: 'solid' | 'outline';
}

export function Badge({ label, color, variant = 'solid' }: BadgeProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const bgColor = color || colors.mandarin;

  return (
    <View
      style={[
        styles.badge,
        variant === 'solid'
          ? { backgroundColor: bgColor }
          : { borderColor: bgColor, borderWidth: 1, backgroundColor: 'transparent' },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: variant === 'solid' ? '#FFFFFF' : bgColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
