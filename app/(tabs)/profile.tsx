import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Platform, Modal, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuthStore, useSettingsStore } from '@/store';
import { t, LANGUAGES, type Language } from '@/lib/i18n';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
  rightText?: string;
}

function MenuItem({ icon, label, subtitle, onPress, danger, badge, rightText }: MenuItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, {
          backgroundColor: danger ? colors.error + '15' : colorScheme === 'dark' ? '#ffffff10' : '#00000008',
        }]}>
          <Ionicons
            name={icon}
            size={20}
            color={danger ? colors.error : AppTheme.orange}
          />
        </View>
        <View style={styles.menuItemTextContainer}>
          <ThemedText
            style={[styles.menuItemLabel, danger && { color: colors.error }]}
          >
            {label}
          </ThemedText>
          {subtitle && (
            <ThemedText variant="muted" size="xs" style={styles.menuItemSubtitle}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: AppTheme.orange }]}>
            <ThemedText size="xs" style={{ color: AppTheme.white, fontWeight: '600' }}>{badge}</ThemedText>
          </View>
        )}
        {rightText && (
          <ThemedText variant="muted" size="sm">{rightText}</ThemedText>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText variant="muted" size="xs" style={styles.sectionHeaderText}>
        {title}
      </ThemedText>
    </View>
  );
}

