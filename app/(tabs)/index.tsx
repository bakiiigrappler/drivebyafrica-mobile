import { ScrollView, StyleSheet, View, FlatList, Dimensions, ActivityIndicator, Animated, Pressable, Easing } from 'react-native';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useVehicles, useFavorites } from '@/hooks';
import { useAuthStore, useFilterStore, useSettingsStore, useCartStore } from '@/store';
import { t } from '@/lib/i18n';
import { getFirstValidImage, PLACEHOLDER_IMAGE } from '@/lib/images';
import type { Vehicle } from '@/types';

// Animated Pressable component with scale effect
const AnimatedPressable = ({ children, style, onPress, scaleValue = 0.97 }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.52;
const CARD_IMAGE_HEIGHT = 140;
const HERO_HEIGHT = height * 0.48;

// Features data
const getFeatures = (lang: string) => [
  { icon: 'car-sport', title: lang === 'zh' ? '认证车辆' : lang === 'en' ? 'Verified Vehicles' : 'Véhicules Vérifiés', description: lang === 'zh' ? '出口前全面检查' : lang === 'en' ? 'Full inspection before export' : 'Inspection complète avant export', color: AppTheme.orange },
  { icon: 'shield-checkmark', title: lang === 'zh' ? '安全支付' : lang === 'en' ? 'Secure Payment' : 'Paiement Sécurisé', description: lang === 'zh' ? '100%安全交易' : lang === 'en' ? '100% protected transactions' : 'Transactions 100% protégées', color: '#3B82F6' },
  { icon: 'boat', title: lang === 'zh' ? '全球配送' : lang === 'en' ? 'Worldwide Delivery' : 'Livraison Mondiale', description: lang === 'zh' ? '运送至非洲' : lang === 'en' ? 'Shipping to Africa' : 'Expédition vers l\'Afrique', color: '#22C55E' },
  { icon: 'headset', title: lang === 'zh' ? '24/7支持' : lang === 'en' ? 'Support 24/7' : 'Support 24/7', description: lang === 'zh' ? '中文客服' : lang === 'en' ? 'English assistance' : 'Assistance en français', color: '#8B5CF6' },
];

// How it works steps
const getSteps = (lang: string) => [
  { num: '01', title: lang === 'zh' ? '选择' : lang === 'en' ? 'Choose' : 'Choisissez', desc: lang === 'zh' ? '浏览我们的目录，找到您理想的车辆。' : lang === 'en' ? 'Browse our catalog and find your ideal vehicle.' : 'Parcourez notre catalogue et trouvez votre véhicule idéal.', icon: 'search' },
  { num: '02', title: lang === 'zh' ? '估价' : lang === 'en' ? 'Estimate' : 'Estimez', desc: lang === 'zh' ? '获取包含所有费用的免费报价。' : lang === 'en' ? 'Get a free quote including all fees.' : 'Obtenez un devis gratuit incluant tous les frais.', icon: 'calculator' },
  { num: '03', title: lang === 'zh' ? '预订' : lang === 'en' ? 'Reserve' : 'Réservez', desc: lang === 'zh' ? '支付可退还押金锁定您的车辆。' : lang === 'en' ? 'Secure your vehicle with a refundable deposit.' : 'Sécurisez votre véhicule avec un dépôt remboursable.', icon: 'card' },
  { num: '04', title: lang === 'zh' ? '接收' : lang === 'en' ? 'Receive' : 'Recevez', desc: lang === 'zh' ? '送货上门或港口自提。' : lang === 'en' ? 'Home delivery or port of your choice.' : 'Livraison à domicile ou au port de votre choix.', icon: 'checkmark-circle' },
];

// Source filter options
const getSourceFilters = (lang: string) => [
  { id: 'all', label: lang === 'zh' ? '全部' : lang === 'en' ? 'All' : 'Tous', flag: null },
  { id: 'korea', label: lang === 'zh' ? '韩国' : lang === 'en' ? 'Korea' : 'Corée', flag: '🇰🇷' },
  { id: 'china', label: lang === 'zh' ? '中国' : lang === 'en' ? 'China' : 'Chine', flag: '🇨🇳' },
  { id: 'dubai', label: lang === 'zh' ? '迪拜' : lang === 'en' ? 'Dubai' : 'Dubaï', flag: '🇦🇪' },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filters, setFilters } = useFilterStore();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { language } = useSettingsStore();
  const { user } = useAuthStore();
  const cartItemCount = useCartStore((s) => s.items.length);
  const [activeSource, setActiveSource] = useState<'all' | 'korea' | 'china' | 'dubai'>(filters.source || 'all');
  const videoPlayer = useVideoPlayer(require('@/assets/videos/hero-video.mp4'), (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSourceChange = (source: 'all' | 'korea' | 'china' | 'dubai') => {
    setActiveSource(source);
    setFilters({ ...filters, source });
  };

  const { data, isLoading } = useVehicles({ filters });

  const vehicles = useMemo(() => {
    return data?.pages.flatMap((page) => page.data).slice(0, 6) || [];
  }, [data]);

  // Animation for empty state
  const carAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (vehicles.length === 0 && !isLoading) {
      // Car driving animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(carAnimation, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(carAnimation, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation for button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [vehicles.length, isLoading]);

  const handleVehiclePress = (vehicle: Vehicle) => {
    router.push(`/vehicle/${vehicle.id}`);
  };

  const renderVehicleCard = ({ item }: { item: Vehicle }) => {
    const priceUsd = item.current_price_usd || item.start_price_usd || 0;
    const priceFcfa = Math.round(priceUsd * 600);
    const isFavorite = favoriteIds.has(item.id);
    const sourceLabel = item.source === 'korea' ? t('countries.korea', language) : item.source === 'china' ? t('countries.china', language) : t('countries.dubai', language);
    const sourceFlag = item.source === 'korea' ? '🇰🇷' : item.source === 'china' ? '🇨🇳' : '🇦🇪';
    const sourceCode = item.source === 'korea' ? 'KR' : item.source === 'china' ? 'CN' : 'AE';

    return (
      <AnimatedPressable
        style={[styles.vehicleCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        onPress={() => handleVehiclePress(item)}
        scaleValue={0.97}
      >
        {/* Image Container */}
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri: getFirstValidImage(item.images) }}
            style={styles.cardImage}
            contentFit="cover"
            placeholder={{ uri: PLACEHOLDER_IMAGE }}
          />

          {/* Source Badge - Top Left */}
          <View style={styles.cardSourceBadge}>
            <ThemedText style={styles.cardSourceBadgeText}>{sourceFlag} {sourceLabel}</ThemedText>
          </View>

          {/* Favorite Button - Top Right */}
          <AnimatedPressable
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.id)}
            scaleValue={0.85}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#EF4444' : '#9CA3AF'}
            />
          </AnimatedPressable>
        </View>

        {/* Content */}
        <View style={styles.cardInfo}>
          {/* Title */}
          <ThemedText variant="subtitle" numberOfLines={1} style={styles.cardTitle}>
            {item.year} {item.make} {item.model}
          </ThemedText>

          {/* Subtitle - Grade & Transmission */}
          <ThemedText variant="muted" size="xs" numberOfLines={1} style={styles.cardSubtitle}>
            {item.grade || 'Standard'} {item.engine_cc ? `${(item.engine_cc / 1000).toFixed(1)}L` : ''} • {item.transmission || t('vehicleDetail.automatic', language)}
          </ThemedText>

          {/* Specs Row - Small Badges */}
          <View style={styles.specsRow}>
            <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
              <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
                {item.mileage ? `${item.mileage.toLocaleString()} km` : '-'}
              </ThemedText>
            </View>
            <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
              <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
                {t('vehicleDetail.firstOwner', language)}
              </ThemedText>
            </View>
            <View style={[styles.specBadge, { backgroundColor: colors.surface }]}>
              <ThemedText style={[styles.specText, { color: colors.textMuted }]}>
                {item.fuel_type || t('vehicleDetail.petrol', language)}
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
            <ThemedText style={styles.price}>
              {priceUsd > 0 ? `${priceFcfa.toLocaleString()} FCFA` : t('vehicleDetail.onRequest', language)}
            </ThemedText>
            <ThemedText style={[styles.priceLabel, { color: colors.textMuted }]}>
              {t('vehicleDetail.fobPrice', language)}
            </ThemedText>
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Section with Video Background */}
        <View style={styles.heroContainer}>
          <VideoView
            player={videoPlayer}
            style={styles.heroVideo}
            contentFit="cover"
            nativeControls={false}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
            style={styles.heroOverlay}
            locations={[0, 0.4, 1]}
          />

          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Image
              source={require('@/assets/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.headerRight}>
              {/* Cart Icon */}
              <AnimatedPressable
                style={styles.notificationButton}
                onPress={() => router.push('/cart')}
                scaleValue={0.9}
              >
                <Ionicons name="cart-outline" size={22} color={AppTheme.white} />
                {cartItemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <ThemedText style={styles.cartBadgeText}>{cartItemCount}</ThemedText>
                  </View>
                )}
              </AnimatedPressable>
              {/* Notifications */}
              <AnimatedPressable
                style={styles.notificationButton}
                onPress={() => router.push('/notifications')}
                scaleValue={0.9}
              >
                <Ionicons name="notifications-outline" size={22} color={AppTheme.white} />
              </AnimatedPressable>
            </View>
          </View>

          {/* Hero Content */}
          <Animated.View
            style={[
              styles.heroContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            {/* Badge */}
            <View style={styles.heroBadge}>
              <ThemedText style={styles.heroBadgeText}>{language === 'zh' ? '独家销售' : language === 'en' ? 'Exclusive Sales' : 'Ventes Exclusives'}</ThemedText>
            </View>

            <ThemedText style={styles.heroTitle}>
              {language === 'zh' ? '以最优价格' : language === 'en' ? 'Import Your Vehicle' : 'Importez Votre Véhicule'}{'\n'}
              <ThemedText style={[styles.heroTitle, { color: AppTheme.orange }]}>{language === 'zh' ? '进口您的车辆' : language === 'en' ? 'At The Best Price' : 'Au Meilleur Prix'}</ThemedText>
            </ThemedText>

            <ThemedText style={styles.heroSubtitle}>
              {language === 'zh' ? '探索来自韩国、中国和迪拜的认证车辆。获取免费报价。' : language === 'en' ? 'Explore verified vehicles from Korea, China and Dubai. Get a free quote.' : 'Explorez des véhicules vérifiés de Corée, Chine et Dubaï. Obtenez un devis gratuit.'}
            </ThemedText>

            {/* CTA Buttons */}
            <View style={styles.heroButtons}>
              <AnimatedPressable
                style={styles.primaryButton}
                onPress={() => router.push('/(tabs)/live')}
                scaleValue={0.95}
              >
                <LinearGradient
                  colors={[AppTheme.orange, '#FF8C42']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  <ThemedText style={styles.primaryButtonText}>{t('vehicles.title', language)}</ThemedText>
                  <Ionicons name="arrow-forward" size={18} color={AppTheme.white} />
                </LinearGradient>
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.secondaryButton}
                onPress={() => router.push('/batches')}
                scaleValue={0.95}
              >
                <Ionicons name="layers-outline" size={18} color={AppTheme.white} />
                <ThemedText style={styles.secondaryButtonText}>{t('batches.title', language)}</ThemedText>
              </AnimatedPressable>
            </View>

            {/* Source Badges */}
            <View style={styles.sourceBadges}>
              <ThemedText style={styles.sourcesLabel}>{language === 'zh' ? '来源：' : language === 'en' ? 'Sources:' : 'Sources :'}</ThemedText>
              <View style={styles.sourceBadgeRow}>
                <View style={styles.sourceBadgeItem}>
                  <ThemedText style={{ fontSize: 16 }}>🇰🇷</ThemedText>
                  <ThemedText style={styles.sourceBadgeText}>{t('countries.korea', language)}</ThemedText>
                </View>
                <View style={styles.sourceBadgeItem}>
                  <ThemedText style={{ fontSize: 16 }}>🇨🇳</ThemedText>
                  <ThemedText style={styles.sourceBadgeText}>{t('countries.china', language)}</ThemedText>
                </View>
                <View style={styles.sourceBadgeItem}>
                  <ThemedText style={{ fontSize: 16 }}>🇦🇪</ThemedText>
                  <ThemedText style={styles.sourceBadgeText}>{t('countries.dubai', language)}</ThemedText>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Search Bar - Floating */}
        <View style={styles.searchSection}>
          <AnimatedPressable
            style={[styles.searchBar, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={() => router.push('/filter-modal')}
            scaleValue={0.98}
          >
            <View style={styles.searchIcon}>
              <Ionicons name="search" size={20} color={AppTheme.orange} />
            </View>
            <View style={styles.searchContent}>
              <ThemedText variant="subtitle" size="sm">{language === 'zh' ? '快速搜索' : language === 'en' ? 'Quick search' : 'Recherche rapide'}</ThemedText>
              <ThemedText variant="muted" size="xs">{language === 'zh' ? '品牌、型号、年份...' : language === 'en' ? 'Make, model, year...' : 'Marque, modèle, année...'}</ThemedText>
            </View>
            <View style={[styles.filterBadge, { backgroundColor: AppTheme.orange }]}>
              <Ionicons name="options" size={16} color={AppTheme.white} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Source Filters */}
        <View style={styles.sourceFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceFilterScroll}>
            {getSourceFilters(language).map((source) => (
              <AnimatedPressable
                key={source.id}
                style={[
                  styles.sourceChip,
                  {
                    backgroundColor: activeSource === source.id ? AppTheme.orange : colors.cardBg,
                    borderColor: activeSource === source.id ? AppTheme.orange : colors.cardBorder,
                  }
                ]}
                onPress={() => handleSourceChange(source.id as 'all' | 'korea' | 'china' | 'dubai')}
                scaleValue={0.95}
              >
                {source.flag && <ThemedText style={{ marginRight: 6 }}>{source.flag}</ThemedText>}
                <ThemedText
                  size="sm"
                  style={{
                    color: activeSource === source.id ? AppTheme.white : colors.textPrimary,
                    fontWeight: activeSource === source.id ? '600' : '400',
                  }}
                >
                  {source.label}
                </ThemedText>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </View>

        {/* Featured Vehicles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText variant="title" size="lg">
                {language === 'zh' ? '精选' : language === 'en' ? 'Featured' : 'Véhicules'} <ThemedText style={{ color: AppTheme.orange }}>{language === 'zh' ? '车辆' : language === 'en' ? 'Vehicles' : 'Vedettes'}</ThemedText>
              </ThemedText>
              <ThemedText variant="muted" size="sm">{language === 'zh' ? '本周最受欢迎' : language === 'en' ? 'Most popular this week' : 'Les plus populaires cette semaine'}</ThemedText>
            </View>
            <AnimatedPressable
              style={[styles.viewAllButton, { borderColor: AppTheme.orange }]}
              onPress={() => router.push('/(tabs)/live')}
              scaleValue={0.95}
            >
              <ThemedText size="sm" style={{ color: AppTheme.orange }}>{t('home.viewAll', language)}</ThemedText>
              <Ionicons name="arrow-forward" size={14} color={AppTheme.orange} />
            </AnimatedPressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={AppTheme.orange} />
            </View>
          ) : vehicles.length === 0 ? (
            <View style={styles.emptyVehiclesContainer}>
              {/* Road with animated car */}
              <View style={styles.emptyRoadContainer}>
                {/* Road */}
                <View style={styles.emptyRoad}>
                  <View style={styles.emptyRoadLine} />
                </View>

                {/* Animated Car */}
                <Animated.View style={[styles.emptyCarContainer, { transform: [{ translateX: carAnimation.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) }] }]}>
                  <View style={styles.emptyCarBody}>
                    <Ionicons name="car-sport" size={48} color={AppTheme.orange} />
                  </View>
                  {/* Wheels */}
                  <Animated.View style={[styles.emptyWheel, styles.emptyWheelLeft, { transform: [{ rotate: carAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                    <View style={styles.emptyWheelInner} />
                  </Animated.View>
                  <Animated.View style={[styles.emptyWheel, styles.emptyWheelRight, { transform: [{ rotate: carAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                    <View style={styles.emptyWheelInner} />
                  </Animated.View>
                </Animated.View>

                {/* Dust particles */}
                <Animated.View style={[styles.emptyDust, { opacity: carAnimation }]} />
              </View>

              {/* Icon circle */}
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                <Ionicons name="search" size={32} color={AppTheme.orange} />
              </View>

              {/* Text content */}
              <ThemedText variant="subtitle" style={styles.emptyTitle}>
                {t('vehicles.noResults', language)}
              </ThemedText>
              <ThemedText variant="muted" size="sm" style={styles.emptySubtitle}>
                {t('vehicles.noResultsDesc', language)}
              </ThemedText>

              {/* Reset button with pulse animation */}
              <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
                <AnimatedPressable
                  style={styles.emptyResetButton}
                  onPress={() => {
                    setActiveSource('all');
                    setFilters({ source: 'all' });
                  }}
                  scaleValue={0.95}
                >
                  <Ionicons name="refresh" size={18} color={AppTheme.white} />
                  <ThemedText style={styles.emptyResetButtonText}>{language === 'zh' ? '重置' : language === 'en' ? 'Reset' : 'Réinitialiser'}</ThemedText>
                </AnimatedPressable>
              </Animated.View>

              {/* Source hints */}
              <View style={styles.emptySourceHints}>
                <ThemedText variant="muted" size="xs" style={{ marginBottom: 8 }}>
                  {language === 'zh' ? '尝试其他来源：' : language === 'en' ? 'Try another source:' : 'Essayez une autre source :'}
                </ThemedText>
                <View style={styles.emptySourceButtons}>
                  <AnimatedPressable
                    style={[styles.emptySourceButton, activeSource === 'korea' && styles.emptySourceButtonActive]}
                    onPress={() => handleSourceChange('korea')}
                    scaleValue={0.9}
                  >
                    <ThemedText style={{ fontSize: 16 }}>🇰🇷</ThemedText>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[styles.emptySourceButton, activeSource === 'china' && styles.emptySourceButtonActive]}
                    onPress={() => handleSourceChange('china')}
                    scaleValue={0.9}
                  >
                    <ThemedText style={{ fontSize: 16 }}>🇨🇳</ThemedText>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[styles.emptySourceButton, activeSource === 'dubai' && styles.emptySourceButtonActive]}
                    onPress={() => handleSourceChange('dubai')}
                    scaleValue={0.9}
                  >
                    <ThemedText style={{ fontSize: 16 }}>🇦🇪</ThemedText>
                  </AnimatedPressable>
                </View>
              </View>
            </View>
          ) : (
            <FlatList
              data={vehicles}
              renderItem={renderVehicleCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={CARD_WIDTH + 12}
              decelerationRate="fast"
            />
          )}
        </View>

        {/* How It Works Section */}
        <View style={[styles.howItWorksSection, { backgroundColor: colors.surface }]}>
          <View style={styles.howItWorksHeader}>
            <ThemedText variant="title" size="lg">
              {language === 'zh' ? '如何' : language === 'en' ? 'How it' : 'Comment'} <ThemedText style={{ color: AppTheme.orange }}>{language === 'zh' ? '运作' : language === 'en' ? 'works' : 'ça marche'}</ThemedText>
            </ThemedText>
            <ThemedText variant="muted" size="sm" style={{ marginTop: 4 }}>
              {language === 'zh' ? '4个简单步骤完成进口' : language === 'en' ? '4 simple steps to import' : '4 étapes simples pour importer'}
            </ThemedText>
          </View>

          <View style={styles.stepsContainer}>
            {getSteps(language).map((step, index) => (
              <AnimatedPressable
                key={index}
                style={[styles.stepCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                scaleValue={0.96}
              >
                {/* Step number */}
                <ThemedText style={styles.stepNum}>{step.num}</ThemedText>
                <View style={[styles.stepIconContainer, { backgroundColor: AppTheme.orange }]}>
                  <Ionicons name={step.icon as any} size={24} color={AppTheme.white} />
                </View>
                <ThemedText variant="subtitle" size="sm" style={styles.stepTitle}>
                  {step.title}
                </ThemedText>
                <ThemedText variant="muted" size="xs" style={styles.stepDesc}>
                  {step.desc}
                </ThemedText>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText variant="title" size="lg">
                {language === 'zh' ? '为什么选择' : language === 'en' ? 'Why' : 'Pourquoi'} <ThemedText style={{ color: AppTheme.orange }}>Driveby</ThemedText>
              </ThemedText>
              <ThemedText variant="muted" size="sm">{language === 'zh' ? '我们的专属优势' : language === 'en' ? 'Our exclusive advantages' : 'Nos avantages exclusifs'}</ThemedText>
            </View>
          </View>

          <View style={styles.featuresGrid}>
            {getFeatures(language).map((feature, index) => (
              <AnimatedPressable
                key={index}
                style={[styles.featureCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                scaleValue={0.98}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                  <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText variant="subtitle" size="sm">{feature.title}</ThemedText>
                  <ThemedText variant="muted" size="xs">{feature.description}</ThemedText>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* CTA Banner */}
        <View style={styles.ctaBanner}>
          <LinearGradient
            colors={[AppTheme.orange, '#FF8C42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaContent}>
              <ThemedText style={styles.ctaTitle}>{language === 'zh' ? '准备好进口了吗？' : language === 'en' ? 'Ready to import?' : 'Prêt à importer ?'}</ThemedText>
              <ThemedText style={styles.ctaSubtitle}>
                {language === 'zh' ? '创建账户并访问所有功能' : language === 'en' ? 'Create your account and access all features' : 'Créez votre compte et accédez à toutes les fonctionnalités'}
              </ThemedText>
              <View style={styles.ctaButtons}>
                {!user && (
                  <AnimatedPressable
                    style={styles.ctaButtonPrimary}
                    onPress={() => router.push('/(auth)/register')}
                    scaleValue={0.95}
                  >
                    <ThemedText style={styles.ctaButtonPrimaryText}>{language === 'zh' ? '注册' : language === 'en' ? 'Sign up' : 'S\'inscrire'}</ThemedText>
                  </AnimatedPressable>
                )}
                <AnimatedPressable
                  style={styles.ctaButtonSecondary}
                  onPress={() => router.push('/(tabs)/live')}
                  scaleValue={0.95}
                >
                  <ThemedText style={styles.ctaButtonSecondaryText}>{language === 'zh' ? '浏览' : language === 'en' ? 'Browse' : 'Parcourir'}</ThemedText>
                </AnimatedPressable>
              </View>
            </View>
            {/* Decorative circles */}
            <View style={styles.ctaCircle1} />
            <View style={styles.ctaCircle2} />
          </LinearGradient>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  logo: {
    width: 120,
    height: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: AppTheme.orange,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: AppTheme.orange + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.orange + '50',
    marginBottom: 12,
  },
  heroBadgeText: {
    color: AppTheme.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    color: AppTheme.white,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  heroButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  primaryButtonText: {
    color: AppTheme.white,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  secondaryButtonText: {
    color: AppTheme.white,
    fontWeight: '600',
    fontSize: 14,
  },
  sourceBadges: {
    marginTop: 16,
    marginBottom: 24,
  },
  sourcesLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 8,
  },
  sourceBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  sourceBadgeText: {
    color: AppTheme.white,
    fontSize: 12,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginTop: -28,
    zIndex: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AppTheme.orange + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContent: {
    flex: 1,
    marginLeft: 12,
  },
  filterBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceFilters: {
    marginTop: 16,
  },
  sourceFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  horizontalList: {
    gap: 12,
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardImageContainer: {
    height: CARD_IMAGE_HEIGHT,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSourceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: AppTheme.navy,
  },
  cardSourceBadgeText: {
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  cardSubtitle: {
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
  howItWorksSection: {
    marginTop: 24,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  howItWorksHeader: {
    marginBottom: 20,
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stepCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  stepNum: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 32,
    fontWeight: '800',
    color: AppTheme.orange + '20',
  },
  stepIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  stepDesc: {
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    marginLeft: 14,
  },
  ctaBanner: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: 24,
    position: 'relative',
  },
  ctaContent: {
    position: 'relative',
    zIndex: 2,
  },
  ctaTitle: {
    color: AppTheme.white,
    fontSize: 24,
    fontWeight: '800',
  },
  ctaSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 8,
  },
  ctaButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  ctaButtonPrimary: {
    backgroundColor: AppTheme.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  ctaButtonPrimaryText: {
    color: AppTheme.orange,
    fontWeight: '700',
    fontSize: 14,
  },
  ctaButtonSecondary: {
    borderWidth: 1,
    borderColor: AppTheme.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  ctaButtonSecondaryText: {
    color: AppTheme.white,
    fontWeight: '600',
    fontSize: 14,
  },
  ctaCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaCircle2: {
    position: 'absolute',
    bottom: -20,
    left: '30%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Empty state styles
  emptyVehiclesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyRoadContainer: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  emptyRoad: {
    position: 'absolute',
    bottom: 10,
    width: '80%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  emptyRoadLine: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#555',
    marginTop: -1,
  },
  emptyCarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  emptyCarBody: {
    zIndex: 2,
  },
  emptyWheel: {
    position: 'absolute',
    bottom: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#555',
  },
  emptyWheelLeft: {
    left: 4,
  },
  emptyWheelRight: {
    right: 4,
  },
  emptyWheelInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#777',
    position: 'absolute',
    top: 2,
    left: 2,
  },
  emptyDust: {
    position: 'absolute',
    left: '30%',
    bottom: 12,
    width: 30,
    height: 10,
    backgroundColor: 'rgba(150,150,150,0.3)',
    borderRadius: 5,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.orange,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
    shadowColor: AppTheme.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyResetButtonText: {
    color: AppTheme.white,
    fontWeight: '700',
    fontSize: 16,
  },
  emptySourceHints: {
    marginTop: 24,
    alignItems: 'center',
  },
  emptySourceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptySourceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  emptySourceButtonActive: {
    backgroundColor: AppTheme.orange,
    borderColor: AppTheme.orange,
  },
});
