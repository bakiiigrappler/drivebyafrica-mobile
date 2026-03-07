import { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';
import { QuotePreviewModal, QuotePreviewData } from '@/components/quotes/QuotePreviewModal';
import {
  ShippingDestination,
  DEFAULT_DESTINATIONS,
  SHIPPING_MULTIPLIERS,
  XAF_RATE,
  calculateImportCosts,
  formatFCFA,
  formatUSD,
  getExportTax,
} from '@/lib/pricing';
import { useSettingsStore } from '@/store';
import { t, type Language } from '@/lib/i18n';
import type { VehicleBatch } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type ShippingType = 'container' | 'groupage';

const getShippingTypes = (lang: Language) => [
  {
    id: 'container' as const,
    label: t('quotes.containerOnly', lang),
    description: t('quotes.containerDesc', lang),
    icon: 'cart-outline' as const,
  },
  {
    id: 'groupage' as const,
    label: t('quotes.groupage', lang),
    description: t('quotes.groupageDesc', lang),
    icon: 'grid-outline' as const,
  },
];

interface BatchOrderModalProps {
  visible: boolean;
  onClose: () => void;
  batch: VehicleBatch | null;
  onSuccess?: () => void;
}

export function BatchOrderModal({ visible, onClose, batch, onSuccess }: BatchOrderModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { language } = useSettingsStore();
  const SHIPPING_TYPES = getShippingTypes(language);

  const [destinations, setDestinations] = useState<ShippingDestination[]>(DEFAULT_DESTINATIONS);
  const [selectedDestination, setSelectedDestination] = useState<ShippingDestination | null>(null);
  const [selectedShippingType, setSelectedShippingType] = useState<ShippingType>('container');
  const [showDestinations, setShowDestinations] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [quantity, setQuantity] = useState('');

  // Load destinations from API
  useEffect(() => {
    async function loadDestinations() {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/shipping_routes?is_active=eq.true&select=*&order=destination_name`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: ShippingDestination[] = data.map((d: any) => ({
              id: d.destination_id || d.id,
              name: d.destination_name,
              country: d.destination_country,
              flag: d.destination_flag || '🌍',
              shippingCost: {
                korea: d.korea_cost_usd || 4500,
                china: d.china_cost_usd || 5000,
                dubai: d.dubai_cost_usd || 4000,
              },
            }));
            setDestinations(mapped);
          }
        }
      } catch {
        console.log('Using default destinations');
      }
    }

    if (visible) {
      loadDestinations();
    }
  }, [visible]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible && batch) {
      setSelectedDestination(null);
      setSelectedShippingType('container');
      setShowDestinations(false);
      setShowPreview(false);
      setQuantity(batch.minimum_order_quantity.toString());
    }
  }, [visible, batch]);

  const vehicleSource = batch?.source_country || 'korea';
  const qty = parseInt(quantity) || 0;
  const totalVehiclePriceUsd = (batch?.price_per_unit_usd || 0) * qty;

  // Calculate costs
  const costs = useMemo(() => {
    if (!batch || !selectedDestination || qty <= 0) return null;

    const shippingCostPerUnitUSD = selectedDestination.shippingCost[vehicleSource as keyof typeof selectedDestination.shippingCost] || 4500;
    const multiplier = SHIPPING_MULTIPLIERS[selectedShippingType];

    // Calculate per-unit costs then multiply by quantity
    const perUnit = calculateImportCosts({
      vehiclePriceUSD: batch.price_per_unit_usd,
      vehicleSource,
      shippingCostUSD: shippingCostPerUnitUSD,
      xafRate: XAF_RATE,
      shippingMultiplier: multiplier,
    });

    return {
      ...perUnit,
      // Override with total (qty × per-unit)
      vehiclePriceXAF: perUnit.vehiclePriceXAF * qty,
      exportTaxXAF: perUnit.exportTaxXAF * qty,
      shippingCostXAF: perUnit.shippingCostXAF * qty,
      insuranceCostXAF: perUnit.insuranceCostXAF * qty,
      inspectionFeeXAF: perUnit.inspectionFeeXAF * qty,
      totalXAF: perUnit.totalXAF * qty,
      totalUSD: perUnit.totalUSD * qty,
      // Keep per-unit for display
      perUnitTotalXAF: perUnit.totalXAF,
      perUnitTotalUSD: perUnit.totalUSD,
    };
  }, [batch, selectedDestination, selectedShippingType, vehicleSource, qty]);

  if (!batch) return null;

  const handleSelectDestination = (dest: ShippingDestination) => {
    setSelectedDestination(dest);
    setShowDestinations(false);
  };

  const handleContinueToPreview = () => {
    if (qty < batch.minimum_order_quantity) {
      Alert.alert('Attention', `Quantité minimale : ${batch.minimum_order_quantity} unités`);
      return;
    }
    if (qty > batch.available_quantity) {
      Alert.alert('Attention', `Seulement ${batch.available_quantity} unités disponibles`);
      return;
    }
    if (!selectedDestination) {
      Alert.alert(t('quotes.attention', language), t('quotes.selectDestinationAlert', language));
      return;
    }
    setShowPreview(true);
  };

  // Prepare preview data for QuotePreviewModal
  const previewData: QuotePreviewData | null = selectedDestination && costs ? {
    vehicle: {
      id: batch.id,
      make: batch.make,
      model: `${batch.model} (×${qty})`,
      year: batch.year,
      source: vehicleSource,
      priceUsd: totalVehiclePriceUsd,
    },
    destination: {
      id: selectedDestination.id,
      name: selectedDestination.name,
      country: selectedDestination.country,
      flag: selectedDestination.flag,
    },
    shippingType: selectedShippingType,
    costs: {
      vehiclePriceXAF: costs.vehiclePriceXAF,
      exportTaxXAF: costs.exportTaxXAF,
      shippingCostXAF: costs.shippingCostXAF,
      insuranceCostXAF: costs.insuranceCostXAF,
      inspectionFeeXAF: costs.inspectionFeeXAF,
      totalXAF: costs.totalXAF,
      totalUSD: costs.totalUSD,
    },
  } : null;

  const exportTax = getExportTax(vehicleSource);
  const hasExportTax = exportTax > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText variant="title" size="lg">{t('quotes.estimateFees', language)}</ThemedText>
            <ThemedText variant="muted" size="sm">
              {batch.year} {batch.make} {batch.model} — Lot
            </ThemedText>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Batch Price Summary */}
          <View style={[styles.vehicleCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.vehicleInfo}>
              <ThemedText variant="muted" size="sm">Prix unitaire (FOB)</ThemedText>
              <ThemedText variant="title" size="xl" style={{ color: AppTheme.orange }}>
                {formatFCFA(batch.price_per_unit_usd * XAF_RATE)}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                ≈ {formatUSD(batch.price_per_unit_usd)}
                {hasExportTax && ` (+ ${formatUSD(exportTax)} ${t('quotes.exportTaxLabel', language)})`}
              </ThemedText>
            </View>
          </View>

          {/* Quantity Selection */}
          <View style={styles.section}>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>
              <Ionicons name="layers" size={18} color={AppTheme.orange} /> Quantité
            </ThemedText>

            <View style={[styles.quantityCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    const newQty = Math.max(batch.minimum_order_quantity, qty - 1);
                    setQuantity(newQty.toString());
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                <TextInput
                  style={[styles.quantityInput, { color: colors.textPrimary }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  textAlign="center"
                />

                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    const newQty = Math.min(batch.available_quantity, qty + 1);
                    setQuantity(newQty.toString());
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.quantityInfo}>
                <ThemedText variant="muted" size="xs">
                  Min. {batch.minimum_order_quantity} — Max. {batch.available_quantity} unités
                </ThemedText>
                {qty > 0 && (
                  <ThemedText size="sm" style={{ fontWeight: '700', color: AppTheme.orange }}>
                    Total véhicules : {formatUSD(totalVehiclePriceUsd)}
                  </ThemedText>
                )}
              </View>
            </View>
          </View>

          {/* Destination Selection */}
          <View style={styles.section}>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>
              <Ionicons name="location" size={18} color={AppTheme.orange} /> {t('quotes.destination', language)}
            </ThemedText>

            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              onPress={() => setShowDestinations(!showDestinations)}
            >
              {selectedDestination ? (
                <View style={styles.selectedItem}>
                  <ThemedText style={{ fontSize: 20 }}>{selectedDestination.flag}</ThemedText>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText variant="subtitle">{selectedDestination.name}</ThemedText>
                    <ThemedText variant="muted" size="xs">{selectedDestination.country}</ThemedText>
                  </View>
                </View>
              ) : (
                <ThemedText variant="muted">{t('quotes.selectDestination', language)}</ThemedText>
              )}
              <Ionicons
                name={showDestinations ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showDestinations && (
              <View style={[styles.dropdownList, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                  {destinations.map((dest) => (
                    <TouchableOpacity
                      key={dest.id}
                      style={[
                        styles.dropdownItem,
                        selectedDestination?.id === dest.id && { backgroundColor: AppTheme.orange + '20' },
                      ]}
                      onPress={() => handleSelectDestination(dest)}
                    >
                      <ThemedText style={{ fontSize: 18, marginRight: 10 }}>{dest.flag}</ThemedText>
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="subtitle" size="sm">{dest.name}</ThemedText>
                        <ThemedText variant="muted" size="xs">{dest.country}</ThemedText>
                      </View>
                      {selectedDestination?.id === dest.id && (
                        <Ionicons name="checkmark" size={20} color={AppTheme.orange} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Shipping Type Selection */}
          {selectedDestination && (
            <View style={styles.section}>
              <ThemedText variant="subtitle" style={styles.sectionTitle}>
                <Ionicons name="boat" size={18} color={AppTheme.orange} /> {t('quotes.shippingType', language)}
              </ThemedText>

              <View style={styles.shippingTypes}>
                {SHIPPING_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.shippingTypeCard,
                      { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                      selectedShippingType === type.id && { borderColor: AppTheme.orange, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedShippingType(type.id)}
                  >
                    <View style={[styles.shippingTypeIcon, { backgroundColor: AppTheme.orange + '15' }]}>
                      <Ionicons name={type.icon} size={24} color={AppTheme.orange} />
                    </View>
                    <ThemedText variant="subtitle" size="sm" style={{ marginTop: 8 }}>
                      {type.label}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: 4 }}>
                      {type.description}
                    </ThemedText>
                    {selectedShippingType === type.id && (
                      <View style={styles.selectedCheck}>
                        <Ionicons name="checkmark-circle" size={20} color={AppTheme.orange} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Cost Preview */}
          {costs && (
            <View style={[styles.costPreview, { backgroundColor: colors.surface }]}>
              <ThemedText variant="subtitle" style={styles.sectionTitle}>
                <Ionicons name="calculator" size={18} color={AppTheme.orange} /> {t('quotes.costEstimation', language)} ({qty} unités)
              </ThemedText>

              <View style={styles.costRow}>
                <ThemedText variant="muted">{t('quotes.vehiclePrice', language)} (×{qty})</ThemedText>
                <ThemedText>{formatFCFA(costs.vehiclePriceXAF)}</ThemedText>
              </View>
              {hasExportTax && (
                <View style={styles.costRow}>
                  <ThemedText variant="muted">{t('quotes.exportTax', language)} (×{qty})</ThemedText>
                  <ThemedText>{formatFCFA(costs.exportTaxXAF)}</ThemedText>
                </View>
              )}
              <View style={styles.costRow}>
                <ThemedText variant="muted">{t('quotes.maritimeTransport', language)} (×{qty})</ThemedText>
                <ThemedText>{formatFCFA(costs.shippingCostXAF)}</ThemedText>
              </View>
              <View style={styles.costRow}>
                <ThemedText variant="muted">{t('quotes.cargoInsurance', language)}</ThemedText>
                <ThemedText>{formatFCFA(costs.insuranceCostXAF)}</ThemedText>
              </View>
              <View style={styles.costRow}>
                <ThemedText variant="muted">{t('quotes.inspectionDocs', language)} (×{qty})</ThemedText>
                <ThemedText>{formatFCFA(costs.inspectionFeeXAF)}</ThemedText>
              </View>

              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <ThemedText variant="title">{t('quotes.estimatedTotal', language)}</ThemedText>
                <ThemedText variant="title" style={{ color: AppTheme.orange }}>
                  {formatFCFA(costs.totalXAF)}
                </ThemedText>
              </View>
              <ThemedText variant="muted" size="xs" style={{ textAlign: 'right' }}>
                ≈ {formatUSD(costs.totalUSD)}
              </ThemedText>
            </View>
          )}

          {/* Note */}
          <View style={[styles.note, { backgroundColor: AppTheme.orange + '10' }]}>
            <Ionicons name="information-circle" size={18} color={AppTheme.orange} />
            <ThemedText variant="muted" size="xs" style={{ flex: 1, marginLeft: 8 }}>
              {t('quotes.disclaimer', language)}
            </ThemedText>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <ThemedText>{t('quotes.cancel', language)}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, (!selectedDestination || qty <= 0) && styles.disabledButton]}
            onPress={handleContinueToPreview}
            disabled={!selectedDestination || qty <= 0}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
              {t('quotes.viewQuote', language)}
            </ThemedText>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quote Preview Modal */}
      <QuotePreviewModal
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        data={previewData}
        onSaveSuccess={() => {
          onClose();
          router.push('/(tabs)/quotes');
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  vehicleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  vehicleInfo: {
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Quantity
  quantityCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    fontSize: 28,
    fontWeight: '800',
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
  },
  quantityInfo: {
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  // Destination
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  // Shipping types
  shippingTypes: {
    flexDirection: 'row',
    gap: 12,
  },
  shippingTypeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  shippingTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Cost preview
  costPreview: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: AppTheme.orange,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
