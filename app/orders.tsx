import { View, StyleSheet, FlatList, TouchableOpacity, Animated, RefreshControl, ActivityIndicator } from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useOrders, useOrderStats, ORDER_STATUSES, getOrderStatus, OrderStatusFilter } from '@/hooks/useOrders';
import { useAuthStore } from '@/store';
import { useCurrency } from '@/hooks/useCurrency';
import { getFirstValidImage, PLACEHOLDER_IMAGE } from '@/lib/images';
import type { OrderWithTracking } from '@/types';

const STATUS_FILTERS: { key: OrderStatusFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'active', label: 'En cours' },
  { key: 'shipping', label: 'En transit' },
  { key: 'completed', label: 'Livrees' },
  { key: 'cancelled', label: 'Annulees' },
];

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/(auth)/login');
    }
  }, [isInitialized, user, router]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useOrders({ status: statusFilter, page: currentPage });

  const { data: stats } = useOrderStats();

  const orders = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Animation for empty state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (orders.length === 0 && !isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [orders.length, isLoading]);

  const { formatPrice } = useCurrency();

  const handleStatusChange = (status: OrderStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderOrderCard = useCallback(({ item: order }: { item: OrderWithTracking }) => {
    const statusInfo = getOrderStatus(order.status);
    const vehicleImage = order.vehicle ? getFirstValidImage(order.vehicle.images) : PLACEHOLDER_IMAGE;
    const vehicleName = order.vehicle
      ? `${order.vehicle.make} ${order.vehicle.model} ${order.vehicle.year}`
      : 'Vehicule';

    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        onPress={() => router.push(`/order/${order.id}`)}
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
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </ThemedText>
            </View>

            {/* Order Number */}
            {order.order_number && (
              <ThemedText variant="muted" size="xs" style={styles.orderNumber}>
                #{order.order_number}
              </ThemedText>
            )}

            {/* Vehicle Name */}
            <ThemedText variant="subtitle" numberOfLines={1} style={styles.vehicleName}>
              {vehicleName}
            </ThemedText>

            {/* Destination */}
            <View style={styles.destinationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <ThemedText variant="muted" size="xs" numberOfLines={1}>
                {order.destination_port || order.destination_city || order.destination_country}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Progress Bar (simplified) */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: statusInfo.color,
                  width: `${Math.min(100, (statusInfo.step / 13) * 100)}%`,
                },
              ]}
            />
          </View>
          <ThemedText variant="muted" size="xs">
            Etape {statusInfo.step}/13
          </ThemedText>
        </View>

        {/* Bottom Row: Price + Date */}
        <View style={styles.cardBottomRow}>
          <View>
            <ThemedText style={styles.price}>
              {formatPrice(order.total_price_usd || order.vehicle_price_usd)}
            </ThemedText>
            <ThemedText variant="muted" size="xs">
              Cree le {formatDate(order.created_at)}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.detailsButton, { backgroundColor: AppTheme.orange }]}
            onPress={() => router.push(`/order/${order.id}`)}
          >
            <ThemedText style={styles.detailsButtonText}>Voir details</ThemedText>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [colors, router, formatPrice]);

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="lg">{stats.active}</ThemedText>
            <ThemedText variant="muted" size="xs">En cours</ThemedText>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="lg">{stats.inTransit}</ThemedText>
            <ThemedText variant="muted" size="xs">En transit</ThemedText>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="lg">{stats.completed}</ThemedText>
            <ThemedText variant="muted" size="xs">Livrees</ThemedText>
          </View>
        </View>
      )}

      <ThemedText variant="muted" size="sm" style={styles.totalCount}>
        {totalCount} commande{totalCount !== 1 ? 's' : ''} au total
      </ThemedText>
    </View>
  );

  const ListEmpty = () => {
    if (isLoading) return null;

    return (
      <Animated.View
        style={[
          styles.emptyState,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.emptyIconContainer, { backgroundColor: AppTheme.orange + '15' }]}>
          <Ionicons name="cart-outline" size={64} color={AppTheme.orange} />
        </View>
        <ThemedText variant="title" size="xl" style={styles.emptyTitle}>
          Aucune commande
        </ThemedText>
        <ThemedText variant="muted" style={styles.emptySubtitle}>
          Vous n'avez pas encore passe de commande.{'\n'}
          Explorez nos vehicules et passez votre premiere commande !
        </ThemedText>
        <TouchableOpacity
          style={[styles.exploreButton, { backgroundColor: AppTheme.orange }]}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="car-sport-outline" size={20} color="#fff" />
          <ThemedText style={styles.exploreButtonText}>
            Explorer les vehicules
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
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
      {/* Status Filters */}
      <View style={[styles.filtersContainer, { borderBottomColor: colors.cardBorder }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === item.key ? AppTheme.orange : colors.cardBg,
                  borderColor: statusFilter === item.key ? AppTheme.orange : colors.cardBorder,
                },
              ]}
              onPress={() => handleStatusChange(item.key)}
            >
              <ThemedText
                size="sm"
                style={{
                  color: statusFilter === item.key ? '#fff' : colors.textPrimary,
                  fontWeight: statusFilter === item.key ? '600' : '400',
                }}
              >
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          )}
        />
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
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderCard}
            ListHeaderComponent={orders.length > 0 ? ListHeader : null}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={orders.length === 0 ? styles.emptyListContent : styles.listContent}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyListContent: {
    flex: 1,
  },
  listHeader: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalCount: {
    marginTop: 4,
  },
  orderCard: {
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
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
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
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderNumber: {
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  vehicleName: {
    fontWeight: '700',
    marginBottom: 2,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.orange,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
