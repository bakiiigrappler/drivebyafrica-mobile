import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuthStore } from '@/store';
import { useOrderStats } from '@/hooks/useOrders';
import { useQuotes } from '@/hooks/useQuotes';
import { useFavorites } from '@/hooks/useFavorites';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
  onPress?: () => void;
}

function StatCard({ icon, label, value, color, loading, onPress }: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      {loading ? (
        <ActivityIndicator color={color} style={{ marginTop: 12 }} />
      ) : (
        <ThemedText variant="title" size="xl" style={{ marginTop: 12 }}>{value}</ThemedText>
      )}
      <ThemedText variant="muted" size="sm" style={{ marginTop: 4 }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { profile } = useAuthStore();

  // Fetch real data
  const { data: orderStats, isLoading: ordersLoading } = useOrderStats();
  const { data: quotesData, isLoading: quotesLoading } = useQuotes({ page: 0 });
  const { favorites, isLoading: favoritesLoading } = useFavorites();

  const quotesCount = quotesData?.total ?? 0;
  const activeOrdersCount = (orderStats?.active ?? 0) + (orderStats?.inTransit ?? 0);
  const favoritesCount = favorites?.length ?? 0;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Welcome Section */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.welcomeSection}>
            <ThemedText variant="title" size="xl">
              Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'}
            </ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 4 }}>
              Bienvenue sur votre tableau de bord
            </ThemedText>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="document-text"
              label="Devis"
              value={quotesCount}
              color={AppTheme.orange}
              loading={quotesLoading}
              onPress={() => router.push('/(tabs)/quotes')}
            />
            <StatCard
              icon="cart"
              label="Commandes"
              value={activeOrdersCount}
              color={AppTheme.navy}
              loading={ordersLoading}
              onPress={() => router.push('/orders')}
            />
            <StatCard
              icon="heart"
              label="Favoris"
              value={favoritesCount}
              color="#EF4444"
              loading={favoritesLoading}
              onPress={() => router.push('/favorites')}
            />
            <StatCard
              icon="chatbubbles"
              label="Messages"
              value={0}
              color="#3B82F6"
              onPress={() => router.push('/messages')}
            />
          </View>

          {/* Quick Actions */}
          <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="lg" style={styles.sectionTitle}>
              Actions rapides
            </ThemedText>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)')}
              >
                <View style={[styles.actionIcon, { backgroundColor: AppTheme.orange + '20' }]}>
                  <Ionicons name="car-sport" size={24} color={AppTheme.orange} />
                </View>
                <ThemedText size="sm" style={{ marginTop: 8 }}>Explorer</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/calculator')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Ionicons name="calculator" size={24} color="#3B82F6" />
                </View>
                <ThemedText size="sm" style={{ marginTop: 8 }}>Calculer</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/quotes')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#22C55E' + '20' }]}>
                  <Ionicons name="document-text" size={24} color="#22C55E" />
                </View>
                <ThemedText size="sm" style={{ marginTop: 8 }}>Mes devis</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/orders')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                  <Ionicons name="cube" size={24} color="#8B5CF6" />
                </View>
                <ThemedText size="sm" style={{ marginTop: 8 }}>Commandes</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText variant="title" size="lg" style={styles.sectionTitle}>
              Activite recente
            </ThemedText>
            {activeOrdersCount > 0 || quotesCount > 0 ? (
              <View style={styles.activityList}>
                {activeOrdersCount > 0 && (
                  <TouchableOpacity
                    style={[styles.activityItem, { borderColor: colors.cardBorder }]}
                    onPress={() => router.push('/orders')}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: AppTheme.navy + '20' }]}>
                      <Ionicons name="cube" size={20} color={AppTheme.navy} />
                    </View>
                    <View style={styles.activityContent}>
                      <ThemedText size="sm" style={{ fontWeight: '600' }}>
                        {activeOrdersCount} commande{activeOrdersCount > 1 ? 's' : ''} en cours
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        Suivez l'avancement de vos commandes
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                {quotesCount > 0 && (
                  <TouchableOpacity
                    style={[styles.activityItem, { borderColor: colors.cardBorder }]}
                    onPress={() => router.push('/(tabs)/quotes')}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: AppTheme.orange + '20' }]}>
                      <Ionicons name="document-text" size={20} color={AppTheme.orange} />
                    </View>
                    <View style={styles.activityContent}>
                      <ThemedText size="sm" style={{ fontWeight: '600' }}>
                        {quotesCount} devis
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        Consultez vos devis et estimations
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyActivity}>
                <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                <ThemedText variant="muted" style={{ marginTop: 12, textAlign: 'center' }}>
                  Aucune activite recente
                </ThemedText>
                <ThemedText variant="muted" size="sm" style={{ marginTop: 4, textAlign: 'center' }}>
                  Explorez les vehicules pour commencer
                </ThemedText>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
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
  welcomeSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
