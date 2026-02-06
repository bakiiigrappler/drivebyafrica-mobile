import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants';
import { ThemedText } from '@/components/ui/ThemedText';

const QUICK_FILTERS = [
  { id: 'filters', label: 'Filtres', icon: 'options-outline' },
  { id: 'petrol', label: 'Essence', icon: 'flash-outline' },
  { id: 'diesel', label: 'Diesel', icon: 'flash-outline' },
  { id: 'automatic', label: 'Auto', icon: 'cog-outline' },
  { id: 'hybrid', label: 'Hybride', icon: 'leaf-outline' },
];

interface QuickFiltersProps {
  onFilterPress?: (filterId: string) => void;
  activeFilters?: string[];
}

export function QuickFilters({ onFilterPress, activeFilters = [] }: QuickFiltersProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {QUICK_FILTERS.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        const isMainFilter = filter.id === 'filters';

        return (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filter,
              {
                backgroundColor: isMainFilter
                  ? colors.mandarin
                  : isActive
                  ? colors.royalBlue
                  : colors.surface,
                borderColor: isMainFilter
                  ? colors.mandarin
                  : isActive
                  ? colors.royalBlue
                  : colors.border,
              },
            ]}
            onPress={() => onFilterPress?.(filter.id)}
          >
            <Ionicons
              name={filter.icon as any}
              size={14}
              color={isMainFilter || isActive ? '#FFFFFF' : colors.textSecondary}
            />
            <ThemedText
              size="xs"
              style={{
                color: isMainFilter || isActive ? '#FFFFFF' : colors.textSecondary,
                marginLeft: 4,
              }}
            >
              {filter.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
});
