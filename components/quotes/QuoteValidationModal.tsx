import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
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
import { API_URL } from '@/constants';
import { supabase } from '@/lib/supabase';
import type { Quote } from '@/types';

const isIOS = Platform.OS === 'ios';

interface QuoteValidationModalProps {
  visible: boolean;
  onClose: () => void;
  /** Single quote or array of grouped quotes (container 40ft) */
  quotes: Quote[];
}

// Deposit amount per vehicle in USD
const DEPOSIT_PER_VEHICLE_USD = 1000;

type PaymentStep = 'initial' | 'webview' | 'verification';

export function QuoteValidationModal({ visible, onClose, quotes }: QuoteValidationModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useSnackbar();
  const { invalidateLists } = useInvalidateQuotes();
  const { formatPrice, convertToLocal } = useCurrency();
  const createOrderMutation = useCreateOrderFromQuote();

  const vehicleCount = quotes.length;
  const isGrouped = vehicleCount > 1;
  const totalDepositUSD = DEPOSIT_PER_VEHICLE_USD * vehicleCount;

  // Format deposit amount dynamically
  const depositFormatted = formatPrice(totalDepositUSD);
  const depositLocal = Math.round(convertToLocal(totalDepositUSD));
  const depositPerVehicleFormatted = formatPrice(DEPOSIT_PER_VEHICLE_USD);

  // Total cost sum for grouped quotes
  const totalCostXAF = quotes.reduce((sum, q) => sum + q.total_cost_xaf, 0);

  // Steps with dynamic pricing
  const STEPS = [
    {
      icon: 'card-outline' as const,
      title: "Paiement de l'acompte",
      description: isGrouped
        ? `${totalDepositUSD.toLocaleString()} USD (${depositFormatted}) pour bloquer les ${vehicleCount} véhicules et lancer les inspections.`
        : `${DEPOSIT_PER_VEHICLE_USD.toLocaleString()} USD (${depositPerVehicleFormatted}) pour bloquer le véhicule et lancer l'inspection.`,
      active: true,
    },
    {
      icon: 'document-text-outline' as const,
      title: "Inspection détaillée",
      description: isGrouped
        ? "Nos experts vérifient chaque véhicule et vous envoient les rapports complets."
        : "Nos experts vérifient le véhicule et vous envoient un rapport complet.",
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
      description: isGrouped
        ? "Les véhicules sont chargés dans le container 40ft et expédiés."
        : "Le véhicule est chargé et expédié vers votre destination.",
      active: false,
    },
  ];

  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isWhatsAppSending, setIsWhatsAppSending] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('initial');
  const [webViewData, setWebViewData] = useState<{
    portalUrl: string;
    externalReference: string;
  } | null>(null);

  if (quotes.length === 0) return null;

  // Use first quote for shared info (destination, source)
  const firstQuote = quotes[0];
  const vehiclesSummary = quotes.map(q => `${q.vehicle_make} ${q.vehicle_model}`).join(' + ');

  const handleClose = () => {
    setIsPaymentLoading(false);
    setIsWhatsAppSending(false);
    setWhatsAppSent(false);
    setPaymentStep('initial');
    setWebViewData(null);
    onClose();
  };

  // Initiate payment
  const handlePayment = async () => {
    if (!user) {
      showSnackbar({ message: 'Vous devez être connecté', type: 'error' });
      return;
    }

    setIsPaymentLoading(true);

    try {
      const quoteNumbers = quotes.map(q => q.quote_number).join(', ');
      const description = isGrouped
        ? `Acompte container 40ft (${vehicleCount} véh.) - ${quoteNumbers}`
        : `Acompte devis ${firstQuote.quote_number} - ${firstQuote.vehicle_make} ${firstQuote.vehicle_model}`;

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

  const handleWebViewClose = () => {
    setPaymentStep('verification');
  };

  const handleWebViewCancel = () => {
    showSnackbar({ message: 'Paiement annulé', type: 'warning' });
    setPaymentStep('initial');
    setWebViewData(null);
  };

  const handleVerificationSuccess = async (_status: PaymentStatusResult) => {
    await processSuccessfulPayment(webViewData?.externalReference);
  };

  const handleVerificationCancel = () => {
    showSnackbar({ message: 'Vérification annulée', type: 'warning' });
    setPaymentStep('initial');
    setWebViewData(null);
  };

  const handleVerificationTimeout = () => {
    showSnackbar({
      message: 'Délai de vérification dépassé. Si vous avez payé, contactez le support.',
      type: 'warning',
      duration: 5000,
    });
  };

  // Process successful payment - create one order per quote
  const processSuccessfulPayment = async (paymentReference?: string) => {
    if (!user) return;

    showSnackbar({
      message: isGrouped
        ? `Paiement validé! Création des ${vehicleCount} commandes...`
        : 'Paiement validé! Création de la commande...',
      type: 'success',
    });

    try {
      const depositPerVehicleLocal = Math.round(convertToLocal(DEPOSIT_PER_VEHICLE_USD));

      for (const quote of quotes) {
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
          depositAmountUsd: DEPOSIT_PER_VEHICLE_USD,
          depositAmountXaf: depositPerVehicleLocal,
          depositPaymentReference: paymentReference || webViewData?.externalReference || 'DEMO',
          depositPaymentMethod: paymentReference ? 'mobile_money' : 'demo',
          customerName: profile?.full_name || undefined,
          customerEmail: user.email || undefined,
          customerWhatsapp: profile?.whatsapp_number || undefined,
        });
      }

      invalidateLists();

      showSnackbar({
        message: isGrouped
          ? `${vehicleCount} commandes créées avec succès!`
          : 'Commande créée avec succès!',
        type: 'success',
      });

      handleClose();
      router.push('/(tabs)/orders');
    } catch (error) {
      console.error('Order creation error:', error);
      showSnackbar({ message: 'Erreur lors de la création de la commande', type: 'error' });
    }
  };

  // iOS: send WhatsApp message with payment link via web API
  const handleiOSValidation = async () => {
    if (!user) {
      showSnackbar({ message: 'Vous devez être connecté', type: 'error' });
      return;
    }

    const whatsappNumber = profile?.whatsapp_number;
    if (!whatsappNumber) {
      showSnackbar({ message: 'Veuillez ajouter votre numéro WhatsApp dans votre profil', type: 'warning', duration: 4000 });
      return;
    }

    setIsWhatsAppSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const quoteNumbers = quotes.map(q => q.quote_number).join(', ');

      const response = await fetch(`${API_URL}/api/whatsapp/send-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          whatsappNumber,
          customerName: profile?.full_name || '',
          quoteNumbers,
          vehiclesSummary: quotes.map(q => `${q.vehicle_make} ${q.vehicle_model}`).join(' + '),
          depositAmount: totalDepositUSD,
          depositFormatted: depositFormatted,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setWhatsAppSent(true);
        showSnackbar({ message: 'Message WhatsApp envoyé avec le lien de paiement !', type: 'success' });
      } else {
        showSnackbar({ message: result.error || 'Erreur lors de l\'envoi', type: 'error' });
      }
    } catch (error: any) {
      console.error('WhatsApp send error:', error);
      showSnackbar({ message: 'Impossible d\'envoyer le message WhatsApp', type: 'error' });
    } finally {
      setIsWhatsAppSending(false);
    }
  };

  const formatCurrency = (amount: number) =>
    Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText variant="title" size="lg">Validation du devis</ThemedText>
                {isGrouped && (
                  <View style={styles.groupBadge}>
                    <Ionicons name="cart-outline" size={12} color="#2563EB" />
                    <ThemedText style={styles.groupBadgeText}>40ft</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText variant="muted" size="sm" numberOfLines={2}>
                {vehiclesSummary}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Grouped vehicles list */}
            {isGrouped && (
              <View style={[styles.vehiclesList, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <ThemedText style={styles.sectionTitle}>VÉHICULES ({vehicleCount})</ThemedText>
                {quotes.map((q, i) => (
                  <View key={q.id} style={[styles.vehicleRow, i < quotes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]}>
                    <View style={styles.vehicleIndex}>
                      <ThemedText style={styles.vehicleIndexText}>{i + 1}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                        {q.vehicle_make} {q.vehicle_model} ({q.vehicle_year})
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        N° {q.quote_number}
                      </ThemedText>
                    </View>
                    <ThemedText style={{ fontWeight: '700', fontSize: 13, color: AppTheme.orange }}>
                      {formatCurrency(q.total_cost_xaf)}
                    </ThemedText>
                  </View>
                ))}
                <View style={[styles.vehicleTotalRow, { borderTopColor: colors.cardBorder }]}>
                  <ThemedText style={{ fontWeight: '800', fontSize: 15 }}>Total</ThemedText>
                  <ThemedText style={{ fontWeight: '800', fontSize: 16, color: AppTheme.orange }}>
                    {formatCurrency(totalCostXAF)}
                  </ThemedText>
                </View>
              </View>
            )}

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
                    {isGrouped
                      ? `Acompte pour bloquer les ${vehicleCount} véhicules`
                      : 'Acompte pour bloquer le véhicule'}
                  </ThemedText>
                  <ThemedText style={[styles.paymentSubtitle, { color: '#6B7280' }]}>
                    {isGrouped
                      ? `${DEPOSIT_PER_VEHICLE_USD.toLocaleString()} USD × ${vehicleCount} véhicules`
                      : "Déclenche l'inspection détaillée du véhicule"}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.paymentAmount}>
                <ThemedText style={styles.amountValue}>{totalDepositUSD.toLocaleString()} USD</ThemedText>
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

              {isIOS ? (
                <>
                  {/* iOS: WhatsApp notification flow */}
                  {whatsAppSent ? (
                    <View style={[styles.iosSuccessCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                      <ThemedText style={{ fontWeight: '700', fontSize: 15, color: '#065F46', marginTop: 8, textAlign: 'center' }}>
                        Lien de paiement envoyé par WhatsApp !
                      </ThemedText>
                      <ThemedText style={{ fontSize: 13, color: '#047857', textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
                        Consultez votre WhatsApp pour finaliser le paiement de l'acompte via le portail sécurisé.
                      </ThemedText>
                    </View>
                  ) : (
                    <>
                      <View style={[styles.iosInfoCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                        <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                        <ThemedText style={{ flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18, marginLeft: 10 }}>
                          Pour des raisons de sécurité sur iOS, le paiement se fait via le portail web. Vous recevrez un lien de paiement par WhatsApp.
                        </ThemedText>
                      </View>
                      <TouchableOpacity
                        style={[styles.payButton, { backgroundColor: '#25D366' }]}
                        onPress={handleiOSValidation}
                        disabled={isWhatsAppSending}
                      >
                        {isWhatsAppSending ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                            <ThemedText style={styles.payButtonText}>
                              Recevoir le lien de paiement
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </>
              ) : (
                /* Android: Direct payment button */
                <TouchableOpacity
                  style={[styles.payButton, { backgroundColor: AppTheme.orange }]}
                  onPress={handlePayment}
                  disabled={isPaymentLoading}
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
              )}
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
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  vehiclesList: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  vehicleIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AppTheme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIndexText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  vehicleTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
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
  iosSuccessCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  iosInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
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
