import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuthStore, useSettingsStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { t, LANGUAGES, type Language } from '@/lib/i18n';
import { CURRENCIES as ALL_CURRENCIES, getCurrencyInfo } from '@/lib/currency';

// Popular currencies (shown first)
const POPULAR_CURRENCY_CODES = ['XAF', 'XOF', 'USD', 'EUR', 'NGN', 'GHS', 'KES', 'ZAR', 'MAD', 'EGP'];

// ── Countries ──
const COUNTRIES = [
  { id: 'Gabon', flag: '🇬🇦' },
  { id: 'Cameroun', flag: '🇨🇲' },
  { id: 'Congo', flag: '🇨🇬' },
  { id: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { id: 'Sénégal', flag: '🇸🇳' },
  { id: 'Mali', flag: '🇲🇱' },
  { id: 'Guinée', flag: '🇬🇳' },
  { id: 'Tchad', flag: '🇹🇩' },
  { id: 'RDC', flag: '🇨🇩' },
];

// ── Components ──

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  value?: string;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
}

function SettingItem({ icon, label, onPress, value, isSwitch, switchValue, onSwitchChange, danger, iconColor, iconBg }: SettingItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const iColor = danger ? colors.error : iconColor || AppTheme.orange;
  const iBg = danger ? colors.error + '15' : iconBg || AppTheme.orange + '15';

  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={isSwitch ? 1 : 0.7}
      disabled={isSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iBg }]}>
          <Ionicons name={icon} size={20} color={iColor} />
        </View>
        <ThemedText style={[styles.settingLabel, danger && { color: colors.error }]}>{label}</ThemedText>
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border, true: AppTheme.orange + '80' }}
          thumbColor={switchValue ? AppTheme.orange : colors.textMuted}
        />
      ) : (
        <View style={styles.settingRight}>
          {value && <ThemedText variant="muted" size="sm">{value}</ThemedText>}
          {!isSwitch && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Selection Modal ──
interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { id: string; label: string; flag?: string; nativeName?: string }[];
  selected: string;
  onSelect: (id: string) => void;
}

function SelectionModal({ visible, onClose, title, options, selected, onSelect }: SelectionModalProps) {
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
            {/* Handle */}
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Title */}
            <ThemedText variant="title" size="lg" style={styles.modalTitle}>
              {title}
            </ThemedText>

            {/* Options */}
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  { borderColor: colors.border },
                  selected === option.id && { borderColor: AppTheme.orange, backgroundColor: AppTheme.orange + '10' },
                ]}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
              >
                <View style={styles.modalOptionLeft}>
                  {option.flag && <ThemedText style={styles.modalOptionFlag}>{option.flag}</ThemedText>}
                  <View>
                    <ThemedText style={[styles.modalOptionLabel, selected === option.id && { color: AppTheme.orange, fontWeight: '600' }]}>
                      {option.label}
                    </ThemedText>
                    {option.nativeName && option.nativeName !== option.label && (
                      <ThemedText variant="muted" size="xs">{option.nativeName}</ThemedText>
                    )}
                  </View>
                </View>
                {selected === option.id && (
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

// ── Currency Selection Modal ──
interface CurrencySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (code: string) => void;
  lang: Language;
}

function CurrencySelectionModal({ visible, onClose, selected, onSelect, lang }: CurrencySelectionModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');

  // Filter and sort currencies
  const filteredCurrencies = ALL_CURRENCIES.filter(c => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      c.code.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search) ||
      c.countries.some(country => country.toLowerCase().includes(search))
    );
  });

  // Separate popular and other currencies
  const popularCurrencies = filteredCurrencies.filter(c => POPULAR_CURRENCY_CODES.includes(c.code));
  const otherCurrencies = filteredCurrencies.filter(c => !POPULAR_CURRENCY_CODES.includes(c.code));

  // Sort popular by order in POPULAR_CURRENCY_CODES
  popularCurrencies.sort((a, b) =>
    POPULAR_CURRENCY_CODES.indexOf(a.code) - POPULAR_CURRENCY_CODES.indexOf(b.code)
  );

  const handleSelect = (code: string) => {
    onSelect(code);
    setSearchText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View
          style={[
            styles.currencyModalContent,
            { backgroundColor: colors.cardBg, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Title */}
            <ThemedText variant="title" size="lg" style={styles.modalTitle}>
              {t('settings.selectCurrency', lang)}
            </ThemedText>

            {/* Search Input */}
            <View style={[styles.currencySearchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.currencySearchInput, { color: colors.textPrimary }]}
                placeholder={t('currency.searchCurrency', lang)}
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
              {/* Popular Currencies */}
              {popularCurrencies.length > 0 && !searchText && (
                <>
                  <ThemedText variant="muted" size="xs" style={styles.currencySectionTitle}>
                    {t('currency.popularCurrencies', lang)}
                  </ThemedText>
                  {popularCurrencies.map(currency => (
                    <TouchableOpacity
                      key={currency.code}
                      style={[
                        styles.currencyOption,
                        { borderColor: colors.border },
                        selected === currency.code && { borderColor: AppTheme.orange, backgroundColor: AppTheme.orange + '10' },
                      ]}
                      onPress={() => handleSelect(currency.code)}
                    >
                      <View style={styles.currencyOptionLeft}>
                        <View style={[styles.currencySymbolBadge, { backgroundColor: AppTheme.orange + '15' }]}>
                          <ThemedText style={styles.currencySymbolText}>{currency.symbol}</ThemedText>
                        </View>
                        <View style={styles.currencyInfo}>
                          <ThemedText style={[styles.currencyCode, selected === currency.code && { color: AppTheme.orange }]}>
                            {currency.code}
                          </ThemedText>
                          <ThemedText variant="muted" size="xs" numberOfLines={1}>
                            {currency.name}
                          </ThemedText>
                        </View>
                      </View>
                      {selected === currency.code && (
                        <Ionicons name="checkmark-circle" size={22} color={AppTheme.orange} />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* All/Other Currencies */}
              {(otherCurrencies.length > 0 || searchText) && (
                <>
                  <ThemedText variant="muted" size="xs" style={[styles.currencySectionTitle, { marginTop: searchText ? 0 : 16 }]}>
                    {searchText ? `${filteredCurrencies.length} ${lang === 'fr' ? 'résultat(s)' : lang === 'zh' ? '个结果' : 'result(s)'}` : t('currency.allCurrencies', lang)}
                  </ThemedText>
                  {(searchText ? filteredCurrencies : otherCurrencies).map(currency => (
                    <TouchableOpacity
                      key={currency.code}
                      style={[
                        styles.currencyOption,
                        { borderColor: colors.border },
                        selected === currency.code && { borderColor: AppTheme.orange, backgroundColor: AppTheme.orange + '10' },
                      ]}
                      onPress={() => handleSelect(currency.code)}
                    >
                      <View style={styles.currencyOptionLeft}>
                        <View style={[styles.currencySymbolBadge, { backgroundColor: colors.surface }]}>
                          <ThemedText style={styles.currencySymbolText}>{currency.symbol}</ThemedText>
                        </View>
                        <View style={styles.currencyInfo}>
                          <ThemedText style={[styles.currencyCode, selected === currency.code && { color: AppTheme.orange }]}>
                            {currency.code}
                          </ThemedText>
                          <ThemedText variant="muted" size="xs" numberOfLines={1}>
                            {currency.name}
                          </ThemedText>
                        </View>
                      </View>
                      {selected === currency.code && (
                        <Ionicons name="checkmark-circle" size={22} color={AppTheme.orange} />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* No results */}
              {filteredCurrencies.length === 0 && searchText && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                  <ThemedText variant="muted" style={{ marginTop: 8 }}>
                    {lang === 'fr' ? 'Aucune devise trouvée' : lang === 'zh' ? '未找到货币' : 'No currency found'}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Profile Edit Modal ──
interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
}

function ProfileEditModal({ visible, onClose }: ProfileEditModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuthStore();
  const { language } = useSettingsStore();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp_number || '');
  const [country, setCountry] = useState(profile?.country || 'Gabon');
  const [city, setCity] = useState(profile?.city || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setWhatsapp(profile.whatsapp_number || '');
      setCountry(profile.country || 'Gabon');
      setCity(profile.city || '');
    }
  }, [visible, profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          whatsapp_number: whatsapp.trim() || null,
          country: country,
          city: city.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert(t('common.success', language), t('settings.saved', language));
      onClose();
    } catch (error) {
      Alert.alert(t('common.error', language), t('settings.saveError', language));
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCountryFlag = COUNTRIES.find(c => c.id === country)?.flag || '🌍';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.fullModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
            <TouchableOpacity onPress={onClose} style={styles.fullModalBackBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <ThemedText variant="title" style={{ color: '#FFF' }}>
              {t('settings.editProfile', language)}
            </ThemedText>
            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.fullModalSaveBtn}>
              {isSaving ? (
                <ActivityIndicator size="small" color={AppTheme.orange} />
              ) : (
                <ThemedText style={{ color: AppTheme.orange, fontWeight: '700' }}>
                  {t('settings.save', language)}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Full Name */}
            <View style={styles.formGroup}>
              <ThemedText variant="muted" size="sm" style={styles.formLabel}>
                {t('settings.fullName', language)}
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('settings.fullName', language)}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Email (read-only) */}
            <View style={styles.formGroup}>
              <ThemedText variant="muted" size="sm" style={styles.formLabel}>
                {t('settings.email', language)}
              </ThemedText>
              <View style={[styles.formInput, styles.formInputDisabled, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ThemedText variant="muted">{user?.email || ''}</ThemedText>
                <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
              <ThemedText variant="muted" size="sm" style={styles.formLabel}>
                {t('settings.phone', language)}
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+241 XX XX XX XX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* WhatsApp */}
            <View style={styles.formGroup}>
              <ThemedText variant="muted" size="sm" style={styles.formLabel}>
                {t('settings.whatsapp', language)}
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="+241 XX XX XX XX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Country */}
            <View style={styles.formGroup}>
              <ThemedText variant="muted" size="sm" style={styles.formLabel}>
                {t('settings.country', language)}
              </ThemedText>
              <TouchableOpacity
                style={[styles.formInput, styles.formInputSelect, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowCountryPicker(true)}
              >
                <ThemedText>{selectedCountryFlag} {country}</ThemedText>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* City */}
            <View style={styles.formGroup}>
              <ThemedText variant="muted" size="sm" style={styles.formLabel}>
                {t('settings.city', language)}
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={city}
                onChangeText={setCity}
                placeholder={t('settings.city', language)}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.saveButtonText}>
                  {t('settings.save', language)}
                </ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Country Picker */}
          <SelectionModal
            visible={showCountryPicker}
            onClose={() => setShowCountryPicker(false)}
            title={t('settings.country', language)}
            options={COUNTRIES.map(c => ({ id: c.id, label: c.id, flag: c.flag }))}
            selected={country}
            onSelect={setCountry}
          />
        </KeyboardAvoidingView>
      </ThemedView>
    </Modal>
  );
}

// ── Main Settings Screen ──
export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();
  const settings = useSettingsStore();
  const lang = settings.language;

  // Initialize settings store
  useEffect(() => {
    if (!settings.isInitialized) {
      settings.initialize();
    }
  }, []);

  // Modals
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Theme options
  const THEME_OPTIONS = [
    { id: 'system', label: t('settings.themeSystem', lang), flag: '⚙️' },
    { id: 'light', label: t('settings.themeLight', lang), flag: '☀️' },
    { id: 'dark', label: t('settings.themeDark', lang), flag: '🌙' },
  ];
  const currentThemeId = settings.darkMode === null ? 'system' : settings.darkMode ? 'dark' : 'light';
  const currentThemeLabel = THEME_OPTIONS.find(o => o.id === currentThemeId)?.label || '';
  const currentThemeIcon = THEME_OPTIONS.find(o => o.id === currentThemeId)?.flag || '⚙️';

  const handleSignOut = () => {
    Alert.alert(
      t('common.disconnect', lang),
      t('settings.signOutConfirm', lang),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        {
          text: t('common.disconnect', lang),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount', lang),
      t('settings.deleteConfirm', lang),
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        {
          text: t('common.delete', lang),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('common.info', lang), t('settings.deleteInfo', lang));
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      t('settings.changePassword', lang),
      lang === 'fr'
        ? 'Un email de réinitialisation sera envoyé à votre adresse.'
        : lang === 'zh'
        ? '重置密码邮件将发送到您的邮箱。'
        : 'A password reset email will be sent to your address.',
      [
        { text: t('common.cancel', lang), style: 'cancel' },
        {
          text: t('common.confirm', lang),
          onPress: async () => {
            const email = user?.email;
            if (!email) return;
            try {
              await supabase.auth.resetPasswordForEmail(email);
              Alert.alert(
                t('common.success', lang),
                lang === 'fr'
                  ? 'Email de réinitialisation envoyé.'
                  : lang === 'zh'
                  ? '重置邮件已发送。'
                  : 'Reset email sent.'
              );
            } catch {
              Alert.alert(t('common.error', lang), t('settings.saveError', lang));
            }
          },
        },
      ]
    );
  };

  const languageLabel = LANGUAGES.find(l => l.id === lang)?.label || 'Français';
  const languageFlag = LANGUAGES.find(l => l.id === lang)?.flag || '🇫🇷';
  const currencyInfo = getCurrencyInfo(settings.currency);
  const currencyLabel = currencyInfo?.symbol || settings.currency;
  const countryFlag = COUNTRIES.find(c => c.id === settings.shippingCountry)?.flag || '🌍';

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>
          {t('settings.title', lang)}
        </ThemedText>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText variant="muted" size="xs" style={styles.sectionTitle}>
            {t('settings.profile', lang)}
          </ThemedText>
          <SettingItem
            icon="person-outline"
            label={t('settings.editProfile', lang)}
            onPress={() => setShowProfileEdit(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="lock-closed-outline"
            label={t('settings.changePassword', lang)}
            onPress={handleChangePassword}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="mail-outline"
            label={t('settings.email', lang)}
            value={user?.email || ''}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="call-outline"
            label={t('settings.phone', lang)}
            value={profile?.phone || t('common.notProvided', lang)}
            onPress={() => setShowProfileEdit(true)}
          />
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText variant="muted" size="xs" style={styles.sectionTitle}>
            {t('settings.notifications', lang)}
          </ThemedText>
          <SettingItem
            icon="notifications-outline"
            label={t('settings.pushNotifications', lang)}
            isSwitch
            switchValue={settings.pushNotifications}
            onSwitchChange={settings.setPushNotifications}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="mail-outline"
            label={t('settings.emailNotifications', lang)}
            isSwitch
            switchValue={settings.emailNotifications}
            onSwitchChange={settings.setEmailNotifications}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="logo-whatsapp"
            label={t('settings.whatsappNotifications', lang)}
            isSwitch
            switchValue={settings.whatsappNotifications}
            onSwitchChange={settings.setWhatsappNotifications}
            iconColor="#25D366"
            iconBg="#25D36615"
          />
        </View>

        {/* Preferences Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText variant="muted" size="xs" style={styles.sectionTitle}>
            {t('settings.preferences', lang)}
          </ThemedText>
          <SettingItem
            icon="language-outline"
            label={t('settings.language', lang)}
            value={`${languageFlag} ${languageLabel}`}
            onPress={() => setShowLanguageModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="airplane-outline"
            label={t('settings.shippingCountry', lang)}
            value={`${countryFlag} ${settings.shippingCountry}`}
            onPress={() => setShowCountryModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="cash-outline"
            label={t('settings.currency', lang)}
            value={`${settings.currency} (${currencyLabel})`}
            onPress={() => setShowCurrencyModal(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="moon-outline"
            label={t('settings.appearance', lang)}
            value={`${currentThemeIcon} ${currentThemeLabel}`}
            onPress={() => setShowThemeModal(true)}
          />
        </View>

        {/* Support Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText variant="muted" size="xs" style={styles.sectionTitle}>
            {t('settings.support', lang)}
          </ThemedText>
          <SettingItem
            icon="help-circle-outline"
            label={t('settings.helpCenter', lang)}
            onPress={() => {}}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="chatbubble-outline"
            label={t('settings.contactUs', lang)}
            onPress={() => router.push('/messages')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="document-text-outline"
            label={t('settings.terms', lang)}
            onPress={() => router.push('/terms')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="shield-checkmark-outline"
            label={t('settings.privacy', lang)}
            onPress={() => router.push('/privacy')}
          />
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <ThemedText variant="muted" size="xs" style={styles.sectionTitle}>
            {t('settings.dangerZone', lang)}
          </ThemedText>
          <SettingItem
            icon="log-out-outline"
            label={t('settings.signOut', lang)}
            onPress={handleSignOut}
            danger
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem
            icon="trash-outline"
            label={t('settings.deleteAccount', lang)}
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* App Version */}
        <View style={styles.version}>
          <ThemedText variant="muted" size="xs">Driveby Africa</ThemedText>
          <ThemedText variant="muted" size="xs">{t('common.version', lang)} 1.0.0</ThemedText>
        </View>
      </ScrollView>

      {/* ── Modals ── */}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        visible={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
      />

      {/* Language Selection Modal */}
      <SelectionModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title={t('settings.selectLanguage', lang)}
        options={LANGUAGES.map(l => ({ id: l.id, label: l.label, flag: l.flag, nativeName: l.nativeName }))}
        selected={settings.language}
        onSelect={(id) => settings.setLanguage(id as Language)}
      />

      {/* Currency Selection Modal */}
      <CurrencySelectionModal
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        selected={settings.currency}
        onSelect={settings.setCurrency}
        lang={lang}
      />

      {/* Shipping Country Modal */}
      <SelectionModal
        visible={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        title={t('settings.shippingCountry', lang)}
        options={COUNTRIES.map(c => ({ id: c.id, label: c.id, flag: c.flag }))}
        selected={settings.shippingCountry}
        onSelect={settings.setShippingCountry}
      />

      {/* Theme Selection Modal */}
      <SelectionModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        title={t('settings.appearance', lang)}
        options={THEME_OPTIONS}
        selected={currentThemeId}
        onSelect={(id) => {
          const value = id === 'system' ? null : id === 'dark';
          settings.setDarkMode(value);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBackBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Sections ──
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    marginLeft: 12,
    fontSize: 15,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  version: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },

  // ── Selection Modal ──
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

  // ── Profile Edit Modal ──
  fullModal: {
    flex: 1,
  },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  fullModalBackBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalSaveBtn: {
    paddingHorizontal: 4,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  formInputDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.6,
  },
  formInputSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: AppTheme.orange,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Currency Modal ──
  currencyModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  currencySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  currencySearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  currencyList: {
    maxHeight: 400,
  },
  currencySectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  currencyOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  currencySymbolBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbolText: {
    fontSize: 14,
    fontWeight: '700',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '600',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});
