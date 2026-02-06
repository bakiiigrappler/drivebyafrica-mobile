import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView, Alert, Animated, Easing, TextInput } from 'react-native';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useQuotes, useDeleteQuote } from '@/hooks/useQuotes';
import { useAuthStore, useSettingsStore } from '@/store';
import { t } from '@/lib/i18n';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { QuotePreviewModal, QuotePreviewData } from '@/components/quotes/QuotePreviewModal';
import { QuoteValidationModal } from '@/components/quotes/QuoteValidationModal';
import { XAF_RATE } from '@/lib/pricing';
import { getFirstValidImage, PLACEHOLDER_IMAGE } from '@/lib/images';
import type { Quote, QuoteStatus } from '@/types';

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Corée',
  china: 'Chine',
  dubai: 'Dubaï',
};

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: {
    label: 'En attente',
    color: '#EAB308',
    bg: 'rgba(234, 179, 8, 0.15)',
    icon: 'time-outline',
  },
  validated: {
    label: 'Validé',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
    icon: 'checkmark-done-outline',
  },
  accepted: {
    label: 'Accepté',
    color: '#22C55E',
    bg: 'rgba(34, 197, 94, 0.15)',
    icon: 'checkmark-circle-outline',
  },
  rejected: {
    label: 'Refusé',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    icon: 'close-circle-outline',
  },
  expired: {
    label: 'Expiré',
    color: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.15)',
    icon: 'alert-circle-outline',
  },
};

const STATUS_FILTERS = [
  { id: 'all' as const, label: 'Tous' },
  { id: 'pending' as const, label: 'En attente' },
  { id: 'validated' as const, label: 'Validés' },
  { id: 'accepted' as const, label: 'Acceptés' },
  { id: 'expired' as const, label: 'Expirés' },
];

