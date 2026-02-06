import { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';

interface PaymentWebViewProps {
  visible: boolean;
  portalUrl: string;
  onClose: () => void;
  onCancel: () => void;
}

export function PaymentWebView({
  visible,
  portalUrl,
  onClose,
  onCancel,
}: PaymentWebViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const url = navState.url.toLowerCase();

    // Detect success pages - close WebView and trigger verification
    if (
      url.includes('remerciement') ||
      url.includes('callback') ||
      url.includes('success') ||
      url.includes('complete')
    ) {
      onClose();
    }

    // Detect cancel/error pages
    if (url.includes('cancel') || url.includes('error') || url.includes('failed')) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header noir */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="lock-closed" size={14} color="#22C55E" />
            <ThemedText style={styles.headerTitle}>Paiement sécurisé</ThemedText>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Ionicons name="close" size={20} color="#fff" />
            <ThemedText style={styles.cancelButtonText}>Annuler</ThemedText>
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={AppTheme.orange} />
              <ThemedText style={styles.loadingText}>Chargement du portail de paiement...</ThemedText>
            </View>
          )}

          <WebView
            ref={webViewRef}
            source={{ uri: portalUrl }}
            style={styles.webView}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
            }}
          />
        </View>

        {/* Footer Info */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.footerContent}>
            <Ionicons name="shield-checkmark" size={18} color="#22C55E" />
            <ThemedText variant="muted" size="xs" style={styles.footerText}>
              Transaction sécurisée par E-Billing. Vos données sont protégées.
            </ThemedText>
          </View>

          <View style={styles.instructionBox}>
            <Ionicons name="information-circle" size={18} color={AppTheme.orange} />
            <ThemedText variant="muted" size="xs" style={styles.instructionText}>
              Choisissez votre mode de paiement puis validez avec le code USSD sur votre téléphone.
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    gap: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    flex: 1,
    lineHeight: 16,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AppTheme.orange + '10',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  instructionText: {
    flex: 1,
    lineHeight: 18,
    color: AppTheme.orange,
  },
});
