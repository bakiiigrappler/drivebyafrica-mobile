import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useCurrency } from '@/hooks/useCurrency';
import { Colors, AppTheme, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, SOURCE_FLAGS } from '@/constants';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderTimeline } from '@/components/orders';
import { useOrder, useOrderTracking } from '@/hooks';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { formatPrice, formatLocal, currency } = useCurrency();
  const { data: order, isLoading: orderLoading, error: orderError } = useOrder(id);
  const { data: tracking, isLoading: trackingLoading } = useOrderTracking(id);

  if (orderLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppTheme.orange} />
      </ThemedView>
    );
  }

  if (orderError || !order) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <ThemedText variant="title" size="lg" style={{ marginTop: 16 }}>
          Commande non trouvée
        </ThemedText>
        <Button
          title="Retour"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 24 }}
        />
      </ThemedView>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status] || AppTheme.orange;
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const flag = order.vehicle_source ? SOURCE_FLAGS[order.vehicle_source] : '';
  const vehicleImage = order.vehicle?.images?.[0] || null;
  const vehicleTitle = `${order.vehicle_make || order.vehicle?.make || ''} ${order.vehicle_model || order.vehicle?.model || ''}`.trim();
  const vehicleYear = order.vehicle_year || order.vehicle?.year;

  // Parse documents
  const docs = Array.isArray(order.uploaded_documents)
    ? order.uploaded_documents
    : [];

  const handleTrackingPress = () => {
    if (order.tracking_url) {
      Linking.openURL(order.tracking_url);
    }
  };

  const handleWhatsAppSupport = () => {
    const msg = `Bonjour, j'ai une question concernant ma commande #${order.order_number || order.id.slice(0, 8)}`;
    Linking.openURL(`https://wa.me/237691398440?text=${encodeURIComponent(msg)}`);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText size="sm" style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Commande #{order.order_number || order.id.slice(0, 8)}
          </ThemedText>
          <ThemedText size="xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}
          </ThemedText>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: statusColor + '30' }]}>
          <View style={[styles.headerBadgeDot, { backgroundColor: statusColor }]} />
          <ThemedText size="xs" style={{ color: statusColor, fontWeight: '600' }}>
            {statusLabel}
          </ThemedText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Vehicle Info with Image */}
        <Card style={styles.vehicleCard}>
          <View style={styles.vehicleRow}>
            <View style={[styles.vehicleImageContainer, { backgroundColor: colors.surface }]}>
              {vehicleImage ? (
                <Image
                  source={{ uri: vehicleImage }}
                  style={styles.vehicleImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Ionicons name="car-outline" size={36} color={colors.textMuted} />
              )}
            </View>
            <View style={styles.vehicleInfo}>
              <ThemedText variant="subtitle" size="base" numberOfLines={2}>
                {flag} {vehicleTitle}
              </ThemedText>
              {vehicleYear ? (
                <ThemedText variant="muted" size="sm">{vehicleYear}</ThemedText>
              ) : null}
              {order.vehicle_source && (
                <View style={styles.sourceTag}>
                  <ThemedText variant="muted" size="xs">
                    {SOURCE_FLAGS[order.vehicle_source]} {order.vehicle_source.charAt(0).toUpperCase() + order.vehicle_source.slice(1)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Order Timeline - Progress Bar + History */}
        <Card style={styles.timelineCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-branch-outline" size={18} color={AppTheme.orange} />
            <ThemedText variant="subtitle" size="base" style={{ marginLeft: 8 }}>
              Suivi de commande
            </ThemedText>
          </View>

          {trackingLoading ? (
            <ActivityIndicator color={AppTheme.orange} style={{ paddingVertical: 20 }} />
          ) : (
            <OrderTimeline
              tracking={tracking || order.tracking || []}
              currentStatus={order.status}
              documents={docs}
            />
          )}
        </Card>

        {/* Price Breakdown */}
        <Card style={styles.priceCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={18} color={AppTheme.orange} />
            <ThemedText variant="subtitle" size="base" style={{ marginLeft: 8 }}>
              Récapitulatif des prix
            </ThemedText>
          </View>

          {order.vehicle_price_usd != null && (
            <View style={styles.priceRow}>
              <ThemedText variant="muted" size="sm">Prix du véhicule</ThemedText>
              <ThemedText size="sm">{formatPrice(order.vehicle_price_usd)}</ThemedText>
            </View>
          )}

          {order.shipping_price_usd != null && (
            <View style={styles.priceRow}>
              <ThemedText variant="muted" size="sm">Livraison</ThemedText>
              <ThemedText size="sm">{formatPrice(order.shipping_price_usd)}</ThemedText>
            </View>
          )}

          {order.insurance_price_usd != null && (
            <View style={styles.priceRow}>
              <ThemedText variant="muted" size="sm">Assurance</ThemedText>
              <ThemedText size="sm">{formatPrice(order.insurance_price_usd)}</ThemedText>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {order.total_price_usd != null && (
            <View style={styles.priceRow}>
              <ThemedText variant="subtitle" size="sm">Total</ThemedText>
              <ThemedText variant="title" size="base" style={{ color: AppTheme.orange }}>
                {formatPrice(order.total_price_usd)}
              </ThemedText>
            </View>
          )}

          {/* Deposit info */}
          {order.deposit_amount_usd != null && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.priceRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                  <ThemedText variant="muted" size="sm">Acompte versé</ThemedText>
                </View>
                <ThemedText size="sm" style={{ color: '#22C55E' }}>
                  {formatPrice(order.deposit_amount_usd)}
                </ThemedText>
              </View>
              {order.balance_amount_xaf != null && order.total_price_usd != null && order.deposit_amount_usd != null && (
                <View style={styles.priceRow}>
                  <ThemedText variant="muted" size="sm">Solde restant</ThemedText>
                  <ThemedText size="sm" style={{ color: AppTheme.orange }}>
                    {formatPrice(order.total_price_usd - order.deposit_amount_usd)}
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </Card>

        {/* Shipping Details */}
        <Card style={styles.shippingCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="boat-outline" size={18} color={AppTheme.orange} />
            <ThemedText variant="subtitle" size="base" style={{ marginLeft: 8 }}>
              Détails de livraison
            </ThemedText>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <View style={styles.infoText}>
                <ThemedText variant="muted" size="xs">Destination</ThemedText>
                <ThemedText size="sm">
                  {order.destination_name || order.destination_port || order.destination_city || order.destination_country || 'Non spécifiée'}
                </ThemedText>
              </View>
            </View>

            {order.shipping_type && (
              <View style={styles.infoItem}>
                <Ionicons name="cube-outline" size={18} color={colors.textMuted} />
                <View style={styles.infoText}>
                  <ThemedText variant="muted" size="xs">Type d'expédition</ThemedText>
                  <ThemedText size="sm">
                    {order.shipping_type === 'container' ? 'Conteneur' : order.shipping_type === 'groupage' ? 'Groupage (RoRo)' : order.shipping_type}
                  </ThemedText>
                </View>
              </View>
            )}

            {order.shipping_eta && (
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                <View style={styles.infoText}>
                  <ThemedText variant="muted" size="xs">Arrivée estimée</ThemedText>
                  <ThemedText size="sm">
                    {format(new Date(order.shipping_eta), 'dd MMMM yyyy', { locale: fr })}
                  </ThemedText>
                </View>
              </View>
            )}

            {order.tracking_number && (
              <View style={styles.infoItem}>
                <Ionicons name="barcode-outline" size={18} color={colors.textMuted} />
                <View style={styles.infoText}>
                  <ThemedText variant="muted" size="xs">Numéro de suivi</ThemedText>
                  <ThemedText size="sm">{order.tracking_number}</ThemedText>
                </View>
              </View>
            )}
          </View>

          {order.tracking_url && (
            <TouchableOpacity
              style={[styles.trackingButton, { borderColor: AppTheme.orange }]}
              onPress={handleTrackingPress}
            >
              <Ionicons name="open-outline" size={16} color={AppTheme.orange} />
              <ThemedText size="sm" style={{ color: AppTheme.orange, marginLeft: 8, fontWeight: '600' }}>
                Suivre ma livraison
              </ThemedText>
            </TouchableOpacity>
          )}
        </Card>

        {/* Customer Notes */}
        {order.customer_notes && (
          <Card style={styles.notesCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-outline" size={18} color={AppTheme.orange} />
              <ThemedText variant="subtitle" size="base" style={{ marginLeft: 8 }}>
                Notes
              </ThemedText>
            </View>
            <ThemedText variant="muted" size="sm">{order.customer_notes}</ThemedText>
          </Card>
        )}

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <ThemedText variant="muted" size="sm" style={{ textAlign: 'center', marginBottom: 12 }}>
            Besoin d'aide avec votre commande ?
          </ThemedText>
          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#25D366' }]}
            onPress={handleWhatsAppSupport}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <ThemedText size="sm" style={{ color: '#FFFFFF', marginLeft: 8, fontWeight: '600' }}>
              Contacter le support
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  headerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vehicleCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 14,
  },
  vehicleImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  vehicleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sourceTag: {
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  priceCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  shippingCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  notesCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  supportSection: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
