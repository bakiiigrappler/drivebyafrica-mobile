import { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { AppTheme } from '@/constants/Colors';
import { COUNTRIES, Country, DEFAULT_COUNTRY, getCountryByCode } from '@/constants/countries';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onChangeCountry?: (country: Country) => void;
  defaultCountry?: Country;
  error?: string;
  placeholder?: string;
  autoDetectCountry?: boolean;
}

export function PhoneInput({
  value,
  onChangeText,
  onChangeCountry,
  defaultCountry,
  error,
  placeholder = 'Numéro de téléphone',
  autoDetectCountry = true,
}: PhoneInputProps) {
  const insets = useSafeAreaInsets();
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry || DEFAULT_COUNTRY);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(autoDetectCountry);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Auto-detect country from IP on mount
  useEffect(() => {
    if (autoDetectCountry && !defaultCountry) {
      detectCountryFromIP();
    }
  }, []);

  const detectCountryFromIP = async () => {
    try {
      setIsDetecting(true);
      const response = await fetch('https://ip-api.com/json/?fields=countryCode');
      const data = await response.json();

      if (data.countryCode) {
        const detectedCountry = getCountryByCode(data.countryCode);
        if (detectedCountry) {
          setSelectedCountry(detectedCountry);
          onChangeCountry?.(detectedCountry);
        }
      }
    } catch (error) {
      console.log('Could not detect country from IP:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = () => {
    setModalVisible(true);
    setSearchQuery('');
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
    });
  };

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    onChangeCountry?.(country);
    closeModal();
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        item.code === selectedCountry.code && styles.countryItemSelected,
      ]}
      onPress={() => handleSelectCountry(item)}
      activeOpacity={0.7}
    >
      <ThemedText style={styles.countryFlag}>{item.flag}</ThemedText>
      <View style={styles.countryInfo}>
        <ThemedText style={styles.countryName}>{item.name}</ThemedText>
        <ThemedText style={styles.countryDialCode}>{item.dialCode}</ThemedText>
      </View>
      {item.code === selectedCountry.code && (
        <Ionicons name="checkmark-circle" size={22} color={AppTheme.orange} />
      )}
    </TouchableOpacity>
  );

  return (
    <View>
      <View style={[styles.container, error && styles.containerError]}>
        {/* Country Selector Button */}
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={openModal}
          activeOpacity={0.7}
          disabled={isDetecting}
        >
          {isDetecting ? (
            <ActivityIndicator size="small" color={AppTheme.orange} style={{ marginRight: 8 }} />
          ) : (
            <ThemedText style={styles.flag}>{selectedCountry.flag}</ThemedText>
          )}
          <ThemedText style={styles.dialCode}>{selectedCountry.dialCode}</ThemedText>
          <Ionicons
            name="chevron-down"
            size={16}
            color="rgba(255,255,255,0.5)"
            style={styles.chevron}
          />
        </TouchableOpacity>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Phone Input */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {/* Country Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropAnim }]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={closeModal}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Modal Content */}
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Sélectionner un pays</ThemedText>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher un pays..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={renderCountryItem}
              style={styles.countryList}
              contentContainerStyle={styles.countryListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={10}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={48} color="rgba(255,255,255,0.2)" />
                  <ThemedText style={styles.emptyText}>Aucun pays trouvé</ThemedText>
                </View>
              }
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  containerError: {
    borderColor: '#EF4444',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  flag: {
    fontSize: 22,
    marginRight: 6,
  },
  dialCode: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 4,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#1f1f1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.7,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#fff',
  },
  countryList: {
    flex: 1,
  },
  countryListContent: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  countryItemSelected: {
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  countryFlag: {
    fontSize: 28,
    marginRight: 14,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  countryDialCode: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
});
