import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store';

const { height } = Dimensions.get('window');
const HEADER_HEIGHT = height * 0.35;

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Adresse email invalide';
    }

    if (!password) {
      newErrors.password = 'Mot de passe requis';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const { error } = await signIn(email, password);

    if (error) {
      Alert.alert('Erreur', 'Email ou mot de passe invalide');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero Image Header */}
      <Animated.View style={[styles.heroContainer, { opacity: headerAnim }]}>
        <Image
          source={require('@/assets/images/login-bg.webp')}
          style={styles.heroImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(26,26,26,0.3)', 'rgba(26,26,26,0.7)', '#1a1a1a']}
          style={styles.heroGradient}
        />

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Logo & Title */}
        <View style={[styles.heroContent, { paddingTop: insets.top + 40 }]}>
          <Image
            source={require('@/assets/images/logo-driveby.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText style={styles.heroTitle}>
            Importez votre véhicule
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            depuis l'Asie et Dubaï
          </ThemedText>

          {/* Country Flags */}
          <View style={styles.flagsRow}>
            <View style={styles.flagItem}>
              <ThemedText style={styles.flagEmoji}>🇰🇷</ThemedText>
              <ThemedText style={styles.flagLabel}>Corée</ThemedText>
            </View>
            <View style={styles.flagItem}>
              <ThemedText style={styles.flagEmoji}>🇨🇳</ThemedText>
              <ThemedText style={styles.flagLabel}>Chine</ThemedText>
            </View>
            <View style={styles.flagItem}>
              <ThemedText style={styles.flagEmoji}>🇦🇪</ThemedText>
              <ThemedText style={styles.flagLabel}>Dubaï</ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Form Section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Connexion</ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Connectez-vous à votre compte Driveby Africa
              </ThemedText>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                icon={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
              />

              <Input
                label="Mot de passe"
                placeholder="Votre mot de passe"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
              />

              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <ThemedText style={styles.forgotPassword}>
                    Mot de passe oublié ?
                  </ThemedText>
                </TouchableOpacity>
              </Link>

              <TouchableOpacity
                style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ThemedText style={styles.signInButtonText}>CONNEXION...</ThemedText>
                ) : (
                  <ThemedText style={styles.signInButtonText}>SE CONNECTER</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <ThemedText style={styles.dividerText}>ou continuer avec</ThemedText>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={22} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Pas encore de compte ?{' '}
              </ThemedText>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <ThemedText style={styles.footerLink}>S'inscrire</ThemedText>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  heroContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    paddingHorizontal: 24,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppTheme.orange,
    marginTop: 2,
  },
  flagsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  flagItem: {
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 24,
  },
  flagLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  form: {
    gap: 4,
  },
  forgotPassword: {
    textAlign: 'right',
    color: AppTheme.orange,
    fontSize: 14,
    fontWeight: '500',
    marginTop: -4,
    marginBottom: 8,
  },
  signInButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: AppTheme.orange,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 24,
  },
  footerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  footerLink: {
    color: AppTheme.orange,
    fontWeight: '600',
    fontSize: 14,
  },
});
