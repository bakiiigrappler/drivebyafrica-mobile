import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, StatusBar, Share, Alert, Linking } from 'react-native';
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
import { QuoteEstimationModal } from '@/components/vehicles/QuoteEstimationModal';
import { useVehicle, useFavorites, useCurrency } from '@/hooks';
import { useAuthStore, useSettingsStore } from '@/store';
import { t, type Language } from '@/lib/i18n';
import { getExportTax } from '@/lib/pricing';
import { parseImagesField, getFirstValidImage, PLACEHOLDER_IMAGE } from '@/lib/images';

// Status styles like in web version
const getStatusStyles = (lang: Language): Record<string, { bg: string; label: string }> => ({
  available: { bg: '#22C55E', label: t('vehicleDetail.statusAvailable', lang) },
  reserved: { bg: AppTheme.orange, label: t('vehicleDetail.statusReserved', lang) },
  sold: { bg: '#EF4444', label: t('vehicleDetail.statusSold', lang) },
  pending: { bg: '#3B82F6', label: t('vehicleDetail.statusPending', lang) },
});

// Source flags like in web version
const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 32 - 24) / 4;

type DetailTab = 'documents' | 'engine' | 'exterior';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { formatVehiclePrice, getVehiclePriceUsd, formatPrice, getExportTaxAmount, currency } = useCurrency();

  const { data: vehicle, isLoading, error } = useVehicle(id);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<DetailTab>('documents');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const imageScrollRef = useRef<ScrollView>(null);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppTheme.orange} />
      </ThemedView>
    );
  }

  if (error || !vehicle) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <ThemedText variant="title" size="lg" style={{ marginTop: 16 }}>
          {t('vehicleDetail.notFound', language)}
        </ThemedText>
        <Button title={t('vehicleDetail.back', language)} variant="outline" onPress={() => router.back()} style={{ marginTop: 24 }} />
      </ThemedView>
    );
  }

  const allImages = parseImagesField(vehicle.images);
  const hasImages = allImages.length > 0;

  // Price calculation with export tax (like web)
  const basePrice = vehicle.start_price_usd ?? vehicle.buy_now_price_usd ?? vehicle.current_price_usd;
  const hasPrice = basePrice != null && basePrice > 0;
  const exportTax = getExportTax(vehicle.source || '');
  const hasExportTax = exportTax > 0;
  const effectivePriceUsd = hasPrice ? getVehiclePriceUsd(basePrice, vehicle.source || '') : 0;
  const formattedPrice = hasPrice ? formatVehiclePrice(basePrice, vehicle.source || '') : '';
  const isVehicleFavorite = isFavorite(vehicle.id);

  // Source flag
  const sourceFlag = SOURCE_FLAGS[vehicle.source || ''] || '🌍';

  // Vehicle status
  const vehicleStatus = (vehicle.status || 'available') as string;
  const STATUS_STYLES = getStatusStyles(language);
  const statusStyle = STATUS_STYLES[vehicleStatus] || STATUS_STYLES.available;
  const isReserved = vehicleStatus === 'reserved';
  const isSold = vehicleStatus === 'sold';

  // Share function like in web version
  const handleShare = async () => {
    try {
      await Share.share({
        title: `${vehicle.make} ${vehicle.model}`,
        message: `${t('vehicleDetail.shareMessage', language)} ${vehicle.make} ${vehicle.model} ${vehicle.year} ${t('vehicleDetail.shareOn', language)}\n\nhttps://driveby-africa.com/cars/${vehicle.id}`,
      });
    } catch (error) {
      Alert.alert(t('vehicleDetail.error', language), t('vehicleDetail.shareError', language));
    }
  };

  // Ask question function
  const handleAskQuestion = () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    // Navigate to messages with vehicle context
    Alert.alert(
      t('vehicleDetail.askQuestion', language),
      `${t('vehicleDetail.askQuestionMsg', language)} ${vehicle.make} ${vehicle.model} ?`,
      [
        { text: t('vehicleDetail.cancel', language), style: 'cancel' },
        { text: t('vehicleDetail.continue', language), onPress: () => router.push('/(tabs)/profile') }
      ]
    );
  };

  // All images for the gallery (with placeholder fallback)
  const displayImages = hasImages ? allImages : [PLACEHOLDER_IMAGE];

  const imageLabels = [
    t('vehicleDetail.imageLabels.frontRight', language), t('vehicleDetail.imageLabels.frontView', language), t('vehicleDetail.imageLabels.frontLeft', language), t('vehicleDetail.imageLabels.leftSide', language),
    t('vehicleDetail.imageLabels.rearLeft', language), t('vehicleDetail.imageLabels.rearView', language), t('vehicleDetail.imageLabels.rearRight', language), t('vehicleDetail.imageLabels.rightSide', language),
    t('vehicleDetail.imageLabels.engineBay', language), t('vehicleDetail.imageLabels.frontInterior', language), t('vehicleDetail.imageLabels.rearInterior', language), t('vehicleDetail.imageLabels.dashboard', language)
  ];

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

  const sourceLabel = `${sourceFlag} ${vehicle.source === 'korea' ? t('countries.korea', language) : vehicle.source === 'china' ? t('countries.china', language) : t('countries.dubai', language)}`;

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
              {vehicle.year} {vehicle.make} {vehicle.model}
            </ThemedText>
          </View>
          <ThemedText style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>
            {vehicle.grade && `${vehicle.grade} • `}{vehicle.engine_cc ? `${(vehicle.engine_cc / 1000).toFixed(1)}L • ` : ''}{vehicle.transmission || 'Auto'}
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.favoriteBtn} onPress={() => toggleFavorite(vehicle.id)}>
            <Ionicons
              name={isVehicleFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isVehicleFavorite ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Badge */}
      {vehicleStatus !== 'available' && (
        <View style={[styles.statusBanner, { backgroundColor: statusStyle.bg }]}>
          <ThemedText style={styles.statusBannerText}>
            {isReserved ? t('vehicleDetail.reserved', language) : isSold ? t('vehicleDetail.sold', language) : statusStyle.label}
          </ThemedText>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Specs Row */}
        <View style={[styles.specsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>
              {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} KM` : '-'}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>{t('vehicleDetail.firstOwner', language)}</ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>
              {vehicle.fuel_type || 'Diesel'}
            </ThemedText>
          </View>
          <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
            <ThemedText style={[styles.specText, { color: colors.textPrimary }]}>{sourceLabel}</ThemedText>
          </View>
        </View>

        {/* Main Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            ref={imageScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {displayImages.length > 0 ? (
              displayImages.map((img, index) => (
                <View key={index} style={styles.mainImageWrapper}>
                  <Image source={{ uri: img }} style={styles.mainImage} contentFit="cover" transition={200} />
                </View>
              ))
            ) : (
              <View style={[styles.mainImageWrapper, styles.noImage, { backgroundColor: colors.surface }]}>
                <Ionicons name="image-outline" size={64} color={colors.textMuted} />
              </View>
            )}
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

          {/* Image Label & Counter Overlay */}
          <View style={styles.imageLabelOverlay}>
            <ThemedText style={styles.imageLabel}>
              {imageLabels[currentImageIndex % imageLabels.length] || t('vehicleDetail.vehicleView', language)}
            </ThemedText>
            <ThemedText style={styles.imageCounter}>
              {currentImageIndex + 1}/{displayImages.length || 1}
            </ThemedText>
          </View>
        </View>

        {/* Thumbnails - Scrollable */}
        {displayImages.length > 1 && (
          <View style={[styles.thumbnailSection, { backgroundColor: colors.background }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailScroll}
            >
              {displayImages.map((img, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => scrollToImage(index)}
                  style={[styles.thumbnail, currentImageIndex === index && styles.thumbnailActive]}
                >
                  <Image source={{ uri: img }} style={styles.thumbnailImage} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Price Card */}
        <View style={styles.priceCard}>
          <View style={styles.priceCardTop}>
            <View>
              <ThemedText style={styles.priceLabel}>
                {t('vehicleDetail.fobPrice', language)}{hasExportTax ? ' *' : ''}
              </ThemedText>
              {hasPrice ? (
                <ThemedText style={styles.priceValue}>
                  {formattedPrice}
                </ThemedText>
              ) : (
                <ThemedText style={styles.priceValue}>{t('vehicleDetail.onRequest', language)}</ThemedText>
              )}
            </View>
            {hasPrice && (
              <TouchableOpacity style={styles.bidRecordBtn}>
                <ThemedText style={styles.bidRecordText}>{t('vehicleDetail.details', language)}</ThemedText>
              </TouchableOpacity>
            )}
          </View>
          {hasPrice && (
            <View style={styles.fairValueRow}>
              <ThemedText style={styles.fairValueText}>
                ≈ ${effectivePriceUsd.toLocaleString()} USD
                {hasExportTax ? ` (${t('currency.exportTaxChina', language)})` : ''}
              </ThemedText>
            </View>
          )}
          {!hasPrice && vehicle.source === 'dubai' && (
            <View style={styles.fairValueRow}>
              <ThemedText style={styles.fairValueText}>
                {t('vehicleDetail.contactForPrice', language)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Source URL Link (Auction Sheet) */}
        {vehicle.source_url && (
          <TouchableOpacity
            style={[styles.auctionSheetRow, { backgroundColor: colors.surface }]}
            onPress={() => Linking.openURL(vehicle.source_url!)}
          >
            <Ionicons name="document-text-outline" size={20} color={AppTheme.orange} />
            <ThemedText style={[styles.auctionSheetText, { color: colors.textPrimary }]}>
              {t('vehicleDetail.inspectionSheet', language)}
            </ThemedText>
            <Ionicons name="open-outline" size={18} color={AppTheme.orange} />
          </TouchableOpacity>
        )}

        {/* Modern Detail Tabs */}
        <View style={styles.detailSection}>
          <ThemedText style={[styles.detailSectionTitle, { color: colors.textPrimary }]}>
            {t('vehicleDetail.specs', language)}
          </ThemedText>

          {/* Pill Tabs */}
          <View style={[styles.pillTabs, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f3f4f6' }]}>
            <TouchableOpacity
              style={[
                styles.pillTab,
                activeTab === 'documents' && styles.pillTabActive
              ]}
              onPress={() => setActiveTab('documents')}
            >
              <Ionicons
                name="document-text"
                size={16}
                color={activeTab === 'documents' ? '#fff' : colors.textMuted}
              />
              <ThemedText style={[
                styles.pillTabText,
                activeTab === 'documents' && styles.pillTabTextActive
              ]}>
                {t('vehicleDetail.tabInfo', language)}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pillTab,
                activeTab === 'engine' && styles.pillTabActive
              ]}
              onPress={() => setActiveTab('engine')}
            >
              <Ionicons
                name="speedometer"
                size={16}
                color={activeTab === 'engine' ? '#fff' : colors.textMuted}
              />
              <ThemedText style={[
                styles.pillTabText,
                activeTab === 'engine' && styles.pillTabTextActive
              ]}>
                {t('vehicleDetail.tabEngine', language)}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pillTab,
                activeTab === 'exterior' && styles.pillTabActive
              ]}
              onPress={() => setActiveTab('exterior')}
            >
              <Ionicons
                name="car-sport"
                size={16}
                color={activeTab === 'exterior' ? '#fff' : colors.textMuted}
              />
              <ThemedText style={[
                styles.pillTabText,
                activeTab === 'exterior' && styles.pillTabTextActive
              ]}>
                {t('vehicleDetail.tabBody', language)}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Modern Card Content */}
          <View style={styles.detailCards}>
            {activeTab === 'documents' && (
              <View style={styles.cardGrid}>
                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: AppTheme.orange + '15' }]}>
                    <Ionicons name="barcode-outline" size={22} color={AppTheme.orange} />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.lotNumber', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]} numberOfLines={1}>
                    {vehicle.lot_number || 'N/A'}
                  </ThemedText>
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                    <Ionicons name="globe-outline" size={22} color="#3B82F6" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.origin', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {sourceFlag} {vehicle.source === 'korea' ? t('countries.korea', language) : vehicle.source === 'china' ? t('countries.china', language) : t('countries.dubai', language)}
                  </ThemedText>
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#22C55E' + '15' }]}>
                    <Ionicons name="calendar-outline" size={22} color="#22C55E" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.year', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.year || 'N/A'}
                  </ThemedText>
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                    <Ionicons name="star-outline" size={22} color="#8B5CF6" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.grade', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.grade || 'Standard'}
                  </ThemedText>
                </View>
              </View>
            )}

            {activeTab === 'engine' && (
              <View style={styles.cardGrid}>
                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#EF4444' + '15' }]}>
                    <Ionicons name="speedometer-outline" size={22} color="#EF4444" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.displacement', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.engine_cc ? `${(vehicle.engine_cc / 1000).toFixed(1)}L` : 'N/A'}
                  </ThemedText>
                  {vehicle.engine_cc && (
                    <ThemedText style={[styles.specCardSub, { color: colors.textMuted }]}>
                      {vehicle.engine_cc} cc
                    </ThemedText>
                  )}
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                    <Ionicons name="flame-outline" size={22} color="#F59E0B" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.fuel', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.fuel_type || 'N/A'}
                  </ThemedText>
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#06B6D4' + '15' }]}>
                    <Ionicons name="cog-outline" size={22} color="#06B6D4" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.transmission', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.transmission || 'Auto'}
                  </ThemedText>
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#10B981' + '15' }]}>
                    <Ionicons name="leaf-outline" size={22} color="#10B981" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.energy', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.fuel_type === 'Hybrid' ? t('vehicleDetail.hybrid', language) : vehicle.fuel_type === 'Electric' ? t('vehicleDetail.electric', language) : t('vehicleDetail.thermal', language)}
                  </ThemedText>
                </View>
              </View>
            )}

            {activeTab === 'exterior' && (
              <View style={styles.cardGrid}>
                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#EC4899' + '15' }]}>
                    <Ionicons name="color-palette-outline" size={22} color="#EC4899" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.color', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.color || 'N/A'}
                  </ThemedText>
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#6366F1' + '15' }]}>
                    <Ionicons name="car-outline" size={22} color="#6366F1" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.bodyType', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.body_type || 'N/A'}
                  </ThemedText>
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#14B8A6' + '15' }]}>
                    <Ionicons name="analytics-outline" size={22} color="#14B8A6" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.mileage', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {vehicle.mileage ? `${vehicle.mileage.toLocaleString()}` : 'N/A'}
                  </ThemedText>
                  {vehicle.mileage && (
                    <ThemedText style={[styles.specCardSub, { color: colors.textMuted }]}>
                      {t('vehicleDetail.kilometers', language)}
                    </ThemedText>
                  )}
                </View>

                <View style={[styles.specCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff', borderColor: colors.border }]}>
                  <View style={[styles.specCardIcon, { backgroundColor: '#F97316' + '15' }]}>
                    <Ionicons name="person-outline" size={22} color="#F97316" />
                  </View>
                  <ThemedText style={[styles.specCardLabel, { color: colors.textMuted }]}>{t('vehicleDetail.owner', language)}</ThemedText>
                  <ThemedText style={[styles.specCardValue, { color: colors.textPrimary }]}>
                    {t('vehicleDetail.firstOwner', language)}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Bottom spacer for fixed buttons */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Fixed Bottom Section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {/* Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.requestQuoteBtn, isSold && styles.disabledBtn]}
            onPress={() => setShowQuoteModal(true)}
            disabled={isSold}
          >
            <Ionicons name="calculator-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={styles.requestQuoteText}>
              {isSold ? t('vehicleDetail.soldButton', language) : isReserved ? t('vehicleDetail.reservedButton', language) : t('vehicleDetail.estimateFees', language)}
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

      {/* Quote Estimation Modal */}
      <QuoteEstimationModal
        visible={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        vehicle={vehicle}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerFlag: {
    fontSize: 18,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    padding: 4,
  },
  favoriteBtn: {
    padding: 4,
  },
  statusBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Specs Row
  specsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  specBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  specText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Image Gallery
  imageGallery: {
    position: 'relative',
  },
  mainImageWrapper: {
    width: width,
    height: 240,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  imageLabel: {
    color: '#fff',
    fontSize: 12,
    fontStyle: 'italic',
  },
  imageCounter: {
    color: '#fff',
    fontSize: 12,
  },
  // Navigation Arrows
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  // Thumbnail Section
  thumbnailSection: {
    paddingVertical: 8,
  },
  thumbnailScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: AppTheme.orange,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  // Price Card
  priceCard: {
    backgroundColor: AppTheme.orange,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
  },
  priceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  priceValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  bidRecordBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bidRecordText: {
    color: AppTheme.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  fairValueRow: {
    marginTop: 12,
  },
  fairValueText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  auctionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  auctionSheetText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  // Modern Detail Section
  detailSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  // Pill Tabs
  pillTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  pillTabActive: {
    backgroundColor: AppTheme.orange,
  },
  pillTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  pillTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Detail Cards
  detailCards: {
    marginBottom: 8,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specCard: {
    width: (width - 32 - 12) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  specCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  specCardLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  specCardValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  specCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  requestQuoteBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AppTheme.orange,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestQuoteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  questionBtn: {
    width: 52,
    borderWidth: 2,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
});
