import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useBatches, BatchSourceFilter, BatchSortBy } from '@/hooks/useBatches';
import { useAuthStore, useSettingsStore } from '@/store';
import { t } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { getFirstValidImage, PLACEHOLDER_IMAGE } from '@/lib/images';
import { BatchOrderModal } from '@/components/batches/BatchOrderModal';
import type { VehicleBatch } from '@/types';


const getSourceFilters = (lang: string) => [
  { id: 'all' as const, label: lang === 'zh' ? '全部' : lang === 'en' ? 'All' : 'Tous', flag: null },
  { id: 'korea' as const, label: lang === 'zh' ? '韩国' : lang === 'en' ? 'Korea' : 'Corée', flag: '🇰🇷' },
  { id: 'china' as const, label: lang === 'zh' ? '中国' : lang === 'en' ? 'China' : 'Chine', flag: '🇨🇳' },
  { id: 'dubai' as const, label: lang === 'zh' ? '迪拜' : lang === 'en' ? 'Dubai' : 'Dubaï', flag: '🇦🇪' },
];

const getSortOptions = (lang: string) => [
  { value: 'newest' as const, label: lang === 'zh' ? '最新' : lang === 'en' ? 'Newest' : 'Plus récents' },
  { value: 'price_asc' as const, label: lang === 'zh' ? '价格从低到高' : lang === 'en' ? 'Price: Low to High' : 'Prix croissant' },
  { value: 'price_desc' as const, label: lang === 'zh' ? '价格从高到低' : lang === 'en' ? 'Price: High to Low' : 'Prix décroissant' },
  { value: 'year_desc' as const, label: lang === 'zh' ? '年份（最新）' : lang === 'en' ? 'Year (newest)' : 'Année (récent)' },
  { value: 'quantity_desc' as const, label: lang === 'zh' ? '数量' : lang === 'en' ? 'Quantity' : 'Quantité' },
];

