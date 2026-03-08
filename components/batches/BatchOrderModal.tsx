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
  XAF_RATE,
  INSURANCE_RATE,
  INSPECTION_FEE_XAF,
  formatFCFA,
  formatUSD,
  getExportTax,
} from '@/lib/pricing';
import { useSettingsStore } from '@/store';
import { t } from '@/lib/i18n';
import type { VehicleBatch } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type BatchShippingType = '20hq' | '40hq' | 'roro' | 'flat_rack';

const BATCH_SHIPPING_CONFIG: Record<BatchShippingType, { vehiclesPerUnit: number; label: string; unitLabel: string; icon: keyof typeof Ionicons.glyphMap }> = {
  '20hq': { vehiclesPerUnit: 2, label: 'Container 20HQ', unitLabel: 'container', icon: 'cart-outline' },
  '40hq': { vehiclesPerUnit: 4, label: 'Container 40HQ', unitLabel: 'container', icon: 'cube-outline' },
  'roro': { vehiclesPerUnit: 1, label: 'RORO (Roll-on/Roll-off)', unitLabel: 'véhicule', icon: 'car-outline' },
  'flat_rack': { vehiclesPerUnit: 1, label: 'Flat Rack', unitLabel: 'unité', icon: 'grid-outline' },
};

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

  const [destinations, setDestinations] = useState<ShippingDestination[]>(DEFAULT_DESTINATIONS);
  const [selectedDestination, setSelectedDestination] = useState<ShippingDestination | null>(null);
  const [selectedShippingType, setSelectedShippingType] = useState<BatchShippingType>('40hq');
  const [showDestinations, setShowDestinations] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');

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
              shippingCost40ft: {
                korea: d.korea_cost_40ft_usd || 0,
                china: d.china_cost_40ft_usd || 0,
                dubai: d.dubai_cost_40ft_usd || 0,
              },
              shippingCostRoro: {
                korea: d.korea_roro_usd || 0,
                china: d.china_roro_usd || 0,
                dubai: d.dubai_roro_usd || 0,
              },
              shippingCostFlatRack: {
                korea: d.korea_flat_rack_usd || 0,
                china: d.china_flat_rack_usd || 0,
                dubai: d.dubai_flat_rack_usd || 0,
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
      setSelectedShippingType('40hq');
      setShowDestinations(false);
      setDestinationSearch('');
      setShowPreview(false);
      setQuantity(batch.minimum_order_quantity.toString());
    }
  }, [visible, batch]);

  const vehicleSource = batch?.source_country || 'korea';
  const sourceKey = vehicleSource as 'korea' | 'china' | 'dubai';
  const qty = parseInt(quantity) || 0;
  const totalVehiclePriceUsd = (batch?.price_per_unit_usd || 0) * qty;

  const shippingConfig = BATCH_SHIPPING_CONFIG[selectedShippingType];
  const { vehiclesPerUnit } = shippingConfig;

  // Filter destinations based on search
  const filteredDestinations = useMemo(() => {
    if (!destinationSearch.trim()) return destinations;
    const q = destinationSearch.toLowerCase();
    return destinations.filter(
      (d) => d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
    );
  }, [destinations, destinationSearch]);

  // Calculate costs matching web logic (vehiclesPerUnit, different cost sources)
  const costs = useMemo(() => {
    if (!batch || !selectedDestination || qty <= 0) return null;

    const exportTaxUSD = getExportTax(vehicleSource);
    const effectiveUnitPriceUSD = batch.price_per_unit_usd + exportTaxUSD;
    const totalVehiclePriceUSD = effectiveUnitPriceUSD * qty;

    // Get shipping cost per unit based on shipping type
    let costPerUnit: number;
    if (selectedShippingType === 'roro') {
      costPerUnit = selectedDestination.shippingCostRoro[sourceKey] || 0;
    } else if (selectedShippingType === 'flat_rack') {
      costPerUnit = selectedDestination.shippingCostFlatRack[sourceKey] || 0;
    } else if (selectedShippingType === '20hq') {
      costPerUnit = selectedDestination.shippingCost[sourceKey] || 0;
    } else {
      costPerUnit = selectedDestination.shippingCost40ft[sourceKey] || 0;
    }

    const numberOfUnits = Math.ceil(qty / vehiclesPerUnit);
    const totalShippingCostUSD = numberOfUnits * costPerUnit;

    // Insurance: 2.5% of (vehicle price + shipping)
    const insuranceCostUSD = (totalVehiclePriceUSD + totalShippingCostUSD) * INSURANCE_RATE;
    const totalInspectionFeeUSD = (INSPECTION_FEE_XAF / XAF_RATE) * qty;

    const totalUSD = totalVehiclePriceUSD + totalShippingCostUSD + insuranceCostUSD + totalInspectionFeeUSD;

    return {
      vehiclePriceXAF: Math.round(totalVehiclePriceUSD * XAF_RATE),
      exportTaxXAF: Math.round(exportTaxUSD * qty * XAF_RATE),
      shippingCostXAF: Math.round(totalShippingCostUSD * XAF_RATE),
      insuranceCostXAF: Math.round(insuranceCostUSD * XAF_RATE),
      inspectionFeeXAF: Math.round(INSPECTION_FEE_XAF * qty),
      totalXAF: Math.round(totalUSD * XAF_RATE),
      totalUSD: Math.round(totalUSD),
      numberOfUnits,
      costPerUnit,
      hasExportTax: exportTaxUSD > 0,
    };
  }, [batch, selectedDestination, selectedShippingType, vehicleSource, sourceKey, qty, vehiclesPerUnit]);

  if (!batch) return null;

  const handleSelectDestination = (dest: ShippingDestination) => {
    setSelectedDestination(dest);
    setShowDestinations(false);
    setDestinationSearch('');
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
    shippingType: 'container',
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
                {/* Search input */}
                <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                  <Ionicons name="search" size={16} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder={t('quotes.searchDestination', language) || 'Rechercher...'}
                    placeholderTextColor={colors.textMuted}
                    value={destinationSearch}
                    onChangeText={setDestinationSearch}
                    autoFocus
                  />
                  {destinationSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setDestinationSearch('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                  {filteredDestinations.length > 0 ? (
                    filteredDestinations.map((dest) => (
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
                    ))
                  ) : (
                    <View style={{ padding: 16, alignItems: 'center' }}>
                      <ThemedText variant="muted" size="sm">Aucune destination trouvée</ThemedText>
                    </View>
                  )}
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
                {(Object.entries(BATCH_SHIPPING_CONFIG) as [BatchShippingType, typeof BATCH_SHIPPING_CONFIG[BatchShippingType]][]).map(([id, config]) => (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.shippingTypeCard,
                      { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                      selectedShippingType === id && { borderColor: AppTheme.orange, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedShippingType(id)}
                  >
                    <View style={[styles.shippingTypeIcon, { backgroundColor: AppTheme.orange + '15' }]}>
                      <Ionicons name={config.icon as any} size={22} color={AppTheme.orange} />
                    </View>
                    <ThemedText variant="subtitle" size="xs" style={{ marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
                      {config.label}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: 2 }}>
                      {config.vehiclesPerUnit > 1 ? `${config.vehiclesPerUnit} véh.` : `par ${config.unitLabel}`}
                    </ThemedText>
                    {selectedShippingType === id && (
                      <View style={styles.selectedCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={AppTheme.orange} />
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
                <View style={{ flex: 1 }}>
                  <ThemedText variant="muted">{t('quotes.vehiclePrice', language)} (FOB)</ThemedText>
                  <ThemedText variant="muted" size="xs">
                    {formatFCFA(Math.round((batch.price_per_unit_usd + getExportTax(vehicleSource)) * XAF_RATE))} × {qty}
                  </ThemedText>
                </View>
                <ThemedText>{formatFCFA(costs.vehiclePriceXAF)}</ThemedText>
              </View>
              <View style={styles.costRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="muted">{t('quotes.maritimeTransport', language)}</ThemedText>
                  <ThemedText variant="muted" size="xs" style={{ color: AppTheme.orange }}>
                    {shippingConfig.label} × {costs.numberOfUnits} ({formatUSD(costs.costPerUnit)}/{shippingConfig.unitLabel === 'véhicule' ? 'véh.' : shippingConfig.unitLabel === 'unité' ? 'unité' : 'cont.'})
                  </ThemedText>
                </View>
                <ThemedText>{formatFCFA(costs.shippingCostXAF)}</ThemedText>
              </View>
              <View style={styles.costRow}>
                <ThemedText variant="muted">{t('quotes.cargoInsurance', language)} (2.5%)</ThemedText>
                <ThemedText>{formatFCFA(costs.insuranceCostXAF)}</ThemedText>
              </View>
              <View style={styles.costRow}>
                <ThemedText variant="muted">{t('quotes.inspectionDocs', language)} × {qty}</ThemedText>
                <ThemedText>{formatFCFA(costs.inspectionFeeXAF)}</ThemedText>
              </View>

              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <View>
                  <ThemedText variant="title">{t('quotes.estimatedTotal', language)}</ThemedText>
                  {costs.hasExportTax && (
                    <ThemedText variant="muted" size="xs">Inclut taxe export</ThemedText>
                  )}
                </View>
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
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  // Shipping types
  shippingTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shippingTypeCard: {
    flexBasis: '47%' as any,
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  shippingTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