// Language Selection Modal
function LanguageModal({ visible, onClose, currentLang, onSelect }: {
  visible: boolean;
  onClose: () => void;
  currentLang: Language;
  onSelect: (lang: Language) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.cardBg, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Pressable>
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
            </View>

            <ThemedText variant="title" size="lg" style={styles.modalTitle}>
              {t('settings.selectLanguage', currentLang)}
            </ThemedText>

            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.modalOption,
                  { borderColor: colors.border },
                  currentLang === lang.id && { borderColor: AppTheme.orange, backgroundColor: AppTheme.orange + '10' },
                ]}
                onPress={() => {
                  onSelect(lang.id);
                  onClose();
                }}
              >
                <View style={styles.modalOptionLeft}>
                  <ThemedText style={styles.modalOptionFlag}>{lang.flag}</ThemedText>
                  <View>
                    <ThemedText style={[styles.modalOptionLabel, currentLang === lang.id && { color: AppTheme.orange, fontWeight: '600' }]}>
                      {lang.label}
                    </ThemedText>
                    {lang.nativeName !== lang.label && (
                      <ThemedText variant="muted" size="xs">{lang.nativeName}</ThemedText>
                    )}
                  </View>
                </View>
                {currentLang === lang.id && (
                  <Ionicons name="checkmark-circle" size={22} color={AppTheme.orange} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();
  const settings = useSettingsStore();
  const lang = settings.language;

  const [showLanguageModal, setShowLanguageModal] = useState(false);

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

  const handleSignOut = () => {
    Alert.alert(
      t('profile.logout', lang),
      t('profile.logoutConfirm', lang),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        {
          text: t('profile.logout', lang),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const languageLabel = LANGUAGES.find(l => l.id === lang)?.label || 'Français';
  const languageFlag = LANGUAGES.find(l => l.id === lang)?.flag || '🇫🇷';

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        {/* Header - Dark */}
        <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
          <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>
            {t('profile.myAccount', lang)}
          </ThemedText>
        </View>
        <View style={styles.authPrompt}>
          <LinearGradient
            colors={[AppTheme.orange + '10', 'transparent']}
            style={styles.authGradient}
          />
          <Animated.View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: AppTheme.orange + '15',
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={[AppTheme.orange, '#FF8C42']}
              style={styles.avatarGradient}
            >
              <Ionicons name="person" size={48} color={AppTheme.white} />
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
              {t('profile.welcome', lang)}
            </ThemedText>
            <ThemedText variant="muted" style={styles.authSubtitle}>
              {t('profile.welcomeDesc', lang)}
            </ThemedText>

            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: AppTheme.orange + '20' }]}>
                  <Ionicons name="person" size={20} color={AppTheme.orange} />
                </View>
                <ThemedText size="xs" variant="muted">{t('profile.profile', lang)}</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Ionicons name="wallet" size={20} color="#3B82F6" />
                </View>
                <ThemedText size="xs" variant="muted">{t('profile.wallet', lang)}</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#22C55E' + '20' }]}>
                  <Ionicons name="notifications" size={20} color="#22C55E" />
                </View>
                <ThemedText size="xs" variant="muted">{t('profile.alerts', lang)}</ThemedText>
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
                <ThemedText style={styles.signInText}>{t('profile.signIn', lang)}</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createAccountButtonAnimated}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.9}
            >
              <View style={[styles.createAccountInner, { borderColor: AppTheme.orange }]}>
                <Ionicons name="person-add-outline" size={18} color={AppTheme.orange} />
                <ThemedText style={{ color: AppTheme.orange, fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
                  {t('profile.createAccount', lang)}
                </ThemedText>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Language Modal */}
        <LanguageModal
          visible={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          currentLang={lang}
          onSelect={settings.setLanguage}
        />
      </ThemedView>
    );
  }

  const initials = (profile?.full_name || user.email || '?')
    .split(' ')
    .map((n: string) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSinceDate = profile?.created_at ? new Date(profile.created_at) : null;
  const memberSince = memberSinceDate
    ? memberSinceDate.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Cover / Profile Header */}
        <View style={styles.coverContainer}>
          <LinearGradient
            colors={['#000', '#1a1000', '#000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.coverGradient, { paddingTop: insets.top }]}
          >
            {/* Top bar */}
            <View style={styles.coverTopBar}>
              <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>
                {t('profile.myAccount', lang)}
              </ThemedText>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => router.push('/(tabs)/notifications')}
              >
                <Ionicons name="notifications-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileSection}>
              {/* Avatar */}
              <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[AppTheme.orange, AppTheme.orangeDark]}
                    style={styles.avatarImage}
                  >
                    <ThemedText style={styles.avatarInitials}>{initials}</ThemedText>
                  </LinearGradient>
                )}
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={14} color={AppTheme.white} />
                </View>
              </TouchableOpacity>

              {/* Name & Email */}
              <View style={styles.profileTextContainer}>
                <ThemedText variant="title" size="lg" style={{ color: AppTheme.white }}>
                  {profile?.full_name || t('profile.user', lang)}
                </ThemedText>
                <ThemedText size="sm" style={{ color: '#999', marginTop: 2 }}>
                  {user.email}
                </ThemedText>
                {memberSince && (
                  <ThemedText size="xs" style={{ color: '#666', marginTop: 4 }}>
                    {t('profile.memberSince', lang)} {memberSince}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <TouchableOpacity
                style={styles.quickStatItem}
                onPress={() => router.push('/(tabs)/favorites')}
              >
                <Ionicons name="heart" size={18} color={AppTheme.orange} />
                <ThemedText size="sm" style={{ color: AppTheme.white, fontWeight: '600', marginTop: 4 }}>
                  {t('profile.favorites', lang)}
                </ThemedText>
              </TouchableOpacity>
              <View style={styles.quickStatDivider} />
              <TouchableOpacity
                style={styles.quickStatItem}
                onPress={() => router.push('/(tabs)/quotes')}
              >
                <Ionicons name="document-text" size={18} color={AppTheme.orange} />
                <ThemedText size="sm" style={{ color: AppTheme.white, fontWeight: '600', marginTop: 4 }}>
                  {t('profile.quotes', lang)}
                </ThemedText>
              </TouchableOpacity>
              <View style={styles.quickStatDivider} />
              <TouchableOpacity
                style={styles.quickStatItem}
                onPress={() => router.push('/(tabs)/orders')}
              >
                <Ionicons name="receipt" size={18} color={AppTheme.orange} />
                <ThemedText size="sm" style={{ color: AppTheme.white, fontWeight: '600', marginTop: 4 }}>
                  {t('profile.orders', lang)}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuContent}>
          {/* Navigation Section */}
          <SectionHeader title={t('profile.navigation', lang)} />
          <View style={[styles.menuSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <MenuItem
              icon="grid-outline"
              label={t('profile.dashboard', lang)}
              subtitle={t('profile.dashboardDesc', lang)}
              onPress={() => router.push('/dashboard')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="calculator-outline"
              label={t('profile.calculator', lang)}
              subtitle={t('profile.calculatorDesc', lang)}
              onPress={() => router.push('/calculator')}
            />
          </View>

          {/* Support Section */}
          <SectionHeader title={t('profile.support', lang)} />
          <View style={[styles.menuSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <MenuItem
              icon="chatbubbles-outline"
              label={t('profile.messages', lang)}
              onPress={() => router.push('/messages')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="help-circle-outline"
              label={t('profile.contactUs', lang)}
              subtitle={t('profile.contactUsDesc', lang)}
              onPress={() => {
                Alert.alert(
                  t('profile.contactUs', lang),
                  t('profile.contactUsDesc', lang),
                  [
                    {
                      text: 'WhatsApp',
                      onPress: () => Linking.openURL('https://wa.me/24177000000'),
                    },
                    {
                      text: 'Email',
                      onPress: () => Linking.openURL('mailto:contact@driveby-africa.com'),
                    },
                    {
                      text: lang === 'zh' ? '电话' : lang === 'en' ? 'Phone' : 'Téléphone',
                      onPress: () => Linking.openURL('tel:+24111000000'),
                    },
                    { text: t('common.cancel', lang), style: 'cancel' },
                  ]
                );
              }}
            />
          </View>

          {/* Settings Section */}
          <SectionHeader title={t('profile.settingsSection', lang)} />
          <View style={[styles.menuSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <MenuItem
              icon="language-outline"
              label={t('profile.language', lang)}
              rightText={`${languageFlag} ${languageLabel}`}
              onPress={() => setShowLanguageModal(true)}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="airplane-outline"
              label={t('profile.shippingCountry', lang)}
              rightText={profile?.country || settings.shippingCountry}
              onPress={() => router.push('/settings')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="cash-outline"
              label={t('profile.currency', lang)}
              rightText={profile?.preferred_currency || settings.currency}
              onPress={() => router.push('/settings')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="notifications-outline"
              label={t('profile.notifications', lang)}
              onPress={() => router.push('/(tabs)/notifications')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="settings-outline"
              label={t('profile.settings', lang)}
              subtitle={t('profile.settingsDesc', lang)}
              onPress={() => router.push('/settings')}
            />
          </View>

          {/* Logout Section */}
          <SectionHeader title={t('profile.other', lang)} />
          <View style={[styles.menuSection, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <MenuItem
              icon="document-outline"
              label={t('profile.terms', lang)}
              onPress={() => router.push('/terms')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="shield-outline"
              label={t('profile.privacy', lang)}
              onPress={() => router.push('/privacy')}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="log-out-outline"
              label={t('profile.logout', lang)}
              onPress={handleSignOut}
              danger
            />
          </View>

          {/* Version */}
          <View style={styles.version}>
            <ThemedText variant="muted" size="xs">
              Driveby Africa v1.0.0
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Language Modal */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        currentLang={lang}
        onSelect={settings.setLanguage}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Cover / Profile Header ──
  coverContainer: {
    overflow: 'hidden',
  },
  coverGradient: {
    paddingBottom: 20,
  },
  coverTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: AppTheme.orange,
  },
  avatarInitials: {
    color: AppTheme.white,
    fontSize: 26,
    fontWeight: '700',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppTheme.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppTheme.navyDark,
  },
  profileTextContainer: {
    flex: 1,
    marginLeft: 14,
  },

  // ── Quick Stats ──
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // ── Menu Content ──
  menuContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuSection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemSubtitle: {
    marginTop: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  version: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  // ── Auth Prompt ──
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarGradient: {
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
  createAccountButtonAnimated: {
    marginTop: 16,
  },
  createAccountInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
  },

  // ── Language Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionFlag: {
    fontSize: 24,
  },
  modalOptionLabel: {
    fontSize: 15,
  },
});
