import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  StatusBar,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';
import { useOnboardingStore } from '@/store';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Véhicules Premium',
    subtitle: 'Accédez à plus de 150 000 véhicules importés de Corée, Chine et Dubaï aux meilleurs prix.',
    icon: 'car-sport',
    highlight: 'DÉCOUVREZ',
  },
  {
    id: '2',
    title: 'Devis Instantané',
    subtitle: 'Obtenez un devis personnalisé en quelques clics avec tous les frais inclus.',
    icon: 'calculator',
    highlight: 'ESTIMEZ',
  },
  {
    id: '3',
    title: 'Économies Garanties',
    subtitle: 'Économisez jusqu\'à 40% par rapport aux concessionnaires locaux.',
    icon: 'trending-down',
    highlight: 'ÉCONOMISEZ',
  },
  {
    id: '4',
    title: 'Livraison en Afrique',
    subtitle: 'Nous gérons tout - achat, expédition, dédouanement et livraison.',
    icon: 'globe',
    highlight: 'RECEVEZ',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setHasSeenOnboarding } = useOnboardingStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const speedLineAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Pulse animation for icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Speed lines animation
    const speedLines = Animated.loop(
      Animated.timing(speedLineAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Glow animation
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    speedLines.start();
    glow.start();

    return () => {
      pulse.stop();
      speedLines.stop();
      glow.stop();
    };
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  }, [currentIndex]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    await handleFinish();
  }, []);

  const handleFinish = useCallback(async () => {
    await setHasSeenOnboarding(true);
    router.replace('/(tabs)');
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const speedLineTranslate = speedLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const renderSlide = ({ item, index }: { item: typeof ONBOARDING_DATA[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [60, 0, 60],
      extrapolate: 'clamp',
    });

    const rotateZ = scrollX.interpolate({
      inputRange,
      outputRange: ['-15deg', '0deg', '15deg'],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <View style={styles.slideContent}>
          {/* Speed lines effect */}
          <Animated.View
            style={[
              styles.speedLine,
              styles.speedLine1,
              { transform: [{ translateX: speedLineTranslate }] },
            ]}
          />
          <Animated.View
            style={[
              styles.speedLine,
              styles.speedLine2,
              { transform: [{ translateX: speedLineTranslate }] },
            ]}
          />
          <Animated.View
            style={[
              styles.speedLine,
              styles.speedLine3,
              { transform: [{ translateX: speedLineTranslate }] },
            ]}
          />

          {/* Icon with glow effect */}
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [{ scale }, { translateY }, { rotate: rotateZ }],
                opacity,
              }
            ]}
          >
            {/* Glow effect */}
            <Animated.View style={[styles.iconGlow, { opacity: glowAnim }]} />

            {/* Main icon circle */}
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={[AppTheme.orange, AppTheme.orangeDark]}
                style={styles.iconGradient}
              >
                <Ionicons name={item.icon as any} size={50} color="#fff" />
              </LinearGradient>
            </Animated.View>

            {/* Racing stripes */}
            <View style={styles.racingStripe1} />
            <View style={styles.racingStripe2} />
          </Animated.View>

          {/* Text content */}
          <Animated.View style={[styles.textContainer, { opacity, transform: [{ translateY }] }]}>
            <ThemedText style={styles.highlightText}>
              {item.highlight}
            </ThemedText>
            <ThemedText style={styles.slideTitle}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.slideSubtitle}>
              {item.subtitle}
            </ThemedText>
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderPagination = () => (
    <View style={styles.pagination}>
      {ONBOARDING_DATA.map((_, index) => {
        const isActive = index === currentIndex;

        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#0f0f0f']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Image
          source={require('@/assets/images/logo-driveby.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <ThemedText style={styles.skipText}>Passer</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.flatList}
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {renderPagination()}

        <View style={styles.buttonsRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, currentIndex === 0 && styles.nextButtonFull]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[AppTheme.orange, AppTheme.orangeDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <ThemedText style={styles.nextButtonText}>
                {isLastSlide ? 'COMMENCER' : 'SUIVANT'}
              </ThemedText>
              <Ionicons
                name={isLastSlide ? 'rocket' : 'chevron-forward'}
                size={20}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <ThemedText style={styles.stepText}>
            {currentIndex + 1} / {ONBOARDING_DATA.length}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: AppTheme.orange,
    opacity: 0.05,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: AppTheme.orange,
    opacity: 0.03,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  logo: {
    width: 130,
    height: 40,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width,
    height,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 180,
  },
  speedLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: AppTheme.orange,
    opacity: 0.15,
    borderRadius: 1,
  },
  speedLine1: {
    top: '30%',
    width: 100,
  },
  speedLine2: {
    top: '35%',
    width: 60,
    marginLeft: 50,
  },
  speedLine3: {
    top: '40%',
    width: 80,
    marginLeft: -30,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  iconGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: AppTheme.orange,
    opacity: 0.2,
  },
  iconCircle: {
    shadowColor: AppTheme.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  iconGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  racingStripe1: {
    position: 'absolute',
    width: 150,
    height: 3,
    backgroundColor: AppTheme.orange,
    opacity: 0.3,
    top: '50%',
    left: -70,
    transform: [{ rotate: '-45deg' }],
  },
  racingStripe2: {
    position: 'absolute',
    width: 150,
    height: 3,
    backgroundColor: AppTheme.orange,
    opacity: 0.2,
    top: '55%',
    left: -60,
    transform: [{ rotate: '-45deg' }],
  },
  textContainer: {
    alignItems: 'center',
  },
  highlightText: {
    fontSize: 14,
    fontWeight: '800',
    color: AppTheme.orange,
    letterSpacing: 3,
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: AppTheme.orange,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: AppTheme.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepIndicator: {
    alignItems: 'center',
    marginTop: 16,
  },
  stepText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
});
