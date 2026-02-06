import { FlatList, StyleSheet, View, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card } from '@/components/ui/Card';
import { useNotifications } from '@/hooks';
import { useAuthStore } from '@/store';
import type { Notification } from '@/types';

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  order: 'receipt',
  vehicle: 'car-sport',
  price: 'pricetag',
  system: 'information-circle',
  default: 'notifications',
};

function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        style={[
          styles.notificationCard,
          !notification.read && { borderLeftWidth: 3, borderLeftColor: colors.mandarin },
        ]}
      >
        <View style={styles.notificationContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: notification.read ? colors.surface : colors.mandarin + '20' },
            ]}
          >
            <Ionicons
              name={icon}
              size={20}
              color={notification.read ? colors.textMuted : colors.mandarin}
            />
          </View>
          <View style={styles.textContent}>
            <ThemedText variant="subtitle" size="sm" numberOfLines={1}>
              {notification.title}
            </ThemedText>
            {notification.message && (
              <ThemedText variant="muted" size="xs" numberOfLines={2}>
                {notification.message}
              </ThemedText>
            )}
            <ThemedText variant="muted" size="xs" style={{ marginTop: 4 }}>
              {format(new Date(notification.created_at), 'dd MMM à HH:mm', { locale: fr })}
            </ThemedText>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  // Animations
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
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation loop
      const pulse = Animated.loop(
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
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [user]);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markAsRead(notification.id);
      }
    },
    [markAsRead]
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        notification={item}
        onPress={() => handleNotificationPress(item)}
      />
    ),
    [handleNotificationPress]
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.authPrompt}>
          <LinearGradient
            colors={[AppTheme.orange + '10', 'transparent']}
            style={styles.authGradient}
          />
          <Animated.View
            style={[
              styles.iconWrapper,
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
              <Ionicons name="notifications" size={48} color={AppTheme.white} />
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
              Vos Notifications
            </ThemedText>
            <ThemedText variant="muted" style={styles.authSubtitle}>
              Connectez-vous pour recevoir des alertes sur vos commandes, les nouveaux véhicules et les offres exclusives
            </ThemedText>

            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#EF4444' + '20' }]}>
                  <Ionicons name="receipt" size={20} color="#EF4444" />
                </View>
                <ThemedText size="xs" variant="muted">Commandes</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Ionicons name="car-sport" size={20} color="#3B82F6" />
                </View>
                <ThemedText size="xs" variant="muted">Véhicules</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#22C55E' + '20' }]}>
                  <Ionicons name="pricetag" size={20} color="#22C55E" />
                </View>
                <ThemedText size="xs" variant="muted">Offres</ThemedText>
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
                <ThemedText style={styles.signInText}>SE CONNECTER</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createAccountLink}
              onPress={() => router.push('/(auth)/register')}
            >
              <ThemedText variant="muted" size="sm">
                Pas de compte ?{' '}
                <ThemedText size="sm" style={{ color: AppTheme.orange, fontWeight: '600' }}>
                  Créer un compte
                </ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.mandarin} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllButton, { backgroundColor: colors.surface }]}
          onPress={() => markAllAsRead()}
        >
          <ThemedText variant="link" size="sm">
            Tout marquer comme lu
          </ThemedText>
        </TouchableOpacity>
      )}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={64} color={colors.textMuted} />
          <ThemedText variant="title" size="lg" style={{ marginTop: 16 }}>
            Aucune notification
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 8, textAlign: 'center' }}>
            Vous recevrez des notifications sur vos commandes et les véhicules favoris
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  // Auth prompt styles
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
  iconWrapper: {
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
  // Other styles
  markAllButton: {
    padding: 12,
    alignItems: 'center',
  },
  notificationCard: {
    marginBottom: 12,
    padding: 12,
  },
  notificationContent: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
});
