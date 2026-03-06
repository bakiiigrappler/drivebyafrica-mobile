import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAuthStore } from '@/store';
import { Country, DEFAULT_COUNTRY } from '@/constants/countries';
import { showGlobalSnackbar } from '@/contexts/SnackbarContext';

const { width } = Dimensions.get('window');

interface StepData {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: StepData[] = [
  {
    title: 'Bienvenue',
    subtitle: 'Comment vous appelez-vous ?',
    icon: 'person',
  },
  {
    title: 'Contact',
    subtitle: 'Comment vous contacter ?',
    icon: 'mail',
  },
  {
    title: 'Sécurité',
    subtitle: 'Protégez votre compte',
    icon: 'shield-checkmark',
  },
];

// Component for password criteria checklist
const CriteriaItem = ({ met, text }: { met: boolean; text: string }) => (
  <View style={criteriaStyles.item}>
    <View style={[criteriaStyles.icon, met && criteriaStyles.iconMet]}>
      <Ionicons
        name={met ? 'checkmark' : 'close'}
        size={12}
        color={met ? '#fff' : 'rgba(255,255,255,0.4)'}
      />
    </View>
    <ThemedText style={[criteriaStyles.text, met && criteriaStyles.textMet]}>
      {text}
    </ThemedText>
  </View>
);

const criteriaStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  icon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconMet: {
    backgroundColor: '#10B981',
  },
  text: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  textMet: {
    color: '#10B981',
  },
});

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, signInWithGoogle, isLoading } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password validation criteria
  const passwordCriteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passwordStrength = Object.values(passwordCriteria).filter(Boolean).length;
  const isPasswordSecure = passwordStrength >= 4;

  // Generate secure password
  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + special;

    let generatedPassword = '';
    // Ensure at least one of each type
    generatedPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
    generatedPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
    generatedPassword += numbers[Math.floor(Math.random() * numbers.length)];
    generatedPassword += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly (total 12 characters)
    for (let i = 4; i < 12; i++) {
      generatedPassword += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    generatedPassword = generatedPassword.split('').sort(() => Math.random() - 0.5).join('');

    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    setShowPassword(true);
    setShowConfirmPassword(true);

    showGlobalSnackbar({
      message: 'Mot de passe sécurisé généré !',
      type: 'success',
      icon: 'key',
      duration: 3000,
    });
  };

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();

    // Pulse icon animation
    Animated.sequence([
      Animated.timing(iconScale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateTransition = (direction: 'next' | 'back', callback: () => void) => {
    const toValue = direction === 'next' ? -width : width;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'next' ? width : -width);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!fullName.trim()) {
          newErrors.fullName = 'Veuillez entrer votre nom';
        } else if (fullName.trim().length < 2) {
          newErrors.fullName = 'Le nom doit contenir au moins 2 caractères';
        }
        break;
      case 1:
        if (!email) {
          newErrors.email = 'Email requis';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
          newErrors.email = 'Adresse email invalide';
        }
        break;
      case 2:
        if (!password) {
          newErrors.password = 'Mot de passe requis';
        } else if (password.length < 8) {
          newErrors.password = 'Minimum 8 caractères';
        } else if (passwordStrength < 4) {
          newErrors.password = 'Mot de passe pas assez sécurisé';
        }
        if (!confirmPassword) {
          newErrors.confirmPassword = 'Confirmez votre mot de passe';
        } else if (password !== confirmPassword) {
          newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
        }
        break;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      shake();
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < STEPS.length - 1) {
      animateTransition('next', () => setCurrentStep(currentStep + 1));
    } else {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition('back', () => setCurrentStep(currentStep - 1));
    } else {
      router.back();
    }
  };

  const handleRegister = async () => {
    // Combine country dial code with phone number
    const fullPhone = phone ? `${phoneCountry.dialCode}${phone}` : undefined;

    const { error } = await signUp({
      email,
      password,
      fullName,
      whatsapp: fullPhone,
      country: phoneCountry.name,
    });

    if (error) {
      // Handle specific Supabase errors with Snackbar
      if (error.message?.includes('confirmation email')) {
        showGlobalSnackbar({
          message: 'Erreur de configuration email. Contactez le support.',
          type: 'error',
          icon: 'mail',
          duration: 5000,
        });
      } else if (error.message?.includes('already registered')) {
        showGlobalSnackbar({
          message: 'Cet email est déjà utilisé',
          type: 'warning',
          icon: 'person',
          duration: 5000,
          action: {
            label: 'Connexion',
            onPress: () => router.push('/(auth)/login'),
          },
        });
      } else if (error.message?.includes('valid email')) {
        showGlobalSnackbar({
          message: 'Veuillez entrer une adresse email valide',
          type: 'error',
          icon: 'mail',
          duration: 4000,
        });
      } else if (error.message?.includes('password')) {
        showGlobalSnackbar({
          message: 'Le mot de passe doit contenir au moins 6 caractères',
          type: 'error',
          icon: 'lock-closed',
          duration: 4000,
        });
      } else {
        showGlobalSnackbar({
          message: error.message || 'Une erreur est survenue',
          type: 'error',
          icon: 'alert-circle',
          duration: 4000,
        });
      }
    } else {
      showGlobalSnackbar({
        message: 'Compte créé ! Vérifiez votre email pour confirmer.',
        type: 'success',
        icon: 'mail',
        duration: 5000,
        action: {
          label: 'Connexion',
          onPress: () => router.replace('/(auth)/login'),
        },
      });
      // Auto redirect after a short delay
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Nom complet</ThemedText>
              <Input
                placeholder="Ex: Jean Dupont"
                autoCapitalize="words"
                autoComplete="name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors({});
                }}
                error={errors.fullName}
                icon={<Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" />}
              />
            </View>
            <View style={styles.tipContainer}>
              <Ionicons name="information-circle" size={18} color={AppTheme.orange} />
              <ThemedText style={styles.tipText}>
                Utilisez votre vrai nom pour faciliter vos transactions
              </ThemedText>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Adresse email</ThemedText>
              <Input
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({});
                }}
                error={errors.email}
                icon={<Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Téléphone (optionnel)</ThemedText>
              <PhoneInput
                value={phone}
                onChangeText={setPhone}
                onChangeCountry={setPhoneCountry}
                placeholder="XX XX XX XX XX"
                autoDetectCountry
              />
            </View>
            <View style={styles.tipContainer}>
              <Ionicons name="shield-checkmark" size={18} color={AppTheme.orange} />
              <ThemedText style={styles.tipText}>
                Votre email servira à confirmer votre compte
              </ThemedText>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            {/* Generate Password Button */}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateSecurePassword}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateButtonGradient}
              >
                <Ionicons name="key" size={18} color="#fff" />
                <ThemedText style={styles.generateButtonText}>
                  Générer un mot de passe sécurisé
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Mot de passe</ThemedText>
              <Input
                placeholder="Minimum 8 caractères"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({});
                }}
                error={errors.password}
                icon={<Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="rgba(255,255,255,0.6)"
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Confirmer</ThemedText>
              <Input
                placeholder="Retapez votre mot de passe"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({});
                }}
                error={errors.confirmPassword}
                icon={<Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="rgba(255,255,255,0.6)"
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            {/* Password strength indicator */}
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          passwordStrength > i
                            ? passwordStrength <= 2
                              ? '#EF4444'
                              : passwordStrength <= 3
                              ? '#F59E0B'
                              : '#10B981'
                            : 'rgba(255,255,255,0.1)',
                      },
                    ]}
                  />
                ))}
              </View>
              <ThemedText
                style={[
                  styles.strengthText,
                  {
                    color:
                      passwordStrength <= 2
                        ? '#EF4444'
                        : passwordStrength <= 3
                        ? '#F59E0B'
                        : '#10B981',
                  },
                ]}
              >
                {password.length === 0
                  ? ''
                  : passwordStrength <= 2
                  ? 'Faible'
                  : passwordStrength <= 3
                  ? 'Moyen'
                  : passwordStrength === 4
                  ? 'Fort'
                  : 'Très fort'}
              </ThemedText>
            </View>

            {/* Password Criteria Checklist */}
            {password.length > 0 && (
              <View style={styles.criteriaContainer}>
                <CriteriaItem met={passwordCriteria.minLength} text="Au moins 8 caractères" />
                <CriteriaItem met={passwordCriteria.hasUppercase} text="Une lettre majuscule (A-Z)" />
                <CriteriaItem met={passwordCriteria.hasLowercase} text="Une lettre minuscule (a-z)" />
                <CriteriaItem met={passwordCriteria.hasNumber} text="Un chiffre (0-9)" />
                <CriteriaItem met={passwordCriteria.hasSpecial} text="Un caractère spécial (!@#$%...)" />
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
              <LinearGradient
                colors={[AppTheme.orange, AppTheme.orangeDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <ThemedText style={styles.progressText}>
            {currentStep + 1} / {STEPS.length}
          </ThemedText>
        </View>
      </View>

      {/* Step Indicators */}
      <View style={styles.stepsIndicator}>
        {STEPS.map((step, index) => (
          <View key={index} style={styles.stepIndicatorItem}>
            <Animated.View
              style={[
                styles.stepDot,
                index === currentStep && {
                  transform: [{ scale: iconScale }],
                },
                index < currentStep && styles.stepDotCompleted,
                index === currentStep && styles.stepDotActive,
              ]}
            >
              {index < currentStep ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Ionicons
                  name={step.icon}
                  size={16}
                  color={index === currentStep ? '#fff' : 'rgba(255,255,255,0.4)'}
                />
              )}
            </Animated.View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentStep && styles.stepLineCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Title */}
          <Animated.View
            style={[
              styles.stepHeader,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }, { translateX: shakeAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[AppTheme.orange, AppTheme.orangeDark]}
              style={styles.stepIconContainer}
            >
              <Ionicons name={STEPS[currentStep].icon} size={32} color="#fff" />
            </LinearGradient>
            <ThemedText style={styles.stepTitle}>{STEPS[currentStep].title}</ThemedText>
            <ThemedText style={styles.stepSubtitle}>{STEPS[currentStep].subtitle}</ThemedText>
          </Animated.View>

          {/* Form Content */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }, { translateX: shakeAnim }],
              },
            ]}
          >
            {renderStepContent()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        {/* Next/Submit Button */}
        <TouchableOpacity
          style={[styles.nextButton, isLoading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[AppTheme.orange, AppTheme.orangeDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <ThemedText style={styles.nextButtonText}>
              {isLoading
                ? 'CRÉATION...'
                : currentStep === STEPS.length - 1
                ? 'CRÉER MON COMPTE'
                : 'CONTINUER'}
            </ThemedText>
            {!isLoading && (
              <Ionicons
                name={currentStep === STEPS.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
                size={20}
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>ou</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        {/* Google OAuth */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={async () => {
            const { error } = await signInWithGoogle();
            if (error) {
              showGlobalSnackbar({
                message: 'La connexion Google a échoué',
                type: 'error',
                icon: 'alert-circle',
                duration: 4000,
              });
            }
          }}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={20} color="#DB4437" />
          <ThemedText style={styles.googleButtonText}>Continuer avec Google</ThemedText>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginLink}>
          <ThemedText style={styles.loginText}>Déjà un compte ? </ThemedText>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <ThemedText style={styles.loginLinkText}>Se connecter</ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    marginLeft: 12,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepDotActive: {
    backgroundColor: AppTheme.orange,
    borderColor: AppTheme.orange,
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: AppTheme.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  formContainer: {
    flex: 1,
  },
  stepContent: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    marginLeft: 4,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249,115,22,0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 10,
    lineHeight: 18,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    marginLeft: 12,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    width: 50,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  criteriaContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: AppTheme.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#ffffff',
  },
  googleButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  loginLinkText: {
    fontSize: 14,
    color: AppTheme.orange,
    fontWeight: '600',
  },
});
