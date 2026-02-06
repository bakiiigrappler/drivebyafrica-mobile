import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useCurrency } from '@/hooks/useCurrency';
import { Colors, AppTheme, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, SOURCE_FLAGS } from '@/constants';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import type { OrderWithTracking } from '@/types';

interface OrderCardProps {
  order: OrderWithTracking;
}

export function OrderCard({ order }: OrderCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { formatPrice, formatLocal } = useCurrency();

  const handlePress = () => {
    router.push(`/order/${order.id}`);
  };

  const statusColor = ORDER_STATUS_COLORS[order.status] || colors.mandarin;
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const flag = order.vehicle_source ? SOURCE_FLAGS[order.vehicle_source] : '';
  const vehicleImage = order.vehicle?.images?.[0] || null;
  const vehicleTitle = `${order.vehicle_make || order.vehicle?.make || ''} ${order.vehicle_model || order.vehicle?.model || ''}`.trim();
  const vehicleYear = order.vehicle_year || order.vehicle?.year;

  const createdAt = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Card style={styles.card}>
        <View style={styles.row}>
          {/* Vehicle Image */}
          <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
            {vehicleImage ? (
              <Image
                source={{ uri: vehicleImage }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Ionicons name="car-outline" size={28} color={colors.textMuted} />
            )}
          </View>

          {/* Order Info */}
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="subtitle" size="sm" numberOfLines={1}>
                  {flag} {vehicleTitle || `Commande #${order.order_number || order.id.slice(0, 8)}`}
                </ThemedText>
                {vehicleYear ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <ThemedText variant="muted" size="xs" style={{ marginLeft: 4 }}>
                      {vehicleYear} - {createdAt}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <ThemedText variant="muted" size="xs" style={{ marginLeft: 4 }}>
                      {createdAt}
                    </ThemedText>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText size="xs" style={{ color: statusColor, fontWeight: '600' }}>
                {statusLabel}
              </ThemedText>
            </View>

            {/* Details Row */}
            <View style={styles.detailsRow}>
              {order.destination_country && (
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <ThemedText variant="muted" size="xs" style={{ marginLeft: 3 }}>
                    {order.destination_port || order.destination_city || order.destination_country}
                  </ThemedText>
                </View>
              )}
              {(order.total_price_usd || order.vehicle_price_usd) && (
                <ThemedText size="xs" style={{ color: AppTheme.orange, fontWeight: '600' }}>
                  {formatPrice(order.total_price_usd || order.vehicle_price_usd)}
                </ThemedText>
              )}
            </View>

            {/* Tracking Number */}
            {order.tracking_number && (
              <ThemedText variant="muted" size="xs" style={{ marginTop: 4 }}>
                Tracking: <ThemedText size="xs">{order.tracking_number}</ThemedText>
              </ThemedText>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
