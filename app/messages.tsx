import { View, StyleSheet, FlatList, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Animation for empty state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

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

    // Bounce animation for message icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Empty state for now - messages will come from API
  const messages: any[] = [];

  return (
    <ThemedView style={styles.container}>
      {messages.length === 0 ? (
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
              { backgroundColor: '#3B82F6' + '15', transform: [{ translateY: bounceAnim }] },
            ]}
          >
            <Ionicons name="chatbubbles" size={64} color="#3B82F6" />
          </Animated.View>
          <ThemedText variant="title" size="xl" style={styles.emptyTitle}>
            Aucun message
          </ThemedText>
          <ThemedText variant="muted" style={styles.emptySubtitle}>
            Vous n'avez pas encore de messages.{'\n'}
            Contactez-nous pour toute question sur nos vehicules !
          </ThemedText>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: AppTheme.orange }]}
            onPress={() => {}}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
            <ThemedText style={styles.contactButtonText}>
              Demarrer une conversation
            </ThemedText>
          </TouchableOpacity>

          {/* Contact Options */}
          <View style={styles.contactOptions}>
            <TouchableOpacity
              style={[styles.contactOption, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <ThemedText size="sm" style={{ marginTop: 8 }}>WhatsApp</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactOption, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="mail" size={24} color={AppTheme.orange} />
              <ThemedText size="sm" style={{ marginTop: 8 }}>Email</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactOption, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="call" size={24} color="#3B82F6" />
              <ThemedText size="sm" style={{ marginTop: 8 }}>Appeler</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  contactOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  contactOption: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
});
