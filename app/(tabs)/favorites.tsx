import { FlatList, StyleSheet, View, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { VehicleCardHorizontal } from '@/components/vehicles';
import { useFavorites } from '@/hooks';
import { useAuthStore, useSettingsStore } from '@/store';
import { t } from '@/lib/i18n';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const { favorites, toggleFavorite, isLoading } = useFavorites();

  // Animations for auth prompt
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!user) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [user]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <VehicleCardHorizontal
        vehicle={item.vehicle}
        isFavorite={true}
        onToggleFavorite={toggleFavorite}
      />
    ),
    [toggleFavorite]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        {/* Header - Dark */}
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
          <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>{t('favorites.title', language)}</ThemedText>
        </View>
        <View style={styles.authPrompt}>
          <LinearGradient
            colors={[AppTheme.orange + '10', 'transparent']}
            style={styles.authGradient}
          />
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: AppTheme.orange + '15',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={[AppTheme.orange, '#FF8C42']}
              style={styles.iconGradient}
            >
              <Ionicons name="heart" size={48} color={AppTheme.white} />
            </LinearGradient>
          </Animated.View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              alignItems: 'center',
            }}
          >
            <ThemedText variant="title" size="xl" style={styles.authTitle}>
              {t('favorites.authTitle', language)}
            </ThemedText>
            <ThemedText variant="muted" style={styles.authSubtitle}>
              {t('favorites.authDesc', language)}
            </ThemedText>

            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#EF4444' + '20' }]}>
                  <Ionicons name="heart" size={20} color="#EF4444" />
                </View>
                <ThemedText size="xs" variant="muted">{t('favorites.save', language)}</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Ionicons name="notifications" size={20} color="#3B82F6" />
                </View>
                <ThemedText size="xs" variant="muted">{t('favorites.follow', language)}</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#22C55E' + '20' }]}>
                  <Ionicons name="car-sport" size={20} color="#22C55E" />
                </View>
                <ThemedText size="xs" variant="muted">{t('favorites.compare', language)}</ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signInButtonAnimated}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[AppTheme.orange, '#FF8C42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInGradient}
              >
                <Ionicons name="log-in-outline" size={20} color={AppTheme.white} />
                <ThemedText style={styles.signInText}>{t('profile.signIn', language)}</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createAccountLink]}
              onPress={() => router.push('/(auth)/register')}
            >
              <ThemedText variant="muted" size="sm">
                {t('auth.noAccount', language)}{' '}
                <ThemedText size="sm" style={{ color: AppTheme.orange, fontWeight: '600' }}>
                  {t('profile.createAccount', language)}
                </ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header - Dark */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
        <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>{t('favorites.title', language)}</ThemedText>
        <ThemedText size="sm" style={{ marginTop: 4, color: 'rgba(255,255,255,0.6)' }}>
          {t('favorites.subtitle', language)}
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={AppTheme.orange} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.iconContainer, { backgroundColor: AppTheme.orange + '20' }]}>
            <Ionicons name="heart-outline" size={48} color={AppTheme.orange} />
          </View>
          <ThemedText variant="title" size="lg" style={{ marginTop: 20 }}>
            {t('favorites.empty', language)}
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 8, textAlign: 'center' }}>
            {t('favorites.emptyDesc', language)}
          </ThemedText>
          <TouchableOpacity
            style={[styles.browseButton, { borderColor: AppTheme.orange }]}
            onPress={() => router.push('/(tabs)/live')}
          >
            <ThemedText style={{ color: AppTheme.orange, fontWeight: '600' }}>
              {t('favorites.browse', language)}
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <ThemedText variant="muted" size="sm">
                {favorites.length} {language === 'zh' ? '辆车已收藏' : language === 'en' ? `vehicle${favorites.length > 1 ? 's' : ''} saved` : `véhicule${favorites.length > 1 ? 's' : ''} sauvegardé${favorites.length > 1 ? 's' : ''}`}
              </ThemedText>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listHeader: {
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    position: 'relative',
  },
  authGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  authSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 24,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonAnimated: {
    marginTop: 32,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 48,
    gap: 10,
  },
  signInText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  createAccountLink: {
    marginTop: 20,
    padding: 8,
  },
  browseButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
  },
});
