import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, SOURCE_FLAGS, AppTheme } from '@/constants';
import { ThemedText } from '@/components/ui/ThemedText';
import { useSettingsStore } from '@/store';
import { useCurrency } from '@/hooks';
import { t } from '@/lib/i18n';
import { getFirstValidImage } from '@/lib/images';
import type { Vehicle } from '@/types';

interface VehicleCardProps {
  vehicle: Vehicle;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onRequestQuote?: (vehicle: Vehicle) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export function VehicleCard({ vehicle, isFavorite, onToggleFavorite, onRequestQuote }: VehicleCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { language } = useSettingsStore();
  const { formatVehiclePrice, getExportTaxAmount } = useCurrency();

  const imageUrl = getFirstValidImage(vehicle.images);
  const priceUsd = vehicle.current_price_usd || vehicle.start_price_usd || 0;
  // Price formatted with export tax included (for China vehicles)
  const formattedPrice = formatVehiclePrice(priceUsd, vehicle.source);
  const hasExportTax = getExportTaxAmount(vehicle.source) > 0;
  const flag = SOURCE_FLAGS[vehicle.source] || '🌍';
  const sourceLabel = vehicle.source === 'korea' ? t('countries.korea', language) : vehicle.source === 'china' ? t('countries.china', language) : t('countries.dubai', language);
  const sourceCode = vehicle.source === 'korea' ? 'KR' : vehicle.source === 'china' ? 'CN' : 'AE';

  const handlePress = () => {
    router.push(`/vehicle/${vehicle.id}`);
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.(vehicle.id);
  };

  const handleQuotePress = (e: any) => {
    e.stopPropagation();
    onRequestQuote?.(vehicle);
  };

  // Check if price is available
  const hasPrice = priceUsd > 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {/* Source Badge - Top Left */}
        <View style={[styles.sourceBadge, { backgroundColor: AppTheme.navy }]}>
          <ThemedText style={styles.sourceBadgeText}>{flag} {sourceLabel}</ThemedText>
        </View>

        {/* Favorite Button - Top Right */}
        {onToggleFavorite && (
          <TouchableOpacity
            style={[styles.favoriteButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            onPress={handleFavoritePress}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#EF4444' : '#9CA3AF'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <ThemedText variant="subtitle" numberOfLines={1} style={styles.title}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </ThemedText>

        {/* Subtitle - Grade & Transmission */}
        <ThemedText variant="muted" size="xs" numberOfLines={1} style={styles.subtitle}>
          {vehicle.grade || 'Standard'} {vehicle.engine_cc ? `${(vehicle.engine_cc / 1000).toFixed(1)}L` : ''} • {vehicle.transmission || t('vehicleDetail.automatic', language)}
        </ThemedText>

        {/* Specs Row - Small Badges */}
        <View style={styles.specsRow}>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
              {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : '-'}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
              {t('vehicleDetail.firstOwner', language)}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
              {vehicle.fuel_type || t('vehicleDetail.petrol', language)}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
              {sourceCode}
            </ThemedText>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <View style={styles.priceInfo}>
            <ThemedText style={styles.price}>
              {hasPrice ? formattedPrice : t('vehicleDetail.onRequest', language)}
            </ThemedText>
            <ThemedText style={[styles.priceLabel, { color: colors.textMuted }]}>
              {t('vehicleDetail.fobPrice', language)}{hasExportTax ? ' *' : ''}
            </ThemedText>
          </View>
          {onRequestQuote && (
            <TouchableOpacity
              style={styles.quoteButton}
              onPress={handleQuotePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="calculator-outline" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  sourceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceBadgeText: {
    color: AppTheme.white,
    fontSize: 10,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    padding: 12,
  },
  title: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  subtitle: {
    marginBottom: 8,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  specBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  specText: {
    fontSize: 9,
    fontWeight: '500',
  },
  priceContainer: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInfo: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.orange,
  },
  priceLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  quoteButton: {
    backgroundColor: AppTheme.orange,
    padding: 8,
    borderRadius: 6,
  },
});
