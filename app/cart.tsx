import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useCartStore, useAuthStore, useSettingsStore } from '@/store';
import { useCurrency } from '@/hooks';
import { t } from '@/lib/i18n';
import { showGlobalSnackbar } from '@/contexts/SnackbarContext';
import { PLACEHOLDER_IMAGE } from '@/lib/images';
import {
  DEFAULT_DESTINATIONS,
  calculateMultiVehicleImportCosts,
  DEPOSIT_PER_VEHICLE_USD,
  INSPECTION_FEE_USD,
  INSURANCE_RATE,
  XAF_RATE,
  formatFCFA,
  formatUSD,
  generateQuoteNumber,
} from '@/lib/pricing';
import { supabase } from '@/lib/supabase';
import { useInvalidateQuotes } from '@/hooks/useQuotes';
import type { CartItem } from '@/store/cartStore';

const SOURCE_FLAGS: Record<string, string> = {
  korea: '\u{1F1F0}\u{1F1F7}',
  china: '\u{1F1E8}\u{1F1F3}',
  dubai: '\u{1F1E6}\u{1F1EA}',
};

const SOURCE_LABELS: Record<string, Record<string, string>> = {
  korea: { fr: 'Corée', en: 'Korea', zh: '韩国' },
  china: { fr: 'Chine', en: 'China', zh: '中国' },
  dubai: { fr: 'Dubaï', en: 'Dubai', zh: '迪拜' },
};