export default function QuotesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isInitialized } = useAuthStore();
  const { language } = useSettingsStore();
  const { showSnackbar } = useSnackbar();
  const deleteQuoteMutation = useDeleteQuote();
  const flatListRef = useRef<FlatList>(null);

  const [activeStatus, setActiveStatus] = useState<QuoteStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [quoteToValidate, setQuoteToValidate] = useState<Quote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/(auth)/login');
    }
  }, [isInitialized, user, router]);

  // Fetch all quotes (for status counts)
  const { data: allQuotesData } = useQuotes({ status: 'all', page: 0 });
  const allQuotes = allQuotesData?.data || [];

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuotes({ status: activeStatus, page: currentPage });

  const quotes = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Helper function to check if a quote is expired
  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  // Compute status counts from all quotes
  const statusCounts = useMemo(() => {
    const counts: Record<QuoteStatus | 'all', number> = {
      all: allQuotes.length,
      pending: 0,
      validated: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    };
    allQuotes.forEach((q: Quote) => {
      // Check if pending quote is expired
      if (q.status === 'pending' && isExpired(q.valid_until)) {
        counts.expired++;
      } else if (counts[q.status] !== undefined) {
        counts[q.status]++;
      }
    });
    return counts;
  }, [allQuotes]);

  // Filter quotes by search query
  const filteredQuotes = useMemo(() => {
    if (!searchQuery.trim()) return quotes;
    const query = searchQuery.toLowerCase();
    return quotes.filter((q: Quote) =>
      q.quote_number.toLowerCase().includes(query) ||
      q.vehicle_make.toLowerCase().includes(query) ||
      q.vehicle_model.toLowerCase().includes(query)
    );
  }, [quotes, searchQuery]);

  const handleStatusChange = (status: QuoteStatus | 'all') => {
    setActiveStatus(status);
    setCurrentPage(0);
  };

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const formatCurrency = (amount: number) => {
    return Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteQuote = (quote: Quote) => {
    Alert.alert(
      'Supprimer le devis',
      `Êtes-vous sûr de vouloir supprimer le devis ${quote.quote_number} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuoteMutation.mutateAsync(quote.id);
              showSnackbar({ message: 'Devis supprimé avec succès', type: 'success' });
            } catch (error) {
              showSnackbar({ message: 'Erreur lors de la suppression', type: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/vehicle/${vehicleId}`);
  };

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowPreviewModal(true);
  };

  const handleValidateQuote = (quote: Quote) => {
    setQuoteToValidate(quote);
    setShowValidationModal(true);
  };

  // Check if quote can be validated (pending and not expired)
  const canValidate = (quote: Quote) => {
    return quote.status === 'pending' && !isExpired(quote.valid_until);
  };

  // Build QuotePreviewData from a Quote
  const buildPreviewData = (quote: Quote): QuotePreviewData => {
    return {
      quoteNumber: quote.quote_number,
      vehicle: {
        id: quote.vehicle_id,
        make: quote.vehicle_make,
        model: quote.vehicle_model,
        year: quote.vehicle_year,
        source: quote.vehicle_source,
        priceUsd: quote.vehicle_price_usd,
      },
      destination: {
        id: quote.destination_id,
        name: quote.destination_name,
        country: quote.destination_country,
        flag: SOURCE_FLAGS[quote.vehicle_source] || '🌍',
      },
      shippingType: quote.shipping_type || 'container',
      costs: {
        vehiclePriceXAF: quote.vehicle_price_usd * XAF_RATE,
        exportTaxXAF: 0, // Not stored in quote, would need to recalculate
        shippingCostXAF: quote.shipping_cost_xaf,
        insuranceCostXAF: quote.insurance_cost_xaf,
        inspectionFeeXAF: quote.inspection_fee_xaf,
        totalXAF: quote.total_cost_xaf,
        totalUSD: quote.total_cost_xaf / XAF_RATE,
      },
      validUntil: quote.valid_until,
      createdAt: quote.created_at,
      isExisting: true,
      status: quote.status,
    };
  };

  // Animation for empty state
  const carAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (quotes.length === 0 && !isLoading) {
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
  }, [quotes.length, isLoading]);

  const renderQuoteCard = useCallback(({ item: quote }: { item: Quote }) => {
    const status = STATUS_CONFIG[quote.status] || STATUS_CONFIG.pending;
    const expired = isExpired(quote.valid_until) && quote.status === 'pending';
    const canDelete = quote.status !== 'accepted';
    const vehicleImage = quote.vehicles ? getFirstValidImage(quote.vehicles.images) : PLACEHOLDER_IMAGE;

    return (
      <TouchableOpacity
        style={[styles.quoteCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        onPress={() => handleViewVehicle(quote.vehicle_id)}
        activeOpacity={0.7}
      >
        {/* Top Row: Image + Info */}
        <View style={styles.cardTopRow}>
          {/* Vehicle Image */}
          <View style={styles.cardImageContainer}>
            <Image
              source={{ uri: vehicleImage }}
              style={styles.cardImage}
              contentFit="cover"
              placeholder={{ uri: PLACEHOLDER_IMAGE }}
            />
            {/* Source Flag */}
            <View style={styles.sourceFlag}>
              <ThemedText style={{ fontSize: 12 }}>{SOURCE_FLAGS[quote.vehicle_source]}</ThemedText>
            </View>
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: expired ? STATUS_CONFIG.expired.bg : status.bg }]}>
              <Ionicons
                name={expired ? STATUS_CONFIG.expired.icon : status.icon}
                size={12}
                color={expired ? STATUS_CONFIG.expired.color : status.color}
              />
              <ThemedText style={[styles.statusText, { color: expired ? STATUS_CONFIG.expired.color : status.color }]}>
                {expired ? 'Expiré' : status.label}
              </ThemedText>
            </View>

            {/* Quote Number */}
            <ThemedText variant="muted" size="xs" style={styles.quoteNumber}>
              {quote.quote_number}
            </ThemedText>

            {/* Vehicle Title */}
            <ThemedText variant="subtitle" numberOfLines={1} style={styles.vehicleTitle}>
              {quote.vehicle_make} {quote.vehicle_model}
            </ThemedText>

            {/* Year & Source */}
            <ThemedText variant="muted" size="xs">
              {quote.vehicle_year} • {SOURCE_NAMES[quote.vehicle_source]}
            </ThemedText>

            {/* Destination */}
            <View style={styles.destinationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <ThemedText variant="muted" size="xs" numberOfLines={1}>
                {quote.destination_name}, {quote.destination_country}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom Row: Price + Date + Actions */}
        <View style={styles.cardBottomRow}>
          <View>
            <ThemedText style={styles.price}>
              {quote.total_cost_xaf > 0 ? formatCurrency(quote.total_cost_xaf) : 'À calculer'}
            </ThemedText>
            <ThemedText variant="muted" size="xs">
              Créé le {formatDate(quote.created_at)}
            </ThemedText>
          </View>

          <View style={styles.cardActions}>
            {/* Validate Quote (if pending and not expired) */}
            {canValidate(quote) && (
              <TouchableOpacity
                style={[styles.validateButton]}
                onPress={() => handleValidateQuote(quote)}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <ThemedText style={styles.validateButtonText}>Valider</ThemedText>
              </TouchableOpacity>
            )}

            {/* View Quote */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: AppTheme.orange + '15' }]}
              onPress={() => handleViewQuote(quote)}
            >
              <Ionicons name="document-text-outline" size={18} color={AppTheme.orange} />
            </TouchableOpacity>

            {/* View Vehicle */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => handleViewVehicle(quote.vehicle_id)}
            >
              <Ionicons name="car-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Delete (if allowed) */}
            {canDelete && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                onPress={() => handleDeleteQuote(quote)}
                disabled={deleteQuoteMutation.isPending}
              >
                {deleteQuoteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, deleteQuoteMutation.isPending]);

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.headerInfo}>
        <ThemedText variant="muted" size="sm">
          {searchQuery ? `${filteredQuotes.length} résultat(s)` : `${totalCount} devis au total`}
        </ThemedText>
      </View>
    </View>
  );

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (currentPage > 2) pages.push('...');
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1);
    }
    return pages;
  };

  const ListFooter = () => {
    if (totalPages <= 1) return null;

    const canGoNext = currentPage < totalPages - 1;

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationRow}>
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <TouchableOpacity
                key={index}
                style={[styles.pageButton, page === currentPage && styles.pageButtonActive]}
                onPress={() => goToPage(page)}
                disabled={isFetching}
              >
                <ThemedText style={[styles.pageButtonText, page === currentPage && styles.pageButtonTextActive]}>
                  {page + 1}
                </ThemedText>
              </TouchableOpacity>
            ) : (
              <ThemedText key={index} style={styles.ellipsis}>•••</ThemedText>
            )
          ))}
          <TouchableOpacity
            style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
            onPress={() => goToPage(currentPage + 1)}
            disabled={!canGoNext || isFetching}
          >
            <Ionicons name="chevron-forward" size={18} color={canGoNext ? '#fff' : AppTheme.orange} />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.pageInfo}>{currentPage + 1} / {totalPages}</ThemedText>
      </View>
    );
  };

  const ListEmpty = () => {
    if (isLoading) return null;

    // If searching and no results
    if (searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="search-outline" size={32} color={AppTheme.orange} />
          </View>
          <ThemedText variant="subtitle" style={styles.emptyTitle}>
            Aucun résultat
          </ThemedText>
          <ThemedText variant="muted" size="sm" style={styles.emptySubtitle}>
            Aucun devis ne correspond à "{searchQuery}".{'\n'}Essayez avec d'autres termes.
          </ThemedText>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.surface }]}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
            <ThemedText style={[styles.emptyButtonText, { color: colors.textPrimary }]}>Effacer la recherche</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    const carTranslateX = carAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-30, 30],
    });

    return (
      <View style={styles.emptyContainer}>
        {/* Animated Car */}
        <View style={styles.emptyRoadContainer}>
          <View style={styles.emptyRoad}>
            <View style={styles.emptyRoadLine} />
          </View>
          <Animated.View style={[styles.emptyCarContainer, { transform: [{ translateX: carTranslateX }] }]}>
            <Ionicons name="document-text-outline" size={48} color={AppTheme.orange} />
          </Animated.View>
        </View>

        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
          <Ionicons name="receipt-outline" size={32} color={AppTheme.orange} />
        </View>

        <ThemedText variant="subtitle" style={styles.emptyTitle}>
          {t('quotes.empty', language)}
        </ThemedText>
        <ThemedText variant="muted" size="sm" style={styles.emptySubtitle}>
          {t('quotes.emptyDesc', language)}
        </ThemedText>

        <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/live')}
          >
            <Ionicons name="car-sport" size={20} color={AppTheme.white} />
            <ThemedText style={styles.emptyButtonText}>{t('vehicles.title', language)}</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Show loading if not initialized
  if (!isInitialized || !user) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppTheme.orange} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header - Dark (includes search) */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
        <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>{t('quotes.title', language)}</ThemedText>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={[styles.searchInput, { color: '#FFF' }]}
              placeholder="Rechercher par N°, marque, modèle..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Status Filters with Counts */}
      <View style={[styles.statusFilters, { backgroundColor: colorScheme === 'dark' ? '#111' : '#f5f5f5' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilterScroll}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.statusChip,
                {
                  backgroundColor: activeStatus === filter.id ? AppTheme.orange : (colorScheme === 'dark' ? '#222' : '#fff'),
                  borderColor: activeStatus === filter.id ? AppTheme.orange : (colorScheme === 'dark' ? '#333' : '#ddd'),
                }
              ]}
              onPress={() => handleStatusChange(filter.id)}
            >
              <ThemedText
                size="sm"
                style={{
                  color: activeStatus === filter.id ? AppTheme.white : colors.textPrimary,
                  fontWeight: activeStatus === filter.id ? '600' : '400',
                }}
              >
                {filter.label} ({statusCounts[filter.id]})
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppTheme.orange} />
        </View>
      ) : (
        <>
          {isFetching && !isLoading && (
            <View style={styles.fetchingOverlay}>
              <ActivityIndicator size="small" color={AppTheme.orange} />
              <ThemedText style={styles.fetchingText}>Chargement...</ThemedText>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={filteredQuotes}
            renderItem={renderQuoteCard}
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

      {/* Info Card */}
      {quotes.length > 0 && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Ionicons name="information-circle" size={20} color={AppTheme.orange} />
          <ThemedText variant="muted" size="xs" style={styles.infoText}>
            Les devis sont valables 7 jours. Une fois validé, notre équipe vous contactera.
          </ThemedText>
        </View>
      )}

      {/* Quote Preview Modal */}
      <QuotePreviewModal
        visible={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedQuote(null);
        }}
        data={selectedQuote ? buildPreviewData(selectedQuote) : null}
      />

      {/* Quote Validation Modal */}
      <QuoteValidationModal
        visible={showValidationModal}
        onClose={() => {
          setShowValidationModal(false);
          setQuoteToValidate(null);
        }}
        quote={quoteToValidate}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginTop: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  statusFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceFlag: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quoteNumber: {
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  vehicleTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.orange,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Pagination
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
  },
  pageButtonActive: {
    backgroundColor: AppTheme.orange,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.orange,
  },
  pageButtonTextActive: {
    color: '#fff',
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
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
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
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
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
  emptyButtonText: {
    color: AppTheme.white,
    fontWeight: '700',
    fontSize: 16,
  },
  // Info card
  infoCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  infoText: {
    flex: 1,
  },
});
