import { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
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
import type { Vehicle } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface QuoteEstimationModalProps {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle;
}

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

export function QuoteEstimationModal({ visible, onClose, vehicle }: QuoteEstimationModalProps) {
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
            // Map using correct column names from shipping_routes table
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
      } catch (error) {
        console.log('Using default destinations');
      }
    }

    if (visible) {
      loadDestinations();
    }
  }, [visible]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDestination(null);
      setSelectedShippingType('container');
      setShowDestinations(false);
      setShowPreview(false);
    }
  }, [visible]);

  // Get vehicle price
  const vehiclePrice = vehicle.start_price_usd ?? vehicle.buy_now_price_usd ?? vehicle.current_price_usd ?? 0;
  const vehicleSource = vehicle.source || 'korea';

  // Calculate costs
  const costs = useMemo(() => {
    if (!selectedDestination) return null;

    const shippingCostUSD = selectedDestination.shippingCost[vehicleSource as keyof typeof selectedDestination.shippingCost] || 4500;
    const multiplier = SHIPPING_MULTIPLIERS[selectedShippingType];

    return calculateImportCosts({
      vehiclePriceUSD: vehiclePrice,
      vehicleSource,
      shippingCostUSD,
      xafRate: XAF_RATE,
      shippingMultiplier: multiplier,
    });
  }, [selectedDestination, selectedShippingType, vehiclePrice, vehicleSource]);

  const handleSelectDestination = (dest: ShippingDestination) => {
    setSelectedDestination(dest);
    setShowDestinations(false);
  };

  const handleContinueToPreview = () => {
    if (!selectedDestination) {
      Alert.alert(t('quotes.attention', language), t('quotes.selectDestinationAlert', language));
      return;
    }
    setShowPreview(true);
  };

  // Prepare preview data for QuotePreviewModal
  const previewData: QuotePreviewData | null = selectedDestination && costs ? {
    vehicle: {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year ?? 0,
      source: vehicleSource,
      priceUsd: vehiclePrice,
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
              {vehicle.make} {vehicle.model} {vehicle.year}
            </ThemedText>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Vehicle Price Summary */}
              <View style={[styles.vehicleCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={styles.vehicleInfo}>
                  <ThemedText variant="muted" size="sm">{t('quotes.vehicleFobPrice', language)}</ThemedText>
                  <ThemedText variant="title" size="xl" style={{ color: AppTheme.orange }}>
                    {formatFCFA(vehiclePrice * XAF_RATE)}
                  </ThemedText>
                  <ThemedText variant="muted" size="xs">
                    ≈ {formatUSD(vehiclePrice)}
                    {hasExportTax && ` (+ ${formatUSD(exportTax)} ${t('quotes.exportTaxLabel', language)})`}
                  </ThemedText>
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
                    <Ionicons name="calculator" size={18} color={AppTheme.orange} /> {t('quotes.costEstimation', language)}
                  </ThemedText>

                  <View style={styles.costRow}>
                    <ThemedText variant="muted">{t('quotes.vehiclePrice', language)}</ThemedText>
                    <ThemedText>{formatFCFA(costs.vehiclePriceXAF)}</ThemedText>
                  </View>
                  {hasExportTax && (
                    <View style={styles.costRow}>
                      <ThemedText variant="muted">{t('quotes.exportTax', language)}</ThemedText>
                      <ThemedText>{formatFCFA(costs.exportTaxXAF)}</ThemedText>
                    </View>
                  )}
                  <View style={styles.costRow}>
                    <ThemedText variant="muted">{t('quotes.maritimeTransport', language)}</ThemedText>
                    <ThemedText>{formatFCFA(costs.shippingCostXAF)}</ThemedText>
                  </View>
                  <View style={styles.costRow}>
                    <ThemedText variant="muted">{t('quotes.cargoInsurance', language)}</ThemedText>
                    <ThemedText>{formatFCFA(costs.insuranceCostXAF)}</ThemedText>
                  </View>
                  <View style={styles.costRow}>
                    <ThemedText variant="muted">{t('quotes.inspectionDocs', language)}</ThemedText>
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
            style={[styles.primaryButton, !selectedDestination && styles.disabledButton]}
            onPress={handleContinueToPreview}
            disabled={!selectedDestination}
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