export default function BatchesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const { language } = useSettingsStore();
  const { user } = useAuthStore();
  const { formatPrice } = useCurrency();

  const [activeSource, setActiveSource] = useState<BatchSourceFilter>('all');
  const [sortBy, setSortBy] = useState<BatchSortBy>('newest');
  const [currentPage, setCurrentPage] = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Order modal state
  const [selectedBatch, setSelectedBatch] = useState<VehicleBatch | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useBatches({
    page: currentPage,
    source: activeSource,
    sortBy,
  });

  const batches = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleSourceChange = (source: BatchSourceFilter) => {
    setActiveSource(source);
    setCurrentPage(0);
  };

  const handleSortChange = (sort: BatchSortBy) => {
    setSortBy(sort);
    setCurrentPage(0);
    setShowSortMenu(false);
  };

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleBatchPress = (batch: VehicleBatch) => {
    router.push(`/batch/${batch.id}`);
  };

  const handleOrderClick = (batch: VehicleBatch) => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    setSelectedBatch(batch);
    setIsOrderModalOpen(true);
  };

  const renderBatchCard = useCallback(({ item }: { item: VehicleBatch }) => {
    const sourceFlag = item.source_country === 'korea' ? '🇰🇷' : item.source_country === 'china' ? '🇨🇳' : '🇦🇪';
    const sourceLabel = item.source_country.toUpperCase();
    const imageUrl = item.thumbnail_url || getFirstValidImage(item.images);
    const isLowStock = item.available_quantity <= 10 && item.available_quantity > 0;

    return (
      <TouchableOpacity
        style={[styles.batchCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        activeOpacity={0.9}
        onPress={() => handleBatchPress(item)}
      >
        {/* Image */}
        <View style={styles.batchImageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.batchImage}
            contentFit="cover"
            placeholder={{ uri: PLACEHOLDER_IMAGE }}
          />

          {/* Source Badge */}
          <View style={styles.sourceBadge}>
            <ThemedText style={styles.sourceBadgeText}>{sourceFlag} {sourceLabel}</ThemedText>
          </View>

          {/* Low Stock Badge */}
          {isLowStock && (
            <View style={styles.lowStockBadge}>
              <ThemedText style={styles.lowStockText}>{t('batches.lowStock', language)}</ThemedText>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.batchContent}>
          <ThemedText style={[styles.batchTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </ThemedText>

          <ThemedText style={[styles.batchSubtitle, { color: colors.textMuted }]}>
            {item.year} • {item.make} {item.model}
          </ThemedText>

          {/* Pricing Grid */}
          <View style={[styles.pricingGrid, { backgroundColor: colors.surface }]}>
            <View style={styles.pricingItem}>
              <ThemedText style={[styles.pricingLabel, { color: colors.textMuted }]}>{t('batches.unitPrice', language)}</ThemedText>
              <ThemedText style={styles.pricingValue}>{formatPrice(item.price_per_unit_usd)}</ThemedText>
            </View>
            <View style={styles.pricingItem}>
              <ThemedText style={[styles.pricingLabel, { color: colors.textMuted }]}>{t('batches.availableQty', language)}</ThemedText>
              <ThemedText style={[styles.pricingValue, { color: '#22C55E' }]}>{item.available_quantity}</ThemedText>
            </View>
          </View>

          {/* Min Order Info */}
          <View style={[styles.minOrderRow, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.minOrderLabel, { color: colors.textMuted }]}>{t('batches.minOrder', language)}</ThemedText>
            <ThemedText style={[styles.minOrderValue, { color: colors.textPrimary }]}>
              {item.minimum_order_quantity} {t('batches.units', language)}
            </ThemedText>
          </View>

          {/* Order Button */}
          <TouchableOpacity style={styles.orderButton} onPress={() => handleOrderClick(item)}>
            <Ionicons name="calculator-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={styles.orderButtonText}>{t('quotes.estimateFees', language)}</ThemedText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [colors]);

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <ThemedText variant="title" size="lg">{t('batches.title', language)}</ThemedText>
      <ThemedText variant="muted" size="sm">({totalCount} {t('batches.available', language)})</ThemedText>
    </View>
  );

  const ListEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
        <ThemedText variant="title" size="lg" style={{ marginTop: 16 }}>
          {t('batches.noBatches', language)}
        </ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          {t('batches.noBatchesDesc', language)}
        </ThemedText>
      </View>
    );
  };

  const ListFooter = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0 || isFetching}
          >
            <Ionicons name="chevron-back" size={18} color={currentPage === 0 ? AppTheme.orange : '#fff'} />
          </TouchableOpacity>

          <ThemedText style={styles.pageInfo}>
            {currentPage + 1} / {totalPages}
          </ThemedText>

          <TouchableOpacity
            style={[styles.navButton, currentPage >= totalPages - 1 && styles.navButtonDisabled]}
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1 || isFetching}
          >
            <Ionicons name="chevron-forward" size={18} color={currentPage >= totalPages - 1 ? AppTheme.orange : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Source Filters */}
      <View style={[styles.sourceFilters, { backgroundColor: colorScheme === 'dark' ? '#111' : '#f5f5f5' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceFilterScroll}>
          {getSourceFilters(language).map((source) => (
            <TouchableOpacity
              key={source.id}
              style={[
                styles.sourceChip,
                {
                  backgroundColor: activeSource === source.id ? AppTheme.orange : (colorScheme === 'dark' ? '#222' : '#fff'),
                  borderColor: activeSource === source.id ? AppTheme.orange : (colorScheme === 'dark' ? '#333' : '#ddd'),
                }
              ]}
              onPress={() => handleSourceChange(source.id)}
            >
              {source.flag && <ThemedText style={{ marginRight: 4 }}>{source.flag}</ThemedText>}
              <ThemedText
                size="sm"
                style={{
                  color: activeSource === source.id ? '#fff' : colors.textPrimary,
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
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Sort Menu */}
      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {getSortOptions(language).map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.sortMenuItem, sortBy === option.value && { backgroundColor: AppTheme.orange + '20' }]}
              onPress={() => handleSortChange(option.value)}
            >
              <ThemedText style={[styles.sortMenuText, sortBy === option.value && { color: AppTheme.orange }]}>
                {option.label}
              </ThemedText>
              {sortBy === option.value && (
                <Ionicons name="checkmark" size={18} color={AppTheme.orange} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={AppTheme.orange} />
        </View>
      ) : (
        <>
          {isFetching && !isLoading && (
            <View style={styles.fetchingOverlay}>
              <ActivityIndicator size="small" color={AppTheme.orange} />
              <ThemedText style={styles.fetchingText}>{t('common.loading', language)}</ThemedText>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={batches}
            renderItem={renderBatchCard}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={styles.list}
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
      {/* Order Modal */}
      <BatchOrderModal
        visible={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedBatch(null);
        }}
        batch={selectedBatch}
        onSuccess={() => refetch()}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  sortMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortMenuText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listHeader: {
    marginBottom: 16,
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
  batchCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  batchImageContainer: {
    height: 180,
    position: 'relative',
  },
  batchImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: AppTheme.orange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lowStockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  batchContent: {
    padding: 16,
  },
  batchTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  batchSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  pricingGrid: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pricingItem: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  pricingValue: {
    fontSize: 18,
    fontWeight: '800',
    color: AppTheme.orange,
  },
  minOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  minOrderLabel: {
    fontSize: 12,
  },
  minOrderValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderButton: {
    flexDirection: 'row',
    backgroundColor: AppTheme.orange,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  paginationContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  pageInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.orange,
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
});
