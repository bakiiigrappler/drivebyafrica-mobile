import { FlatList, StyleSheet, View, ActivityIndicator, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { OrderCard } from '@/components/orders';
import { useOrders } from '@/hooks';
import { useAuthStore, useSettingsStore } from '@/store';
import { t } from '@/lib/i18n';
import type { OrderWithTracking } from '@/types';

const SHIPPING_STATUSES = ['shipping', 'in_transit', 'at_port'];
const DELIVERED_STATUSES = ['delivered', 'completed'];

const getOrderTabs = (lang: string) => [
  { id: 'all', label: lang === 'zh' ? '全部' : lang === 'en' ? 'All' : 'Toutes' },
  { id: 'active', label: lang === 'zh' ? '进行中' : lang === 'en' ? 'Active' : 'En cours' },
  { id: 'shipping', label: lang === 'zh' ? '海运中' : lang === 'en' ? 'Shipping' : 'En mer' },
  { id: 'delivered', label: lang === 'zh' ? '已交付' : lang === 'en' ? 'Delivered' : 'Livrées' },
];

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const { data, isLoading, refetch, isRefetching } = useOrders();
  const orders = data?.data || [];
  const [activeTab, setActiveTab] = useState('all');

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

  const filteredOrders = orders.filter((order: OrderWithTracking) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return !DELIVERED_STATUSES.includes(order.status) && !SHIPPING_STATUSES.includes(order.status) && order.status !== 'cancelled';
    if (activeTab === 'shipping') return SHIPPING_STATUSES.includes(order.status);
    if (activeTab === 'delivered') return DELIVERED_STATUSES.includes(order.status);
    return order.status === activeTab;
  });

  const renderItem = useCallback(
    ({ item }: { item: OrderWithTracking }) => <OrderCard order={item} />,
    []
  );

  const keyExtractor = useCallback((item: OrderWithTracking) => item.id, []);

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        {/* Header - Dark */}
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
          <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>{t('orders.title', language)}</ThemedText>
        </View>
        <View style={styles.authPrompt}>
          <LinearGradient
            colors={[AppTheme.navy + '15', 'transparent']}
            style={styles.authGradient}
          />
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: AppTheme.navy + '15',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={[AppTheme.navy, '#2E5A8A']}
              style={styles.iconGradient}
            >
              <Ionicons name="receipt" size={48} color={AppTheme.white} />
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
              {t('orders.title', language)}
            </ThemedText>
            <ThemedText variant="muted" style={styles.authSubtitle}>
              {t('orders.subtitle', language)}
            </ThemedText>

            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: AppTheme.orange + '20' }]}>
                  <Ionicons name="time" size={20} color={AppTheme.orange} />
                </View>
                <ThemedText size="xs" variant="muted">{language === 'zh' ? '历史' : language === 'en' ? 'History' : 'Historique'}</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Ionicons name="location" size={20} color="#3B82F6" />
                </View>
                <ThemedText size="xs" variant="muted">{language === 'zh' ? '追踪' : language === 'en' ? 'Tracking' : 'Suivi'}</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#22C55E' + '20' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                </View>
                <ThemedText size="xs" variant="muted">{language === 'zh' ? '交付' : language === 'en' ? 'Delivery' : 'Livraison'}</ThemedText>
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
              style={styles.createAccountLink}
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
        <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>{t('orders.title', language)}</ThemedText>
      </View>

      {/* Order Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {getOrderTabs(language).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: AppTheme.orange, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <ThemedText
              size="sm"
              style={{
                color: activeTab === tab.id ? AppTheme.orange : colors.textMuted,
                fontWeight: activeTab === tab.id ? '600' : '400',
              }}
            >
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={AppTheme.orange} />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.iconContainer, { backgroundColor: AppTheme.orange + '20' }]}>
            <Ionicons name="receipt-outline" size={48} color={AppTheme.orange} />
          </View>
          <ThemedText variant="title" size="lg" style={{ marginTop: 20 }}>
            {t('orders.empty', language)}
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 8, textAlign: 'center' }}>
            {t('orders.emptyDesc', language)}
          </ThemedText>
          <TouchableOpacity
            style={[styles.browseButton, { borderColor: AppTheme.orange }]}
            onPress={() => router.push('/(tabs)')}
          >
            <ThemedText style={{ color: AppTheme.orange, fontWeight: '600' }}>
              {t('favorites.browse', language)}
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={AppTheme.orange}
              colors={[AppTheme.orange]}
            />
          }
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  list: {
    padding: 16,
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
  signInButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  browseButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
  },
});
