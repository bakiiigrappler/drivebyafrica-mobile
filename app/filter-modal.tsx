import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useFilterStore } from '@/store';

const { width } = Dimensions.get('window');

// Animated Pressable component
const AnimatedPressable = ({ children, style, onPress, scaleValue = 0.97 }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// Filter options
const SOURCES = [
  { id: 'all', label: 'Tous', flag: null },
  { id: 'korea', label: 'Corée', flag: '🇰🇷' },
  { id: 'china', label: 'Chine', flag: '🇨🇳' },
  { id: 'dubai', label: 'Dubaï', flag: '🇦🇪' },
];

const BODY_TYPES = [
  { id: 'sedan', label: 'Berline', icon: 'car-outline' },
  { id: 'suv', label: 'SUV', icon: 'car-sport-outline' },
  { id: 'hatchback', label: 'Compacte', icon: 'car-outline' },
  { id: 'pickup', label: 'Pick-up', icon: 'car-outline' },
  { id: 'van', label: 'Van', icon: 'bus-outline' },
  { id: 'coupe', label: 'Coupé', icon: 'car-sport-outline' },
];

const TRANSMISSIONS = [
  { id: 'automatic', label: 'Automatique' },
  { id: 'manual', label: 'Manuelle' },
  { id: 'cvt', label: 'CVT' },
];

const FUEL_TYPES = [
  { id: 'petrol', label: 'Essence' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'hybrid', label: 'Hybride' },
  { id: 'electric', label: 'Électrique' },
  { id: 'lpg', label: 'GPL' },
];

const POPULAR_BRANDS = [
  'Toyota', 'Honda', 'Hyundai', 'Kia', 'Mercedes-Benz',
  'BMW', 'Audi', 'Nissan', 'Mazda', 'Lexus',
  'Volkswagen', 'Ford', 'Chevrolet', 'Porsche', 'Land Rover',
];

const PRICE_PRESETS = [
  { label: 'Tout prix', min: 0, max: 200000 },
  { label: '< 5 000$', min: 0, max: 5000 },
  { label: '5k - 10k$', min: 5000, max: 10000 },
  { label: '10k - 20k$', min: 10000, max: 20000 },
  { label: '20k - 50k$', min: 20000, max: 50000 },
  { label: '> 50k$', min: 50000, max: 200000 },
];

const MILEAGE_PRESETS = [
  { label: 'Tout', value: 500000 },
  { label: '< 50k km', value: 50000 },
  { label: '< 100k km', value: 100000 },
  { label: '< 150k km', value: 150000 },
  { label: '< 200k km', value: 200000 },
];

export default function FilterModalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { filters, setFilters, resetFilters } = useFilterStore();

  // Local state for filters
  const [source, setSource] = useState<'all' | 'korea' | 'china' | 'dubai'>(filters.source || 'all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(filters.makes || []);
  const [bodyType, setBodyType] = useState('');
  const [transmission, setTransmission] = useState(filters.transmission || '');
  const [fuelType, setFuelType] = useState(filters.fuelType || '');
  const [yearFrom, setYearFrom] = useState(filters.yearFrom || 2000);
  const [yearTo, setYearTo] = useState(filters.yearTo || 2025);
  const [priceFrom, setPriceFrom] = useState(filters.priceFrom || 0);
  const [priceTo, setPriceTo] = useState(filters.priceTo || 200000);
  const [mileageMax, setMileageMax] = useState(filters.mileageMax || 500000);
  const [searchQuery, setSearchQuery] = useState(filters.search || '');

  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  const filteredBrands = POPULAR_BRANDS.filter(brand =>
    brand.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter(b => b !== brand));
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const handleApplyFilters = () => {
    setFilters({
      source: source,
      search: searchQuery.trim() || undefined,
      makes: selectedBrands.length > 0 ? selectedBrands : undefined,
      transmission: transmission || undefined,
      fuelType: fuelType || undefined,
      yearFrom: yearFrom > 2000 ? yearFrom : undefined,
      yearTo: yearTo < 2025 ? yearTo : undefined,
      priceFrom: priceFrom > 0 ? priceFrom : undefined,
      priceTo: priceTo < 200000 ? priceTo : undefined,
      mileageMax: mileageMax < 500000 ? mileageMax : undefined,
    });
    // Navigate to live page to see results
    router.replace('/(tabs)/live');
  };

  const handleReset = () => {
    setSource('all');
    setSelectedBrands([]);
    setBodyType('');
    setTransmission('');
    setFuelType('');
    setYearFrom(2000);
    setYearTo(2025);
    setPriceFrom(0);
    setPriceTo(200000);
    setMileageMax(500000);
    setSearchQuery('');
    resetFilters();
  };

  const activeFiltersCount = [
    source !== 'all',
    selectedBrands.length > 0,
    bodyType,
    transmission,
    fuelType,
    yearFrom > 2000,
    yearTo < 2025,
    priceFrom > 0,
    priceTo < 200000,
    mileageMax < 500000,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const bgColor = colorScheme === 'dark' ? '#111' : '#F8F9FA';
  const cardBg = colorScheme === 'dark' ? '#1a1a1a' : AppTheme.white;
  const borderColor = colorScheme === 'dark' ? '#333' : '#E5E7EB';

  return (
    <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Drag Handle */}
      <View style={[styles.dragHandleContainer, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.dragHandle, { backgroundColor: borderColor }]} />
      </View>

      {/* Header - Minimal */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.closeButton} scaleValue={0.9}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </AnimatedPressable>

        <View style={styles.headerCenter}>
          <ThemedText variant="title" size="lg">Rechercher</ThemedText>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <ThemedText style={styles.filterCountText}>{activeFiltersCount}</ThemedText>
            </View>
          )}
        </View>

        <AnimatedPressable onPress={handleReset} scaleValue={0.95}>
          <ThemedText style={{ color: AppTheme.orange, fontWeight: '600' }}>Effacer</ThemedText>
        </AnimatedPressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={[styles.searchInputContainer, { backgroundColor: cardBg, borderColor }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher marque, modèle..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Source Filter */}
        <View style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>Source</ThemedText>
          <View style={styles.chipRow}>
            {SOURCES.map((s) => (
              <AnimatedPressable
                key={s.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: source === s.id ? AppTheme.orange : cardBg,
                    borderColor: source === s.id ? AppTheme.orange : borderColor,
                  }
                ]}
                onPress={() => setSource(s.id as 'all' | 'korea' | 'china' | 'dubai')}
                scaleValue={0.95}
              >
                {s.flag && <ThemedText style={{ marginRight: 6 }}>{s.flag}</ThemedText>}
                <ThemedText style={{ color: source === s.id ? AppTheme.white : colors.textPrimary, fontWeight: source === s.id ? '600' : '400' }}>
                  {s.label}
                </ThemedText>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Brand Filter */}
        <View style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>Marque</ThemedText>
          <AnimatedPressable
            style={[styles.selectButton, { backgroundColor: cardBg, borderColor }]}
            onPress={() => setShowBrandPicker(true)}
            scaleValue={0.98}
          >
            <ThemedText variant={selectedBrands.length > 0 ? 'default' : 'muted'}>
              {selectedBrands.length > 0
                ? `${selectedBrands.length} marque(s) sélectionnée(s)`
                : 'Sélectionner des marques'
              }
            </ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </AnimatedPressable>
          {selectedBrands.length > 0 && (
            <View style={styles.selectedChips}>
              {selectedBrands.map((brand) => (
                <AnimatedPressable
                  key={brand}
                  style={[styles.selectedChip, { backgroundColor: AppTheme.orange + '20' }]}
                  onPress={() => toggleBrand(brand)}
                  scaleValue={0.95}
                >
                  <ThemedText size="sm" style={{ color: AppTheme.orange }}>{brand}</ThemedText>
                  <Ionicons name="close" size={14} color={AppTheme.orange} style={{ marginLeft: 4 }} />
                </AnimatedPressable>
              ))}
            </View>
          )}
        </View>

        {/* Body Type Filter */}
        <View style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>Type de carrosserie</ThemedText>
          <View style={styles.chipRow}>
            {BODY_TYPES.map((type) => (
              <AnimatedPressable
                key={type.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: bodyType === type.id ? AppTheme.orange : cardBg,
                    borderColor: bodyType === type.id ? AppTheme.orange : borderColor,
                  }
                ]}
                onPress={() => setBodyType(bodyType === type.id ? '' : type.id)}
                scaleValue={0.95}
              >
                <Ionicons
                  name={type.icon as any}
                  size={16}
                  color={bodyType === type.id ? AppTheme.white : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <ThemedText style={{ color: bodyType === type.id ? AppTheme.white : colors.textPrimary }}>
                  {type.label}
                </ThemedText>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Transmission Filter */}
        <View style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>Transmission</ThemedText>
          <View style={styles.chipRow}>
            {TRANSMISSIONS.map((t) => (
              <AnimatedPressable
                key={t.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: transmission === t.id ? AppTheme.orange : cardBg,
                    borderColor: transmission === t.id ? AppTheme.orange : borderColor,
                  }
                ]}
                onPress={() => setTransmission(transmission === t.id ? '' : t.id)}
                scaleValue={0.95}
              >
                <ThemedText style={{ color: transmission === t.id ? AppTheme.white : colors.textPrimary }}>
                  {t.label}
                </ThemedText>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Fuel Type Filter */}
        <View style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>Carburant</ThemedText>
          <View style={styles.chipRow}>
            {FUEL_TYPES.map((f) => (
              <AnimatedPressable
                key={f.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: fuelType === f.id ? AppTheme.orange : cardBg,
                    borderColor: fuelType === f.id ? AppTheme.orange : borderColor,
                  }
                ]}
                onPress={() => setFuelType(fuelType === f.id ? '' : f.id)}
                scaleValue={0.95}
              >
                <ThemedText style={{ color: fuelType === f.id ? AppTheme.white : colors.textPrimary }}>
                  {f.label}
                </ThemedText>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Year Range */}
        <View style={styles.section}>
          <View style={styles.rangeHeader}>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Année</ThemedText>
            <ThemedText variant="muted">{yearFrom} - {yearTo}</ThemedText>
          </View>
          <View style={styles.rangeRow}>
            <View style={styles.rangeInput}>
              <ThemedText variant="muted" size="xs">De</ThemedText>
              <View style={styles.yearButtonsRow}>
                <AnimatedPressable
                  style={[styles.yearButton, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => setYearFrom(Math.max(2000, yearFrom - 1))}
                  scaleValue={0.9}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </AnimatedPressable>
                <View style={[styles.yearValue, { backgroundColor: cardBg, borderColor }]}>
                  <ThemedText style={{ fontWeight: '600' }}>{yearFrom}</ThemedText>
                </View>
                <AnimatedPressable
                  style={[styles.yearButton, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => setYearFrom(Math.min(yearTo, yearFrom + 1))}
                  scaleValue={0.9}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </AnimatedPressable>
              </View>
            </View>
            <View style={styles.rangeDivider} />
            <View style={styles.rangeInput}>
              <ThemedText variant="muted" size="xs">À</ThemedText>
              <View style={styles.yearButtonsRow}>
                <AnimatedPressable
                  style={[styles.yearButton, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => setYearTo(Math.max(yearFrom, yearTo - 1))}
                  scaleValue={0.9}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </AnimatedPressable>
                <View style={[styles.yearValue, { backgroundColor: cardBg, borderColor }]}>
                  <ThemedText style={{ fontWeight: '600' }}>{yearTo}</ThemedText>
                </View>
                <AnimatedPressable
                  style={[styles.yearButton, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => setYearTo(Math.min(2025, yearTo + 1))}
                  scaleValue={0.9}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <View style={styles.rangeHeader}>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Prix (USD)</ThemedText>
            <ThemedText variant="muted">${priceFrom.toLocaleString()} - ${priceTo.toLocaleString()}</ThemedText>
          </View>
          <View style={styles.chipRow}>
            {PRICE_PRESETS.map((preset) => {
              const isActive = priceFrom === preset.min && priceTo === preset.max;
              return (
                <AnimatedPressable
                  key={preset.label}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? AppTheme.orange : cardBg,
                      borderColor: isActive ? AppTheme.orange : borderColor,
                    }
                  ]}
                  onPress={() => {
                    setPriceFrom(preset.min);
                    setPriceTo(preset.max);
                  }}
                  scaleValue={0.95}
                >
                  <ThemedText style={{ color: isActive ? AppTheme.white : colors.textPrimary }}>
                    {preset.label}
                  </ThemedText>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Mileage */}
        <View style={styles.section}>
          <ThemedText variant="subtitle" style={styles.sectionTitle}>Kilométrage max</ThemedText>
          <View style={styles.chipRow}>
            {MILEAGE_PRESETS.map((preset) => {
              const isActive = mileageMax === preset.value;
              return (
                <AnimatedPressable
                  key={preset.label}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? AppTheme.orange : cardBg,
                      borderColor: isActive ? AppTheme.orange : borderColor,
                    }
                  ]}
                  onPress={() => setMileageMax(preset.value)}
                  scaleValue={0.95}
                >
                  <ThemedText style={{ color: isActive ? AppTheme.white : colors.textPrimary }}>
                    {preset.label}
                  </ThemedText>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: bgColor }]}>
        <AnimatedPressable
          style={styles.applyButtonContainer}
          onPress={handleApplyFilters}
          scaleValue={0.98}
        >
          <LinearGradient
            colors={[AppTheme.orange, '#FF8C42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyButton}
          >
            <Ionicons name="search" size={20} color={AppTheme.white} />
            <ThemedText style={styles.applyButtonText}>
              Rechercher {activeFiltersCount > 0 && `(${activeFiltersCount} filtres)`}
            </ThemedText>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      {/* Brand Picker Modal */}
      <Modal
        visible={showBrandPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowBrandPicker(false)}>
              <ThemedText style={{ color: AppTheme.orange, fontWeight: '600' }}>Fermer</ThemedText>
            </TouchableOpacity>
            <ThemedText variant="title" size="lg">Marques</ThemedText>
            <TouchableOpacity onPress={() => { setSelectedBrands([]); }}>
              <ThemedText style={{ color: AppTheme.orange, fontWeight: '600' }}>Effacer</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={[styles.modalSearchContainer, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Rechercher une marque..."
              placeholderTextColor={colors.textMuted}
              value={brandSearch}
              onChangeText={setBrandSearch}
            />
          </View>

          <ScrollView style={styles.brandList}>
            {filteredBrands.map((brand) => (
              <AnimatedPressable
                key={brand}
                style={[styles.brandItem, { borderBottomColor: borderColor }]}
                onPress={() => toggleBrand(brand)}
                scaleValue={0.98}
              >
                <ThemedText style={{ fontSize: 16 }}>{brand}</ThemedText>
                <View style={[
                  styles.checkCircle,
                  {
                    backgroundColor: selectedBrands.includes(brand) ? AppTheme.orange : 'transparent',
                    borderWidth: selectedBrands.includes(brand) ? 0 : 2,
                    borderColor: borderColor,
                  }
                ]}>
                  {selectedBrands.includes(brand) && (
                    <Ionicons name="checkmark" size={14} color={AppTheme.white} />
                  )}
                </View>
              </AnimatedPressable>
            ))}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16, backgroundColor: bgColor }]}>
            <AnimatedPressable
              style={styles.applyButtonContainer}
              onPress={() => setShowBrandPicker(false)}
              scaleValue={0.98}
            >
              <LinearGradient
                colors={[AppTheme.orange, '#FF8C42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyButton}
              >
                <ThemedText style={styles.applyButtonText}>
                  Confirmer ({selectedBrands.length} sélectionnées)
                </ThemedText>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterCountBadge: {
    backgroundColor: AppTheme.orange,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    color: AppTheme.white,
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
  },
  rangeDivider: {
    width: 20,
    height: 2,
    backgroundColor: '#ccc',
    marginTop: 20,
  },
  yearButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  yearButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearValue: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  applyButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: AppTheme.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  applyButtonText: {
    color: AppTheme.white,
    fontWeight: '700',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  brandList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  brandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
