import { View, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, SOURCE_NAMES } from '@/constants';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { useFilterStore } from '@/store';
import type { VehicleFilters as VehicleFiltersType } from '@/types';

const SOURCES = ['all', 'korea', 'china', 'dubai'] as const;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'year_desc', label: 'Année récente' },
  { value: 'mileage_asc', label: 'Kilométrage' },
] as const;

export function VehicleFilters() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { filters, setFilters, resetFilters } = useFilterStore();
  const [showModal, setShowModal] = useState(false);

  const handleSourceChange = (source: typeof SOURCES[number]) => {
    setFilters({ source: source === 'all' ? undefined : source as any });
  };

  const handleSortChange = (sortBy: VehicleFiltersType['sortBy']) => {
    setFilters({ sortBy });
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Source tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabs}
      >
        {SOURCES.map((source) => {
          const isActive = (filters.source || 'all') === source;
          return (
            <TouchableOpacity
              key={source}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.mandarin : colors.surface,
                  borderColor: isActive ? colors.mandarin : colors.border,
                },
              ]}
              onPress={() => handleSourceChange(source)}
            >
              <ThemedText
                size="sm"
                style={{ color: isActive ? '#FFFFFF' : colors.textSecondary }}
              >
                {source === 'all' ? 'Tous' : SOURCE_NAMES[source]}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sort & Filter buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.textSecondary} />
          <ThemedText size="sm" variant="muted" style={{ marginLeft: 6 }}>
            Trier
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={resetFilters}
        >
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          <ThemedText size="sm" variant="muted" style={{ marginLeft: 6 }}>
            Reset
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="title" size="lg">Trier par</ThemedText>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  filters.sortBy === option.value && { backgroundColor: colors.surface },
                ]}
                onPress={() => handleSortChange(option.value)}
              >
                <ThemedText>{option.label}</ThemedText>
                {filters.sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color={colors.mandarin} />
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  tabsContainer: {
    marginBottom: 12,
  },
  tabs: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
