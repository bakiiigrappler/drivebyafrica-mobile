import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme, SOURCE_FLAGS } from '@/constants';
import { ThemedText } from '@/components/ui/ThemedText';
import { useSettingsStore } from '@/store';
import { useCurrency } from '@/hooks';
import { t } from '@/lib/i18n';
import { getFirstValidImage } from '@/lib/images';
import type { Vehicle } from '@/types';

const { width } = Dimensions.get('window');
const IMAGE_WIDTH = width * 0.35;
const CARD_HEIGHT = 165;

interface VehicleCardHorizontalProps {
  vehicle: Vehicle;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onRequestQuote?: (vehicle: Vehicle) => void;
}

export function VehicleCardHorizontal({
  vehicle,
  isFavorite,
  onToggleFavorite,
  onRequestQuote,
}: VehicleCardHorizontalProps) {
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

  // Source label
  const sourceLabel = vehicle.source === 'korea' ? 'KR' : vehicle.source === 'china' ? 'CN' : 'AE';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Main Content Row */}
      <View style={styles.mainRow}>
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />

          {/* Flag Badge - Top Left on Image */}
          <View style={styles.flagBadge}>
            <ThemedText style={styles.flagBadgeText}>{flag}</ThemedText>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header Row - Favorite */}
          <View style={styles.headerRow}>
            <View />
            {onToggleFavorite && (
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={handleFavoritePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite ? '#EF4444' : colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Title */}
          <ThemedText numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </ThemedText>

          {/* Subtitle - Grade & Transmission */}
          <ThemedText numberOfLines={1} style={[styles.subtitle, { color: colors.textMuted }]}>
            {vehicle.grade || 'Standard'} {vehicle.engine_cc ? `${(vehicle.engine_cc / 1000).toFixed(1)}L` : ''} {vehicle.transmission?.toLowerCase() || 'automatic'}
          </ThemedText>

          {/* Specs Row */}
          <View style={styles.specsRow}>
            <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
              <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
                {vehicle.mileage ? `${Math.round(vehicle.mileage / 1000)}k km` : '-'}
              </ThemedText>
            </View>
            <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
              <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
                {t('vehicleDetail.firstOwner', language)}
              </ThemedText>
            </View>
            <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
              <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
                -
              </ThemedText>
            </View>
            <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
              <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
                {sourceLabel}
              </ThemedText>
            </View>
          </View>

          {/* Price Row */}
          <View style={styles.priceRow}>
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
                <Ionicons name="calculator-outline" size={14} color="#fff" />
                <ThemedText style={styles.quoteButtonText}>{t('quotes.quote', language)}</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    height: CARD_HEIGHT,
  },
  mainRow: {
    flexDirection: 'row',
    height: '100%',
  },
  imageContainer: {
    width: IMAGE_WIDTH,
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  flagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  flagBadgeText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 2,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  specBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  specText: {
    fontSize: 11,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceInfo: {
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: AppTheme.orange,
  },
  priceLabel: {
    fontSize: 11,
  },
  quoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.orange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  quoteButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