export default function CartScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { user } = useAuthStore();
  const { formatPrice } = useCurrency();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const { invalidateLists: invalidateQuotesCache } = useInvalidateQuotes();
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vehicleSource = items.length > 0 ? items[0].vehicleSource : null;

  const selectedDestination = useMemo(
    () => DEFAULT_DESTINATIONS.find((d) => d.id === selectedDestinationId) || null,
    [selectedDestinationId]
  );

  const shippingCost40ftUSD = useMemo(() => {
    if (!selectedDestination || !vehicleSource) return 0;
    return selectedDestination.shippingCost40ft[vehicleSource] || 0;
  }, [selectedDestination, vehicleSource]);

  const costs = useMemo(() => {
    if (items.length < 2 || !shippingCost40ftUSD) return null;
    return calculateMultiVehicleImportCosts({
      vehicles: items.map((i) => ({ vehiclePriceUSD: i.vehiclePriceUSD })),
      shippingCost40ftUSD,
    });
  }, [items, shippingCost40ftUSD]);

  const handleRemoveItem = (vehicleId: string) => {
    removeItem(vehicleId);
    showGlobalSnackbar({ message: t('cart.vehicleRemoved', language), type: 'success' });
  };

  const handleClearCart = () => {
    Alert.alert(
      t('cart.clearCart', language),
      t('cart.clearCartConfirm', language),
      [
        { text: t('common.cancel', language), style: 'cancel' },
        {
          text: t('cart.clearCart', language),
          style: 'destructive',
          onPress: () => {
            clearCart();
            showGlobalSnackbar({ message: t('cart.cartCleared', language), type: 'success' });
          },
        },
      ]
    );
  };

  const handleRequestQuote = async () => {
    if (!user) {
      showGlobalSnackbar({ message: t('auth.loginRequired', language), type: 'warning' });
      router.push('/(auth)/login');
      return;
    }
    if (!costs || !selectedDestination || !vehicleSource) return;

    setIsSubmitting(true);
    try {
      // Fetch current XAF rate
      let xafRate = XAF_RATE;
      try {
        const { data: rateData } = await supabase
          .from('currency_rates')
          .select('rate_to_usd')
          .eq('currency_code', 'XAF')
          .eq('is_active', true)
          .single();
        if (rateData?.rate_to_usd) xafRate = Number(rateData.rate_to_usd);
      } catch {
        // Use default rate
      }

      const quoteNumberBase = generateQuoteNumber();
      // Generate a UUID v4 for group_id
      const groupId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      const vehicleCount = items.length;
      const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const shippingPerVehicleUSD = shippingCost40ftUSD / vehicleCount;

      const quotesToInsert = items.map((item, index) => {
        const insuranceCostUSD = (item.vehiclePriceUSD + shippingPerVehicleUSD) * INSURANCE_RATE;
        const totalCostUSD = item.vehiclePriceUSD + shippingPerVehicleUSD + insuranceCostUSD + INSPECTION_FEE_USD;

        return {
          quote_number: `${quoteNumberBase}-${index + 1}`,
          user_id: user.id,
          vehicle_id: item.vehicleId,
          vehicle_make: item.vehicleMake,
          vehicle_model: item.vehicleModel,
          vehicle_year: item.vehicleYear,
          vehicle_price_usd: Math.round(item.vehiclePriceUSD),
          vehicle_source: item.vehicleSource,
          destination_id: selectedDestination.id,
          destination_name: selectedDestination.name,
          destination_country: selectedDestination.country,
          shipping_type: 'container',
          shipping_cost_xaf: Math.round(shippingPerVehicleUSD * xafRate),
          insurance_cost_xaf: Math.round(insuranceCostUSD * xafRate),
          inspection_fee_xaf: Math.round(INSPECTION_FEE_USD * xafRate),
          total_cost_xaf: Math.round(totalCostUSD * xafRate),
          status: 'pending',
          valid_until: validUntil,
          group_id: groupId,
          group_vehicle_count: vehicleCount,
          container_type: '40ft',
        };
      });

      const { error } = await supabase.from('quotes').insert(quotesToInsert);

      if (error) {
        console.error('Multi-quote creation error:', error);
        showGlobalSnackbar({ message: t('common.error', language), type: 'error' });
        return;
      }

      clearCart();
      await invalidateQuotesCache();
      showGlobalSnackbar({ message: t('cart.quoteCreated', language), type: 'success' });
      router.replace('/(tabs)/quotes');
    } catch (err) {
      console.error('Quote request error:', err);
      showGlobalSnackbar({ message: t('common.error', language), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Empty State ──
  if (items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: AppTheme.orange + '15' }]}>
            <Ionicons name="cube-outline" size={48} color={AppTheme.orange} />
          </View>
          <ThemedText variant="title" size="lg" style={styles.emptyTitle}>
            {t('cart.empty', language)}
          </ThemedText>
          <ThemedText variant="muted" style={styles.emptyDesc}>
            {t('cart.emptyDesc', language)}
          </ThemedText>
          <TouchableOpacity
            style={[styles.browseBtn, { borderColor: AppTheme.orange }]}
            onPress={() => router.push('/(tabs)/live')}
          >
            <Ionicons name="car-sport-outline" size={18} color={AppTheme.orange} />
            <ThemedText style={{ color: AppTheme.orange, fontWeight: '600', marginLeft: 8 }}>
              {t('cart.browseVehicles', language)}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const sourceLabel = vehicleSource ? (SOURCE_LABELS[vehicleSource]?.[language] || vehicleSource) : '';
  const sourceFlag = vehicleSource ? (SOURCE_FLAGS[vehicleSource] || '') : '';

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* Source Badge */}
        <View style={styles.sourceBanner}>
          <ThemedText style={styles.sourceBannerText}>
            {sourceFlag} {t('cart.title', language)} - {sourceLabel}
          </ThemedText>
          <ThemedText variant="muted" size="xs">
            {items.length}/3 {t('cart.items', language)}
          </ThemedText>
        </View>

        {/* Warning if < 2 items */}
        {items.length < 2 && (
          <View style={[styles.warningBanner, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle" size={20} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText style={{ color: '#92400E', fontWeight: '600', fontSize: 13 }}>
                {t('cart.addMinTwo', language)}
              </ThemedText>
              <ThemedText style={{ color: '#92400E', fontSize: 12, marginTop: 2 }}>
                {t('cart.addMinTwoDesc', language)}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Vehicle List */}
        <View style={styles.section}>
          {items.map((item, index) => (
            <CartItemCard
              key={item.vehicleId}
              item={item}
              index={index}
              colors={colors}
              language={language}
              formatPrice={formatPrice}
              onRemove={() => handleRemoveItem(item.vehicleId)}
            />
          ))}
        </View>

        {/* Add More Button */}
        {items.length < 3 && (
          <TouchableOpacity
            style={[styles.addMoreBtn, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]}
            onPress={() => router.push('/(tabs)/live')}
          >
            <Ionicons name="add-circle-outline" size={22} color={AppTheme.orange} />
            <ThemedText style={{ color: AppTheme.orange, fontWeight: '600', marginLeft: 8 }}>
              {t('cart.addToCart', language)} ({3 - items.length} {language === 'zh' ? '剩余' : language === 'en' ? 'remaining' : 'restant(s)'})
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Destination Picker */}
        <View style={styles.section}>
          <ThemedText variant="title" size="base" style={styles.sectionTitle}>
            {t('cart.destination', language)}
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destScroll}>
            {DEFAULT_DESTINATIONS.map((dest) => {
              const isActive = selectedDestinationId === dest.id;
              return (
                <TouchableOpacity
                  key={dest.id}
                  style={[
                    styles.destChip,
                    {
                      backgroundColor: isActive ? AppTheme.orange : colors.cardBg,
                      borderColor: isActive ? AppTheme.orange : colors.cardBorder,
                    },
                  ]}
                  onPress={() => setSelectedDestinationId(dest.id)}
                >
                  <ThemedText style={{ fontSize: 16, marginRight: 4 }}>{dest.flag}</ThemedText>
                  <View>
                    <ThemedText
                      size="sm"
                      style={{
                        color: isActive ? '#FFF' : colors.textPrimary,
                        fontWeight: isActive ? '700' : '500',
                      }}
                    >
                      {dest.name}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.7)' : colors.textMuted }}>
                      {dest.country}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Cost Breakdown */}
        {costs && selectedDestination && (
          <View style={[styles.costCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="base" style={styles.sectionTitle}>
              {t('cart.costEstimate', language)}
            </ThemedText>

            {/* Per-vehicle prices */}
            {costs.perVehicle.map((pv, i) => (
              <View key={i} style={styles.costRow}>
                <ThemedText variant="muted" size="sm">
                  {items[i].vehicleMake} {items[i].vehicleModel}
                </ThemedText>
                <ThemedText size="sm">{formatUSD(pv.vehiclePriceUSD)}</ThemedText>
              </View>
            ))}

            <View style={[styles.divider, { borderBottomColor: colors.cardBorder }]} />

            {/* Shipping */}
            <View style={styles.costRow}>
              <ThemedText variant="muted" size="sm">
                {t('cart.shipping40ft', language)} → {selectedDestination.name}
              </ThemedText>
              <ThemedText size="sm">{formatUSD(costs.shippingCost40ftUSD)}</ThemedText>
            </View>

            {/* Insurance */}
            <View style={styles.costRow}>
              <ThemedText variant="muted" size="sm">{t('cart.insurance', language)}</ThemedText>
              <ThemedText size="sm">{formatFCFA(costs.insuranceCostXAF)}</ThemedText>
            </View>

            {/* Inspection */}
            <View style={styles.costRow}>
              <ThemedText variant="muted" size="sm">
                {t('cart.inspection', language)} ({INSPECTION_FEE_USD}$ x {costs.vehicleCount})
              </ThemedText>
              <ThemedText size="sm">{formatFCFA(costs.inspectionFeeTotalXAF)}</ThemedText>
            </View>

            <View style={[styles.divider, { borderBottomColor: colors.cardBorder }]} />

            {/* Total */}
            <View style={styles.costRow}>
              <ThemedText variant="title" size="base">{t('cart.totalEstimate', language)}</ThemedText>
              <ThemedText style={styles.totalPrice}>{formatFCFA(costs.totalXAF)}</ThemedText>
            </View>
            <View style={styles.costRow}>
              <ThemedText variant="muted" size="xs">{''}</ThemedText>
              <ThemedText variant="muted" size="xs">~ {formatUSD(costs.totalUSD)}</ThemedText>
            </View>

            <View style={[styles.divider, { borderBottomColor: colors.cardBorder }]} />

            {/* Deposit */}
            <View style={[styles.depositRow, { backgroundColor: '#ECFDF5' }]}>
              <View>
                <ThemedText style={{ color: '#065F46', fontWeight: '700', fontSize: 14 }}>
                  {t('cart.deposit', language)}
                </ThemedText>
                <ThemedText style={{ color: '#065F46', fontSize: 11 }}>
                  {DEPOSIT_PER_VEHICLE_USD}$ {t('cart.perVehicle', language)} x {costs.vehicleCount}
                </ThemedText>
              </View>
              <ThemedText style={{ color: '#065F46', fontWeight: '800', fontSize: 16 }}>
                {formatUSD(costs.depositTotalUSD)}
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder, paddingBottom: insets.bottom + 8 }]}>
        {items.length >= 2 && selectedDestination && costs ? (
          <TouchableOpacity
            style={[styles.quoteBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleRequestQuote}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color="#FFF" />
                <ThemedText style={styles.quoteBtnText}>{t('cart.requestQuote', language)}</ThemedText>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.quoteBtn, { opacity: 0.4 }]}
            disabled
          >
            <Ionicons name="document-text-outline" size={20} color="#FFF" />
            <ThemedText style={styles.quoteBtnText}>
              {items.length < 2 ? t('cart.addMinTwo', language) : t('cart.selectDestination', language)}
            </ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearCart}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

// ── Cart Item Card ──
function CartItemCard({
  item,
  index,
  colors,
  language,
  formatPrice,
  onRemove,
}: {
  item: CartItem;
  index: number;
  colors: any;
  language: string;
  formatPrice: (usd: number) => string;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={styles.itemIndex}>
        <ThemedText style={styles.itemIndexText}>{index + 1}</ThemedText>
      </View>
      <Image
        source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE }}
        style={styles.itemImage}
        contentFit="cover"
      />
      <View style={styles.itemInfo}>
        <ThemedText variant="subtitle" size="sm" numberOfLines={1}>
          {item.vehicleYear} {item.vehicleMake} {item.vehicleModel}
        </ThemedText>
        <ThemedText style={{ color: AppTheme.orange, fontWeight: '700', fontSize: 14 }}>
          {formatPrice(item.vehiclePriceUSD)}
        </ThemedText>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
        <Ionicons name="close-circle" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { textAlign: 'center', marginBottom: 8 },
  emptyDesc: { textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  browseBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },

  // Source banner
  sourceBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginTop: 4 },
  sourceBannerText: { fontSize: 16, fontWeight: '700' },

  // Warning
  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, padding: 12, borderRadius: 10, marginBottom: 8 },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { marginBottom: 12 },

  // Item card
  itemCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  itemIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: AppTheme.orange, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  itemIndexText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  itemImage: { width: 72, height: 52, borderRadius: 8, marginRight: 10 },
  itemInfo: { flex: 1, marginRight: 8 },
  removeBtn: { padding: 4 },

  // Add more
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginHorizontal: 16, marginBottom: 16 },

  // Destination
  destScroll: { paddingRight: 16, gap: 8 },
  destChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },

  // Cost card
  costCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  divider: { borderBottomWidth: 1, marginVertical: 8 },
  totalPrice: { color: AppTheme.orange, fontWeight: '800', fontSize: 18 },
  depositRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 4 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  quoteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: AppTheme.orange, paddingVertical: 16, borderRadius: 12, gap: 8 },
  quoteBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  clearBtn: { width: 52, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
});
