import { View, StyleSheet, FlatList, TouchableOpacity, Animated, RefreshControl, Image } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Animation for empty state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for heart icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Empty state for now - favorites will come from API
  const favorites: any[] = [];

  return (
    <ThemedView style={styles.container}>
      {favorites.length === 0 ? (
        <Animated.View
          style={[
            styles.emptyState,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: '#EF4444' + '15', transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name="heart" size={64} color="#EF4444" />
          </Animated.View>
          <ThemedText variant="title" size="xl" style={styles.emptyTitle}>
            Aucun favori
          </ThemedText>
          <ThemedText variant="muted" style={styles.emptySubtitle}>
            Vous n'avez pas encore ajoute de vehicules en favoris.{'\n'}
            Parcourez notre catalogue et sauvegardez vos coups de coeur !
          </ThemedText>
          <TouchableOpacity
            style={[styles.exploreButton, { backgroundColor: AppTheme.orange }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="car-sport-outline" size={20} color="#fff" />
            <ThemedText style={styles.exploreButtonText}>
              Explorer les vehicules
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={AppTheme.orange}
            />
          }
          renderItem={({ item }) => null}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
