import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, StatusBar, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { useBatch } from '@/hooks/useBatches';
import { useAuthStore, useSettingsStore } from '@/store';
import { t, type Language } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { parseImagesField, PLACEHOLDER_IMAGE } from '@/lib/images';
import { BatchOrderModal } from '@/components/batches/BatchOrderModal';

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const getSourceLabels = (lang: Language): Record<string, string> => ({
  korea: t('countries.korea', lang),
  china: t('countries.china', lang),
  dubai: t('countries.dubai', lang),
});

const { width } = Dimensions.get('window');

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();

  const { data: batch, isLoading, error, refetch } = useBatch(id);
  const { formatPrice } = useCurrency();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef<ScrollView>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppTheme.orange} />
      </ThemedView>
    );
  }

  if (error || !batch) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <ThemedText variant="title" size="lg" style={{ marginTop: 16 }}>
          {t('batches.batchNotFound', language)}
        </ThemedText>
        <Button title={t('vehicleDetail.back', language)} variant="outline" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </ThemedView>
    );
  }

  const allImages = parseImagesField(batch.images);
  const hasImages = allImages.length > 0;
  const displayImages = hasImages ? allImages : [PLACEHOLDER_IMAGE];
  const sourceFlag = SOURCE_FLAGS[batch.source_country] || '🌍';
  const sourceLabel = getSourceLabels(language)[batch.source_country] || batch.source_country;
  const isLowStock = batch.available_quantity <= 10 && batch.available_quantity > 0;
  const isSoldOut = batch.available_quantity === 0 || batch.status === 'sold_out';

  const handleShare = async () => {
    try {
      await Share.share({
        title: batch.title,
        message: `${t('vehicleDetail.shareMessage', language)} ${batch.title} ${t('vehicleDetail.shareOn', language)} - ${batch.available_quantity} ${t('batches.units', language)} @ $${batch.price_per_unit_usd.toLocaleString()}`,
      });
    } catch {
      Alert.alert(t('vehicleDetail.error', language), t('vehicleDetail.shareError', language));
    }
  };

  const handleRequestQuote = () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    setIsOrderModalOpen(true);
  };

  const handleAskQuestion = () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/messages');
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentImageIndex && slideIndex >= 0 && slideIndex < displayImages.length) {
      setCurrentImageIndex(slideIndex);
    }
  };

  const scrollToImage = (index: number) => {
    setCurrentImageIndex(index);
    imageScrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  // Specs to display
  const specs: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [];
  if (batch.mileage) specs.push({ label: t('vehicleDetail.mileage', language), value: `${batch.mileage.toLocaleString()} KM`, icon: 'speedometer-outline' });
  if (batch.fuel_type) specs.push({ label: t('vehicleDetail.fuel', language), value: batch.fuel_type, icon: 'flame-outline' });
  if (batch.transmission) specs.push({ label: t('vehicleDetail.transmission', language), value: batch.transmission, icon: 'cog-outline' });
  if (batch.drive_type) specs.push({ label: t('vehicleDetail.driveType', language), value: batch.drive_type, icon: 'car-outline' });
  if (batch.engine_size) specs.push({ label: t('vehicleDetail.engine', language), value: batch.engine_size, icon: 'hardware-chip-outline' });
  if (batch.body_type) specs.push({ label: t('vehicleDetail.bodyType', language), value: batch.body_type, icon: 'car-sport-outline' });
  if (batch.color) specs.push({ label: t('vehicleDetail.color', language), value: batch.color, icon: 'color-palette-outline' });
  if (batch.condition) specs.push({ label: t('vehicleDetail.condition', language), value: batch.condition, icon: 'shield-checkmark-outline' });

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: '#000' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <ThemedText style={styles.headerFlag}>{sourceFlag}</ThemedText>
            <ThemedText style={[styles.headerTitle, { color: '#FFF' }]} numberOfLines={1}>
              {batch.title}
            </ThemedText>
          </View>
          <ThemedText style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>
            {batch.year} {batch.make} {batch.model}
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Sold Out Banner */}
      {isSoldOut && (
        <View style={[styles.statusBanner, { backgroundColor: '#EF4444' }]}>
          <ThemedText style={styles.statusBannerText}>{t('batches.batchSoldOut', language)}</ThemedText>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Quick Specs Row */}
        <View style={[styles.specsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>
              {batch.year}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>
              {batch.fuel_type || 'N/A'}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>
              {batch.transmission || 'Auto'}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>
              {sourceFlag} {sourceLabel}
            </ThemedText>
          </View>
        </View>

        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            ref={imageScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {displayImages.map((img, index) => (
              <View key={index} style={styles.mainImageWrapper}>
                <Image
                  source={{ uri: img }}
                  style={styles.mainImage}
                  contentFit="cover"
                  transition={200}
                  placeholder={{ uri: PLACEHOLDER_IMAGE }}
                />
              </View>
            ))}
          </ScrollView>

          {/* Navigation Arrows */}
          {displayImages.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={() => scrollToImage(Math.max(0, currentImageIndex - 1))}
                disabled={currentImageIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color={currentImageIndex === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={() => scrollToImage(Math.min(displayImages.length - 1, currentImageIndex + 1))}
                disabled={currentImageIndex === displayImages.length - 1}
              >
                <Ionicons name="chevron-forward" size={24} color={currentImageIndex === displayImages.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
              </TouchableOpacity>
            </>
          )}

          {/* Image Counter */}
          {displayImages.length > 1 && hasImages && (
            <View style={styles.imageCounterOverlay}>
              <ThemedText style={styles.imageCounter}>
                {currentImageIndex + 1} / {displayImages.length}
              </ThemedText>
            </View>
          )}

          {/* Source Badge */}
          <View style={styles.sourceBadge}>
            <ThemedText style={styles.sourceBadgeText}>{sourceFlag} {sourceLabel.toUpperCase()}</ThemedText>
          </View>

          {/* Low Stock Badge */}
          {isLowStock && (
            <View style={styles.lowStockBadge}>
              <ThemedText style={styles.lowStockText}>{t('batches.lowStock', language)}</ThemedText>
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {displayImages.length > 1 && hasImages && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailContainer}>
            {displayImages.map((img, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => scrollToImage(index)}
                style={[
                  styles.thumbnail,
                  { borderColor: currentImageIndex === index ? AppTheme.orange : colors.border },
                ]}
              >
                <Image source={{ uri: img }} style={styles.thumbnailImage} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Pricing Section */}
        <View style={[styles.pricingSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.pricingRow}>
            <View style={styles.pricingItem}>
              <ThemedText variant="muted" size="xs">{t('batches.unitPrice', language)}</ThemedText>
              <ThemedText style={styles.priceMain}>{formatPrice(batch.price_per_unit_usd)}</ThemedText>
            </View>
            <View style={[styles.pricingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.pricingItem}>
              <ThemedText variant="muted" size="xs">{t('batches.availableQty', language)}</ThemedText>
              <ThemedText style={[styles.priceMain, { color: batch.available_quantity > 10 ? '#22C55E' : '#EF4444' }]}>
                {batch.available_quantity}
              </ThemedText>
              <ThemedText variant="muted" size="xs">{t('batches.ofTotal', language)} {batch.total_quantity} {t('batches.units', language)}</ThemedText>
            </View>
            <View style={[styles.pricingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.pricingItem}>
              <ThemedText variant="muted" size="xs">{t('batches.minOrder', language)}</ThemedText>
              <ThemedText style={[styles.priceMain, { color: colors.textPrimary }]}>
                {batch.minimum_order_quantity}
              </ThemedText>
              <ThemedText variant="muted" size="xs">{t('batches.units', language)}</ThemedText>
            </View>
          </View>
        </View>

        {/* Description */}
        {batch.description && (
          <View style={[styles.descriptionSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="md" style={styles.sectionLabel}>{t('vehicleDetail.description', language)}</ThemedText>
            <ThemedText style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {batch.description}
            </ThemedText>
          </View>
        )}

        {/* Specifications */}
        {specs.length > 0 && (
          <View style={[styles.specsSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="md" style={styles.sectionLabel}>{t('vehicleDetail.specs', language)}</ThemedText>
            <View style={styles.specsGrid}>
              {specs.map((spec, index) => (
                <View key={index} style={[styles.specCard, { backgroundColor: colors.surface }]}>
                  <Ionicons name={spec.icon} size={18} color={AppTheme.orange} />
                  <ThemedText variant="muted" size="xs" style={{ marginTop: 4 }}>{spec.label}</ThemedText>
                  <ThemedText style={styles.specValue}>{spec.value}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Batch Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText variant="title" size="md" style={styles.sectionLabel}>{t('batches.batchInfo', language)}</ThemedText>
          <View style={styles.infoRow}>
            <ThemedText variant="muted">{t('batches.vehicle', language)}</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{batch.year} {batch.make} {batch.model}</ThemedText>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <ThemedText variant="muted">{t('batches.origin', language)}</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{sourceFlag} {sourceLabel}</ThemedText>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <ThemedText variant="muted">{t('batches.totalQuantity', language)}</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{batch.total_quantity} {t('batches.units', language)}</ThemedText>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <ThemedText variant="muted">{t('batches.totalPrice', language)}</ThemedText>
            <ThemedText style={{ fontWeight: '700', color: AppTheme.orange }}>
              {formatPrice(batch.price_per_unit_usd * batch.minimum_order_quantity)}
            </ThemedText>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.orderBtn, isSoldOut && styles.disabledBtn]}
            onPress={handleRequestQuote}
            disabled={isSoldOut}
          >
            <Ionicons name="calculator-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={styles.orderBtnText}>
              {isSoldOut ? t('batches.soldOut', language) : t('quotes.estimateFees', language)}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.questionBtn, { borderColor: AppTheme.orange }]}
            onPress={handleAskQuestion}
          >
            <Ionicons name="chatbubble-outline" size={18} color={AppTheme.orange} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Modal */}
      <BatchOrderModal
        visible={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        batch={batch}
        onSuccess={() => refetch()}
      />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerFlag: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  shareBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status Banner
  statusBanner: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Specs Row
  specsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  specBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  specText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Image Gallery
  imageGallery: {
    position: 'relative',
  },
  mainImageWrapper: {
    width: width,
    height: width * 0.65,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  imageCounterOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounter: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sourceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: AppTheme.orange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lowStockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Thumbnails
  thumbnailContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 45,
    borderRadius: 6,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },

  // Pricing
  pricingSection: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricingItem: {
    flex: 1,
    alignItems: 'center',
  },
  pricingDivider: {
    width: 1,
    height: 40,
  },
  priceMain: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.orange,
    marginVertical: 4,
  },

  // Description
  descriptionSection: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Specs Grid
  specsSection: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specCard: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  // Info Section
  infoSection: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
  },

  // Bottom
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  orderBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppTheme.orange,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  questionBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
