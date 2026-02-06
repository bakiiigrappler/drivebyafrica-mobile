import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, SOURCE_FLAGS } from '@/constants';
import { ThemedText } from '@/components/ui/ThemedText';
import { useFilterStore } from '@/store';

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: 'car-sport' },
  { id: 'korea', label: 'Corée', flag: '🇰🇷' },
  { id: 'china', label: 'Chine', flag: '🇨🇳' },
  { id: 'dubai', label: 'Dubaï', flag: '🇦🇪' },
];

interface CategoryTabsProps {
  vehicleCount?: number;
}

export function CategoryTabs({ vehicleCount }: CategoryTabsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { filters, setFilters } = useFilterStore();

  const activeSource = filters.source || 'all';

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {CATEGORIES.map((category) => {
          const isActive = activeSource === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.mandarin : colors.surface,
                  borderColor: isActive ? colors.mandarin : colors.border,
                },
              ]}
              onPress={() => setFilters({ source: category.id === 'all' ? undefined : category.id as any })}
            >
              {category.flag ? (
                <ThemedText size="base">{category.flag}</ThemedText>
              ) : (
                <Ionicons
                  name={category.icon as any}
                  size={16}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                />
              )}
              <ThemedText
                size="sm"
                style={{
                  color: isActive ? '#FFFFFF' : colors.textSecondary,
                  marginLeft: 6,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {category.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Vehicle count */}
      {vehicleCount !== undefined && (
        <View style={styles.countContainer}>
          <ThemedText variant="subtitle" size="lg">
            Véhicules disponibles
          </ThemedText>
          <View style={[styles.countBadge, { backgroundColor: colors.mandarin + '20' }]}>
            <ThemedText style={{ color: colors.mandarin, fontWeight: '700' }}>
              {vehicleCount.toLocaleString()}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
