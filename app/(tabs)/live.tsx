import { FlatList, StyleSheet, View, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView, Animated, Easing, TextInput, Modal, Pressable } from 'react-native';
import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { VehicleCard, VehicleCardHorizontal } from '@/components/vehicles';
import { useVehiclesPaginated, useFavorites } from '@/hooks';
import { useFilterStore, useSettingsStore } from '@/store';
import { t } from '@/lib/i18n';
import type { Vehicle } from '@/types';

// Sort options like web version
const getSortOptions = (lang: string) => [
  { id: 'newest', label: lang === 'zh' ? '最新' : lang === 'en' ? 'Newest' : 'Plus récents' },
  { id: 'price_asc', label: lang === 'zh' ? '价格从低到高' : lang === 'en' ? 'Price: Low to High' : 'Prix croissant' },
  { id: 'price_desc', label: lang === 'zh' ? '价格从高到低' : lang === 'en' ? 'Price: High to Low' : 'Prix décroissant' },
  { id: 'year_desc', label: lang === 'zh' ? '年份（最新）' : lang === 'en' ? 'Year (newest)' : 'Année (récent)' },
  { id: 'year_asc', label: lang === 'zh' ? '年份（最旧）' : lang === 'en' ? 'Year (oldest)' : 'Année (ancien)' },
  { id: 'mileage_asc', label: lang === 'zh' ? '里程（低）' : lang === 'en' ? 'Mileage (low)' : 'Kilométrage (bas)' },
  { id: 'mileage_desc', label: lang === 'zh' ? '里程（高）' : lang === 'en' ? 'Mileage (high)' : 'Kilométrage (haut)' },
];

const getFilterChips = (lang: string) => [
  { id: 'filters', label: lang === 'zh' ? '筛选' : lang === 'en' ? 'Filters' : 'Filtres', icon: 'options-outline' },
  { id: 'petrol', label: lang === 'zh' ? '汽油' : lang === 'en' ? 'Petrol' : 'Essence' },
  { id: 'diesel', label: lang === 'zh' ? '柴油' : lang === 'en' ? 'Diesel' : 'Diesel' },
  { id: 'first_owner', label: lang === 'zh' ? '一手车' : lang === 'en' ? '1st owner' : '1er propriétaire' },
];

const getSourceFilters = (lang: string) => [
  { id: 'all', label: lang === 'zh' ? '全部' : lang === 'en' ? 'All' : 'Tous', flag: null },
  { id: 'korea', label: lang === 'zh' ? '韩国' : lang === 'en' ? 'Korea' : 'Corée', flag: '🇰🇷' },
  { id: 'china', label: lang === 'zh' ? '中国' : lang === 'en' ? 'China' : 'Chine', flag: '🇨🇳' },
  { id: 'dubai', label: lang === 'zh' ? '迪拜' : lang === 'en' ? 'Dubai' : 'Dubaï', flag: '🇦🇪' },
];

