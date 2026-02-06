import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuthStore } from '@/store';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useInvalidateQuotes } from '@/hooks/useQuotes';
import { useCreateOrderFromQuote } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { PaymentWebView } from '@/components/payment/PaymentWebView';
import { PaymentVerificationView } from '@/components/payment/PaymentVerificationView';
import { createPayment, type PaymentStatusResult } from '@/lib/payment';
import type { Quote } from '@/types';

interface QuoteValidationModalProps {
  visible: boolean;
  onClose: () => void;
  quote: Quote | null;
}

// Deposit amount in USD (source of truth)
const DEPOSIT_AMOUNT_USD = 1000;

type PaymentStep = 'initial' | 'webview' | 'verification';

export function QuoteValidationModal({ visible, onClose, quote }: QuoteValidationModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useSnackbar();
  const { invalidateLists } = useInvalidateQuotes();
  const { formatPrice, convertToLocal } = useCurrency();
  const createOrderMutation = useCreateOrderFromQuote();

  // Format deposit amount dynamically
  const depositFormatted = formatPrice(DEPOSIT_AMOUNT_USD);
  const depositLocal = Math.round(convertToLocal(DEPOSIT_AMOUNT_USD));

  // Steps with dynamic pricing
  const STEPS = [
    {
      icon: 'card-outline' as const,
      title: "Paiement de l'acompte",
      description: `${DEPOSIT_AMOUNT_USD.toLocaleString()} USD (${depositFormatted}) pour bloquer le véhicule et lancer l'inspection.`,
      active: true,
    },
    {
      icon: 'document-text-outline' as const,
      title: "Inspection détaillée",
      description: "Nos experts vérifient le véhicule et vous envoient un rapport complet.",
      active: false,
    },
    {
      icon: 'wallet-outline' as const,
      title: "Paiement du solde",
      description: "Vous validez l'achat final et réglez le reste du montant.",
      active: false,
    },
    {
      icon: 'boat-outline' as const,
      title: "Expédition",
      description: "Le véhicule est chargé et expédié vers votre destination.",
      active: false,
    },
  ];

  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('initial');
  const [webViewData, setWebViewData] = useState<{
    portalUrl: string;
    externalReference: string;
  } | null>(null);

  if (!quote) return null;

  const handleClose = () => {
    setIsPaymentLoading(false);
    setIsDemoLoading(false);
    setPaymentStep('initial');
    setWebViewData(null);
    onClose();
  };

  // Initiate payment - opens E-Billing portal directly
  const handlePayment = async () => {
    if (!user) {
      showSnackbar({ message: 'Vous devez être connecté', type: 'error' });
      return;
    }

    setIsPaymentLoading(true);

    try {
      const description = `Acompte devis ${quote.quote_number} - ${quote.vehicle_make} ${quote.vehicle_model}`;

      const result = await createPayment(
        user.id,
        depositLocal,
        description,
        user.email || undefined,
        profile?.whatsapp_number || undefined
      );

      setWebViewData({
        portalUrl: result.portalUrl,
        externalReference: result.externalReference,
      });
      setPaymentStep('webview');
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      showSnackbar({
        message: error.message || 'Erreur lors de l\'initiation du paiement',
        type: 'error'
      });
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // WebView closed - start verification
  const handleWebViewClose = () => {
    setPaymentStep('verification');
  };

  // WebView cancelled
  const handleWebViewCancel = () => {
    showSnackbar({ message: 'Paiement annulé', type: 'warning' });
    setPaymentStep('initial');
    setWebViewData(null);
  };

  // Verification successful
  const handleVerificationSuccess = async (_status: PaymentStatusResult) => {
    await processSuccessfulPayment(webViewData?.externalReference);
  };

  // Verification cancelled
  const handleVerificationCancel = () => {
    showSnackbar({ message: 'Vérification annulée', type: 'warning' });
    setPaymentStep('initial');
    setWebViewData(null);
  };

  // Verification timeout
  const handleVerificationTimeout = () => {
    showSnackbar({
      message: 'Délai de vérification dépassé. Si vous avez payé, contactez le support.',
      type: 'warning',
      duration: 5000,
    });
  };

  // Process successful payment - create order using the hook
  const processSuccessfulPayment = async (paymentReference?: string) => {
    if (!user || !quote) return;

    showSnackbar({ message: 'Paiement validé! Création de la commande...', type: 'success' });

    try {
      await createOrderMutation.mutateAsync({
        quoteId: quote.id,
        vehicleId: quote.vehicle_id,
        vehicleMake: quote.vehicle_make,
        vehicleModel: quote.vehicle_model,
        vehicleYear: quote.vehicle_year,
        vehicleSource: quote.vehicle_source,
        vehiclePriceUsd: quote.vehicle_price_usd,
        destinationName: quote.destination_name,
        destinationCountry: quote.destination_country,
        shippingType: quote.shipping_type as 'container' | 'groupage',
        shippingCostXaf: quote.shipping_cost_xaf,
        insuranceCostXaf: quote.insurance_cost_xaf,
        totalCostXaf: quote.total_cost_xaf,
        depositAmountUsd: DEPOSIT_AMOUNT_USD,
        depositAmountXaf: depositLocal,
        depositPaymentReference: paymentReference || webViewData?.externalReference || 'DEMO',
        depositPaymentMethod: paymentReference ? 'mobile_money' : 'demo',
        customerName: profile?.full_name || undefined,
        customerEmail: user.email || undefined,
        customerWhatsapp: profile?.whatsapp_number || undefined,
      });

      // Invalidate quotes cache
      invalidateLists();

      showSnackbar({ message: 'Commande créée avec succès!', type: 'success' });

      // Close modal and navigate to orders
      handleClose();
      router.push('/(tabs)/orders');
    } catch (error) {
      console.error('Order creation error:', error);
      showSnackbar({ message: 'Erreur lors de la création de la commande', type: 'error' });
      setIsDemoLoading(false);
    }
  };

  // Demo payment handler (for testing)
  const handleDemoPayment = async () => {
    if (!user) {
      showSnackbar({ message: 'Vous devez être connecté', type: 'error' });
      return;
    }

    setIsDemoLoading(true);
    showSnackbar({ message: 'Simulation du paiement en cours...', type: 'info' });

    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    await processSuccessfulPayment();
  };

  return (
    <>
      <Modal
        visible={visible && paymentStep === 'initial'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <ThemedText variant="title" size="lg">Validation du devis</ThemedText>
              <ThemedText variant="muted" size="sm" numberOfLines={1}>
                {quote.vehicle_make} {quote.vehicle_model} ({quote.vehicle_year}) - N° {quote.quote_number}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Guarantee Info */}
            <View style={[styles.infoCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <View style={[styles.infoIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={[styles.infoTitle, { color: '#1E40AF' }]}>
                  Garantie Driveby Africa
                </ThemedText>
                <ThemedText style={[styles.infoText, { color: '#1D4ED8' }]}>
                  Votre acompte est sécurisé. Si le rapport d'inspection ne vous satisfait pas, vous pouvez choisir un autre véhicule ou demander un remboursement intégral.
                </ThemedText>
              </View>
            </View>

            {/* Timeline Steps */}
            <View style={styles.stepsSection}>
              <ThemedText style={styles.sectionTitle}>PROCHAINES ÉTAPES</ThemedText>
              <View style={styles.stepsContainer}>
                {STEPS.map((step, index) => (
                  <View key={index} style={styles.stepRow}>
                    <View style={styles.stepLine}>
                      <View
                        style={[
                          styles.stepIcon,
                          { backgroundColor: step.active ? AppTheme.orange : colors.surface },
                        ]}
                      >
                        <Ionicons name={step.icon} size={20} color={step.active ? '#fff' : colors.textMuted} />
                      </View>
                      {index < STEPS.length - 1 && (
                        <View style={[styles.connector, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <ThemedText
                        style={[styles.stepTitle, step.active && { color: AppTheme.orange }]}
                      >
                        {step.title}
                      </ThemedText>
                      <ThemedText variant="muted" size="sm" style={styles.stepDescription}>
                        {step.description}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment Section */}
            <View style={[styles.paymentCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <View style={styles.paymentHeader}>
                <View style={[styles.paymentIcon, { backgroundColor: '#22C55E' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                </View>
                <View style={styles.paymentInfo}>
                  <ThemedText style={styles.paymentTitle}>
                    Acompte pour bloquer le véhicule
                  </ThemedText>
                  <ThemedText style={[styles.paymentSubtitle, { color: '#6B7280' }]}>
                    Déclenche l'inspection détaillée du véhicule
                  </ThemedText>
                </View>
              </View>

              <View style={styles.paymentAmount}>
                <ThemedText style={styles.amountValue}>{DEPOSIT_AMOUNT_USD.toLocaleString()} USD</ThemedText>
                <ThemedText style={styles.amountEquiv}>≈ {depositFormatted}</ThemedText>
              </View>

              {/* Payment Methods Info */}
              <View style={[styles.methodsInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ThemedText style={styles.methodsTitle}>Modes de paiement acceptés</ThemedText>
                <View style={styles.methodsList}>
                  <View style={styles.methodItem}>
                    <ThemedText style={styles.methodEmoji}>📱</ThemedText>
                    <ThemedText variant="muted" size="sm">Airtel Money</ThemedText>
                  </View>
                  <View style={styles.methodItem}>
                    <ThemedText style={styles.methodEmoji}>📱</ThemedText>
                    <ThemedText variant="muted" size="sm">Moov Money</ThemedText>
                  </View>
                  <View style={styles.methodItem}>
                    <Ionicons name="card-outline" size={18} color={colors.textMuted} />
                    <ThemedText variant="muted" size="sm">Visa / Mastercard</ThemedText>
                  </View>
                </View>
              </View>

              {/* Main Payment Button */}
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: AppTheme.orange }]}
                onPress={handlePayment}
                disabled={isPaymentLoading || isDemoLoading}
              >
                {isPaymentLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={20} color="#fff" />
                    <ThemedText style={styles.payButtonText}>
                      Payer l'acompte - {depositFormatted}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              {/* Demo Button */}
              <TouchableOpacity
                style={[styles.demoButton, { borderColor: AppTheme.orange }]}
                onPress={handleDemoPayment}
                disabled={isPaymentLoading || isDemoLoading}
              >
                {isDemoLoading ? (
                  <ActivityIndicator size="small" color={AppTheme.orange} />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color={AppTheme.orange} />
                    <ThemedText style={[styles.demoButtonText, { color: AppTheme.orange }]}>
                      Mode Demo (test)
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.closeFullButton, { borderColor: colors.border }]}
              onPress={handleClose}
            >
              <ThemedText style={{ fontWeight: '600' }}>Fermer</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment WebView */}
      {webViewData && (
        <PaymentWebView
          visible={paymentStep === 'webview'}
          portalUrl={webViewData.portalUrl}
          onClose={handleWebViewClose}
          onCancel={handleWebViewCancel}
        />
      )}

      {/* Payment Verification View */}
      {webViewData && (
        <PaymentVerificationView
          visible={paymentStep === 'verification'}
          externalReference={webViewData.externalReference}
          onSuccess={handleVerificationSuccess}
          onCancel={handleVerificationCancel}
          onTimeout={handleVerificationTimeout}
        />
      )}
    </>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  stepsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#6B7280',
    marginBottom: 16,
  },
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stepLine: {
    alignItems: 'center',
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    height: 32,
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 16,
  },
  stepTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  stepDescription: {
    lineHeight: 18,
  },
  paymentCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111827',
  },
  paymentSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentAmount: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#22C55E',
  },
  amountEquiv: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  methodsInfo: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  methodsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  methodsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  methodItem: {
    alignItems: 'center',
    gap: 4,
  },
  methodEmoji: {
    fontSize: 18,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  closeFullButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
