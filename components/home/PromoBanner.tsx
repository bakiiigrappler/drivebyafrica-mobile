import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export function PromoBanner() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E3A5F', '#0F2744']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.content}>
          <View style={styles.textContent}>
            <ThemedText variant="title" size="xl" style={styles.title}>
              Driveby Africa
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Importez votre véhicule au meilleur prix depuis la Corée, la Chine et Dubaï
            </ThemedText>
            <TouchableOpacity style={[styles.ctaButton, { backgroundColor: colors.mandarin }]}>
              <ThemedText style={styles.ctaText}>Découvrir</ThemedText>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.imageContainer}>
            <Image
              source={require('@/assets/images/car-promo.png')}
              style={styles.carImage}
              contentFit="contain"
            />
          </View>
        </View>

        {/* Decorative elements */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    padding: 20,
  },
  textContent: {
    flex: 1,
    zIndex: 2,
  },
  title: {
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 12,
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle1: {
    width: 150,
    height: 150,
    top: -50,
    right: -30,
  },
  circle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
  },
});