export default function LiveCarsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filters, setFilters } = useFilterStore();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { language } = useSettingsStore();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeSource, setActiveSource] = useState<'all' | 'korea' | 'china' | 'dubai'>(filters.source || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  // New states for search and sort
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Debounce search input (300ms like web)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSourceChange = (source: 'all' | 'korea' | 'china' | 'dubai') => {
    setActiveSource(source);
    setFilters({ ...filters, source });
    setCurrentPage(0); // Reset to first page when changing source
  };

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useVehiclesPaginated({ filters, page: currentPage });

  const vehicles = useMemo(() => {
    let result = data?.data || [];

    // Apply search filter
    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase().trim();
      result = result.filter((v: Vehicle) =>
        v.make?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search) ||
        v.year?.toString().includes(search) ||
        v.grade?.toLowerCase().includes(search)
      );
    }

    // Apply local filters
    if (activeFilters.includes('petrol')) {
      result = result.filter((v: Vehicle) => v.fuel_type?.toLowerCase() === 'petrol' || v.fuel_type?.toLowerCase() === 'gasoline' || v.fuel_type?.toLowerCase() === 'essence');
    }
    if (activeFilters.includes('diesel')) {
      result = result.filter((v: Vehicle) => v.fuel_type?.toLowerCase() === 'diesel');
    }
    if (activeFilters.includes('first_owner')) {
      result = result.filter((v: Vehicle) => v.mileage && v.mileage < 50000);
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.current_price_usd || a.start_price_usd || 0) - (b.current_price_usd || b.start_price_usd || 0);
        case 'price_desc':
          return (b.current_price_usd || b.start_price_usd || 0) - (a.current_price_usd || a.start_price_usd || 0);
        case 'year_desc':
          return (b.year || 0) - (a.year || 0);
        case 'year_asc':
          return (a.year || 0) - (b.year || 0);
        case 'mileage_asc':
          return (a.mileage || 0) - (b.mileage || 0);
        case 'mileage_desc':
          return (b.mileage || 0) - (a.mileage || 0);
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return result;
  }, [data, activeFilters, debouncedSearch, sortBy]);

  const totalCount = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const toggleFilter = (filterId: string) => {
    if (filterId === 'filters') {
      router.push('/filter-modal');
      return;
    }
    setActiveFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const renderListItem = useCallback(
    ({ item }: { item: Vehicle }) => (
      <VehicleCardHorizontal
        vehicle={item}
        isFavorite={favoriteIds.has(item.id)}
        onToggleFavorite={toggleFavorite}
      />
    ),
    [favoriteIds, toggleFavorite]
  );

  const renderGridItem = useCallback(
    ({ item }: { item: Vehicle }) => (
      <VehicleCard
        vehicle={item}
        isFavorite={favoriteIds.has(item.id)}
        onToggleFavorite={toggleFavorite}
      />
    ),
    [favoriteIds, toggleFavorite]
  );

  const keyExtractor = useCallback((item: Vehicle) => item.id, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = activeFilters.length;
    if (activeSource !== 'all') count++;
    if (debouncedSearch.trim()) count++;
    return count;
  }, [activeFilters, activeSource, debouncedSearch]);

  const currentSortLabel = getSortOptions(language).find(o => o.id === sortBy)?.label || (language === 'zh' ? '最新' : language === 'en' ? 'Newest' : 'Plus récents');

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.sectionHeader}>
        <ThemedText variant="title" size="lg">{t('vehicles.title', language)}</ThemedText>
        <ThemedText variant="muted" size="sm">({vehicles.length})</ThemedText>
      </View>
      {/* Sort and filter info */}
      <View style={styles.listSubheader}>
        <TouchableOpacity
          style={styles.sortIndicator}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={14} color={AppTheme.orange} />
          <ThemedText style={styles.sortIndicatorText}>{currentSortLabel}</ThemedText>
        </TouchableOpacity>
        {activeFilterCount > 0 && (
          <View style={styles.filterCountBadge}>
            <ThemedText style={styles.filterCountText}>{activeFilterCount} {language === 'zh' ? '筛选' : language === 'en' ? `filter${activeFilterCount > 1 ? 's' : ''}` : `filtre${activeFilterCount > 1 ? 's' : ''}`}</ThemedText>
            <TouchableOpacity onPress={handleReset} style={styles.clearFiltersBtn}>
              <Ionicons name="close-circle" size={16} color={AppTheme.orange} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(0);

      if (currentPage > 2) pages.push('...');

      // Show pages around current
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 3) pages.push('...');

      // Always show last page
      if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1);
    }

    return pages;
  };

  const ListFooter = () => {
    if (totalPages <= 1) return null;

    const canGoPrevious = currentPage > 0;
    const canGoNext = currentPage < totalPages - 1;

    return (
      <View style={styles.paginationContainer}>
        {/* Pagination Row */}
        <View style={styles.paginationRow}>
          {/* Page Numbers */}
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pageButton,
                  page === currentPage && styles.pageButtonActive
                ]}
                onPress={() => goToPage(page)}
                disabled={isFetching}
                activeOpacity={0.8}
              >
                <ThemedText
                  style={[
                    styles.pageButtonText,
                    page === currentPage && styles.pageButtonTextActive
                  ]}
                >
                  {page + 1}
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <ThemedText key={index} style={styles.ellipsis}>•••</ThemedText>
            )
          ))}

          {/* Next */}
          <TouchableOpacity
            style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
            onPress={() => goToPage(currentPage + 1)}
            disabled={!canGoNext || isFetching}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={18} color={canGoNext ? '#fff' : AppTheme.orange} />
          </TouchableOpacity>
        </View>

        {/* Page Info */}
        <ThemedText style={styles.pageInfo}>
          {currentPage + 1} / {totalPages}
        </ThemedText>
      </View>
    );
  };

  // Animation for empty state
  const carAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (vehicles.length === 0 && !isLoading) {
      // Car driving animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(carAnimation, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(carAnimation, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation for button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [vehicles.length, isLoading]);

  const handleReset = () => {
    setActiveFilters([]);
    setActiveSource('all');
    setFilters({ source: 'all' });
    setCurrentPage(0);
    refetch();
  };

  const ListEmpty = () => {
    if (isLoading) return null;

    const carTranslateX = carAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-30, 30],
    });

    const wheelRotation = carAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.empty}>
        {/* Road with animated car */}
        <View style={styles.emptyRoadContainer}>
          {/* Road */}
          <View style={styles.emptyRoad}>
            <View style={styles.emptyRoadLine} />
          </View>

          {/* Animated Car */}
          <Animated.View style={[styles.emptyCarContainer, { transform: [{ translateX: carTranslateX }] }]}>
            <View style={styles.emptyCarBody}>
              <Ionicons name="car-sport" size={48} color={AppTheme.orange} />
            </View>
            {/* Wheels */}
            <Animated.View style={[styles.emptyWheel, styles.emptyWheelLeft, { transform: [{ rotate: wheelRotation }] }]}>
              <View style={styles.emptyWheelInner} />
            </Animated.View>
            <Animated.View style={[styles.emptyWheel, styles.emptyWheelRight, { transform: [{ rotate: wheelRotation }] }]}>
              <View style={styles.emptyWheelInner} />
            </Animated.View>
          </Animated.View>

          {/* Dust particles */}
          <Animated.View style={[styles.emptyDust, { opacity: carAnimation }]} />
        </View>

        {/* Icon circle */}
        <View style={[styles.emptyIconCircle, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5' }]}>
          <Ionicons name="search" size={32} color={AppTheme.orange} />
        </View>

        {/* Text content */}
        <ThemedText variant="title" size="lg" style={styles.emptyTitle}>
          {t('vehicles.noResults', language)}
        </ThemedText>
        <ThemedText variant="muted" style={styles.emptySubtitle}>
          {t('vehicles.noResultsDesc', language)}
        </ThemedText>

        {/* Reset button */}
        <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
          <TouchableOpacity
            style={styles.emptyResetButton}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={AppTheme.white} />
            <ThemedText style={styles.emptyResetButtonText}>{language === 'zh' ? '重置' : language === 'en' ? 'Reset' : 'Réinitialiser'}</ThemedText>
          </TouchableOpacity>
        </Animated.View>

        {/* Source hints */}
        <View style={styles.emptySourceHints}>
          <ThemedText variant="muted" size="xs" style={{ marginBottom: 8 }}>
            {language === 'zh' ? '尝试其他来源：' : language === 'en' ? 'Try another source:' : 'Essayez une autre source :'}
          </ThemedText>
          <View style={styles.emptySourceButtons}>
            <TouchableOpacity
              style={[styles.emptySourceButton, activeSource === 'korea' && styles.emptySourceButtonActive]}
              onPress={() => handleSourceChange('korea')}
            >
              <ThemedText style={{ fontSize: 16 }}>🇰🇷</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptySourceButton, activeSource === 'china' && styles.emptySourceButtonActive]}
              onPress={() => handleSourceChange('china')}
            >
              <ThemedText style={{ fontSize: 16 }}>🇨🇳</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptySourceButton, activeSource === 'dubai' && styles.emptySourceButtonActive]}
              onPress={() => handleSourceChange('dubai')}
            >
              <ThemedText style={{ fontSize: 16 }}>🇦🇪</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header - Dark */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: '#FFF' }]}
            placeholder={language === 'zh' ? '品牌、型号、年份...' : language === 'en' ? 'Make, Model, Year...' : 'Marque, Modèle, Année...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: AppTheme.orange }]}
            onPress={() => router.push('/filter-modal')}
          >
            <Ionicons name="options" size={18} color={AppTheme.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Source Filters */}
      <View style={[styles.sourceFilters, { backgroundColor: colorScheme === 'dark' ? '#111' : '#f5f5f5' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceFilterScroll}>
          {getSourceFilters(language).map((source) => (
            <TouchableOpacity
              key={source.id}
              style={[
                styles.sourceChip,
                {
                  backgroundColor: activeSource === source.id ? AppTheme.orange : (colorScheme === 'dark' ? '#222' : AppTheme.white),
                  borderColor: activeSource === source.id ? AppTheme.orange : (colorScheme === 'dark' ? '#333' : '#ddd'),
                }
              ]}
              onPress={() => handleSourceChange(source.id as 'all' | 'korea' | 'china' | 'dubai')}
            >
              {source.flag && <ThemedText style={{ marginRight: 4 }}>{source.flag}</ThemedText>}
              <ThemedText
                size="sm"
                style={{
                  color: activeSource === source.id ? AppTheme.white : colors.textPrimary,
                  fontWeight: activeSource === source.id ? '600' : '400',
                }}
              >
                {source.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Button */}
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colorScheme === 'dark' ? '#222' : '#fff', borderColor: colorScheme === 'dark' ? '#333' : '#ddd' }]}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={16} color={AppTheme.orange} />
        </TouchableOpacity>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'grid' && { backgroundColor: AppTheme.orange }]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid" size={16} color={viewMode === 'grid' ? AppTheme.white : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'list' && { backgroundColor: AppTheme.orange }]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? AppTheme.white : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterChips, { backgroundColor: colors.background }]}>
        {getFilterChips(language).map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={[
              styles.chip,
              {
                backgroundColor: activeFilters.includes(chip.id) ? AppTheme.orange : (colorScheme === 'dark' ? '#1a1a1a' : colors.surface),
                borderColor: activeFilters.includes(chip.id) ? AppTheme.orange : (colorScheme === 'dark' ? '#333' : colors.border),
              }
            ]}
            onPress={() => toggleFilter(chip.id)}
          >
            {chip.icon && (
              <Ionicons
                name={chip.icon as any}
                size={14}
                color={activeFilters.includes(chip.id) ? AppTheme.white : colors.textPrimary}
                style={{ marginRight: 4 }}
              />
            )}
            <ThemedText
              size="xs"
              style={{
                color: activeFilters.includes(chip.id) ? AppTheme.white : colors.textPrimary,
                fontWeight: '500',
              }}
            >
              {chip.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={AppTheme.orange} />
        </View>
      ) : (
        <>
          {/* Loading overlay when fetching new page */}
          {isFetching && !isLoading && (
            <View style={styles.fetchingOverlay}>
              <ActivityIndicator size="small" color={AppTheme.orange} />
              <ThemedText style={styles.fetchingText}>{t('common.loading', language)}</ThemedText>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            key={viewMode}
            data={vehicles}
            renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
            keyExtractor={keyExtractor}
            numColumns={viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.list}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={ListEmpty}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={refetch}
                tintColor={AppTheme.orange}
                colors={[AppTheme.orange]}
              />
            }
          />
        </>
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={styles.sortModalOverlay}
          onPress={() => setShowSortModal(false)}
        >
          <View style={[styles.sortModalContent, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff' }]}>
            <View style={styles.sortModalHeader}>
              <ThemedText variant="title" size="lg">{language === 'zh' ? '排序' : language === 'en' ? 'Sort by' : 'Trier par'}</ThemedText>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {getSortOptions(language).map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  sortBy === option.id && { backgroundColor: AppTheme.orange + '15' }
                ]}
                onPress={() => {
                  setSortBy(option.id);
                  setShowSortModal(false);
                }}
              >
                <ThemedText style={[
                  styles.sortOptionText,
                  sortBy === option.id && { color: AppTheme.orange, fontWeight: '600' }
                ]}>
                  {option.label}
                </ThemedText>
                {sortBy === option.id && (
                  <Ionicons name="checkmark" size={20} color={AppTheme.orange} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  listHeader: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  sourceFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
  },
  sourceFilterScroll: {
    paddingLeft: 16,
    gap: 8,
    flexGrow: 1,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // Pagination styles
  paginationContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: AppTheme.orange,
    backgroundColor: 'transparent',
  },
  pageButtonActive: {
    backgroundColor: AppTheme.orange,
    borderColor: AppTheme.orange,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppTheme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AppTheme.orange,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.orange,
  },
  pageButtonTextActive: {
    color: '#fff',
  },
  ellipsis: {
    paddingHorizontal: 4,
    color: AppTheme.orange,
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 13,
    color: AppTheme.orange,
    opacity: 0.7,
  },
  fetchingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
    gap: 8,
  },
  fetchingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  // Empty state styles
  emptyRoadContainer: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  emptyRoad: {
    position: 'absolute',
    bottom: 10,
    width: '80%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  emptyRoadLine: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#555',
    marginTop: -1,
  },
  emptyCarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  emptyCarBody: {
    zIndex: 2,
  },
  emptyWheel: {
    position: 'absolute',
    bottom: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#555',
  },
  emptyWheelLeft: {
    left: 4,
  },
  emptyWheelRight: {
    right: 4,
  },
  emptyWheelInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#777',
    position: 'absolute',
    top: 2,
    left: 2,
  },
  emptyDust: {
    position: 'absolute',
    left: '30%',
    bottom: 12,
    width: 30,
    height: 10,
    backgroundColor: 'rgba(150,150,150,0.3)',
    borderRadius: 5,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.orange,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 24,
    gap: 8,
    shadowColor: AppTheme.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyResetButtonText: {
    color: AppTheme.white,
    fontWeight: '700',
    fontSize: 16,
  },
  emptySourceHints: {
    marginTop: 32,
    alignItems: 'center',
  },
  emptySourceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptySourceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptySourceButtonActive: {
    backgroundColor: AppTheme.orange,
    borderColor: AppTheme.orange,
  },
  // Search input styles
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginRight: 4,
  },
  // Sort button and modal styles
  sortButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: 8,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sortModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sortOptionText: {
    fontSize: 15,
  },
  // List subheader styles
  listSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortIndicatorText: {
    fontSize: 13,
    color: AppTheme.orange,
  },
  filterCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.orange + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterCountText: {
    fontSize: 12,
    color: AppTheme.orange,
    fontWeight: '500',
  },
  clearFiltersBtn: {
    padding: 2,
  },
});
