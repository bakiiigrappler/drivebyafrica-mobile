import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  INSURANCE_RATE,
  INSPECTION_FEE_XAF,
  XAF_RATE,
  EXPORT_TAX_USD,
  DEFAULT_DESTINATIONS,
  ShippingDestination,
  calculateImportCosts,
  formatFCFA,
  formatUSD,
} from '@/lib/pricing';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type VehicleSource = 'korea' | 'china' | 'dubai';
type ShippingType = 'container' | 'groupage';

const SOURCES: { key: VehicleSource; label: string; flag: string }[] = [
  { key: 'korea', label: 'Coree du Sud', flag: '🇰🇷' },
  { key: 'china', label: 'Chine', flag: '🇨🇳' },
  { key: 'dubai', label: 'Dubai', flag: '🇦🇪' },
];

export default function CalculatorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [vehiclePrice, setVehiclePrice] = useState('');
  const [source, setSource] = useState<VehicleSource>('korea');
  const [destinations, setDestinations] = useState<ShippingDestination[]>(DEFAULT_DESTINATIONS);
  const [destination, setDestination] = useState<ShippingDestination>(DEFAULT_DESTINATIONS[0]);
  const [shippingType, setShippingType] = useState<ShippingType>('container');
  const [showDestinations, setShowDestinations] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

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
            setDestination(mapped[0]);
          }
        }
      } catch (error) {
        console.log('Using default destinations');
      } finally {
        setIsLoadingDestinations(false);
      }
    }

    loadDestinations();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const priceNum = parseFloat(vehiclePrice) || 0;
  const shippingCostUSD = destination.shippingCost[source];
  const shippingMultiplier = shippingType === 'groupage' ? 0.5 : 1;

  const costs = priceNum > 0 ? calculateImportCosts({
    vehiclePriceUSD: priceNum,
    vehicleSource: source,
    shippingCostUSD,
    xafRate: XAF_RATE,
    shippingMultiplier,
  }) : null;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Vehicle Price Input */}
            <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <ThemedText variant="title" size="lg" style={styles.sectionTitle}>
                Prix du vehicule
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <ThemedText style={styles.currencyPrefix}>$</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={vehiclePrice}
                  onChangeText={setVehiclePrice}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <ThemedText variant="muted">USD</ThemedText>
              </View>
            </View>

            {/* Source Selection */}
            <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <ThemedText variant="title" size="lg" style={styles.sectionTitle}>
                Pays d'origine
              </ThemedText>
              <View style={styles.optionsRow}>
                {SOURCES.map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: source === s.key ? AppTheme.orange : colors.background,
                        borderColor: source === s.key ? AppTheme.orange : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setSource(s.key)}
                  >
                    <ThemedText style={{ fontSize: 20 }}>{s.flag}</ThemedText>
                    <ThemedText
                      size="sm"
                      style={{
                        color: source === s.key ? '#fff' : colors.textPrimary,
                        fontWeight: source === s.key ? '600' : '400',
                        marginTop: 4,
                      }}
                    >
                      {s.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {source === 'china' && (
                <View style={[styles.infoBox, { backgroundColor: '#F59E0B' + '20' }]}>
                  <Ionicons name="information-circle" size={18} color="#F59E0B" />
                  <ThemedText size="sm" style={{ marginLeft: 8, flex: 1, color: '#F59E0B' }}>
                    Taxe d'exportation Chine: {formatUSD(EXPORT_TAX_USD.china)}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Destination Selection */}
            <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <ThemedText variant="title" size="lg" style={styles.sectionTitle}>
                Port de destination
              </ThemedText>
              <TouchableOpacity
                style={[styles.destinationSelector, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                onPress={() => setShowDestinations(!showDestinations)}
              >
                <View style={styles.destinationInfo}>
                  <ThemedText style={{ fontSize: 24 }}>{destination.flag}</ThemedText>
                  <View style={{ marginLeft: 12 }}>
                    <ThemedText variant="title">{destination.name}</ThemedText>
                    <ThemedText variant="muted" size="sm">{destination.country}</ThemedText>
                  </View>
                </View>
                <Ionicons
                  name={showDestinations ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {showDestinations && (
                <View style={[styles.destinationsList, { borderColor: colors.cardBorder }]}>
                  {isLoadingDestinations ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <ActivityIndicator color={AppTheme.orange} />
                      <ThemedText variant="muted" size="sm" style={{ marginTop: 8 }}>
                        Chargement des destinations...
                      </ThemedText>
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                      {destinations.map((dest) => (
                        <TouchableOpacity
                          key={dest.id}
                          style={[
                            styles.destinationOption,
                            destination.id === dest.id && { backgroundColor: AppTheme.orange + '20' },
                          ]}
                          onPress={() => {
                            setDestination(dest);
                            setShowDestinations(false);
                          }}
                        >
                          <ThemedText style={{ fontSize: 20 }}>{dest.flag}</ThemedText>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <ThemedText>{dest.name}</ThemedText>
                            <ThemedText variant="muted" size="sm">{dest.country}</ThemedText>
                          </View>
                          <ThemedText variant="muted" size="sm">
                            {formatUSD(dest.shippingCost[source])}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            {/* Shipping Type */}
            <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <ThemedText variant="title" size="lg" style={styles.sectionTitle}>
                Type d'expedition
              </ThemedText>
              <View style={styles.shippingOptions}>
                <TouchableOpacity
                  style={[
                    styles.shippingOption,
                    {
                      backgroundColor: shippingType === 'container' ? AppTheme.orange : colors.background,
                      borderColor: shippingType === 'container' ? AppTheme.orange : colors.cardBorder,
                    },
                  ]}
                  onPress={() => setShippingType('container')}
                >
                  <Ionicons
                    name="cube"
                    size={24}
                    color={shippingType === 'container' ? '#fff' : colors.textPrimary}
                  />
                  <ThemedText
                    style={{
                      color: shippingType === 'container' ? '#fff' : colors.textPrimary,
                      fontWeight: '600',
                      marginTop: 8,
                    }}
                  >
                    Container
                  </ThemedText>
                  <ThemedText
                    size="sm"
                    style={{
                      color: shippingType === 'container' ? 'rgba(255,255,255,0.8)' : colors.textMuted,
                      marginTop: 4,
                    }}
                  >
                    100% du tarif
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shippingOption,
                    {
                      backgroundColor: shippingType === 'groupage' ? AppTheme.orange : colors.background,
                      borderColor: shippingType === 'groupage' ? AppTheme.orange : colors.cardBorder,
                    },
                  ]}
                  onPress={() => setShippingType('groupage')}
                >
                  <Ionicons
                    name="layers"
                    size={24}
                    color={shippingType === 'groupage' ? '#fff' : colors.textPrimary}
                  />
                  <ThemedText
                    style={{
                      color: shippingType === 'groupage' ? '#fff' : colors.textPrimary,
                      fontWeight: '600',
                      marginTop: 8,
                    }}
                  >
                    Groupage
                  </ThemedText>
                  <ThemedText
                    size="sm"
                    style={{
                      color: shippingType === 'groupage' ? 'rgba(255,255,255,0.8)' : colors.textMuted,
                      marginTop: 4,
                    }}
                  >
                    50% du tarif
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cost Breakdown */}
            {costs && (
              <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <ThemedText variant="title" size="lg" style={styles.sectionTitle}>
                  Estimation des couts
                </ThemedText>

                <View style={styles.costRow}>
                  <ThemedText variant="muted">Prix du vehicule</ThemedText>
                  <ThemedText>{formatFCFA(costs.vehiclePriceXAF)}</ThemedText>
                </View>

                {costs.exportTaxXAF > 0 && (
                  <View style={styles.costRow}>
                    <ThemedText variant="muted">Taxe d'exportation</ThemedText>
                    <ThemedText>{formatFCFA(costs.exportTaxXAF)}</ThemedText>
                  </View>
                )}

                <View style={styles.costRow}>
                  <ThemedText variant="muted">
                    Frais de transport ({shippingType === 'groupage' ? '50%' : '100%'})
                  </ThemedText>
                  <ThemedText>{formatFCFA(costs.shippingCostXAF)}</ThemedText>
                </View>

                <View style={styles.costRow}>
                  <ThemedText variant="muted">Assurance cargo (2.5%)</ThemedText>
                  <ThemedText>{formatFCFA(costs.insuranceCostXAF)}</ThemedText>
                </View>

                <View style={styles.costRow}>
                  <ThemedText variant="muted">Inspection & documents</ThemedText>
                  <ThemedText>{formatFCFA(costs.inspectionFeeXAF)}</ThemedText>
                </View>

                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <ThemedText variant="title" size="lg">Total estime</ThemedText>
                  <ThemedText variant="title" size="xl" style={{ color: AppTheme.orange }}>
                    {formatFCFA(costs.totalXAF)}
                  </ThemedText>
                </View>

                <View style={[styles.infoBox, { backgroundColor: AppTheme.orange + '10', marginTop: 16 }]}>
                  <Ionicons name="information-circle-outline" size={18} color={AppTheme.orange} />
                  <ThemedText size="sm" variant="muted" style={{ marginLeft: 8, flex: 1 }}>
                    Ce calcul n'inclut pas les droits de douane et taxes locales qui varient selon le pays de destination.
                  </ThemedText>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  destinationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationsList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 300,
  },
  destinationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  shippingOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  shippingOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
  },
});
