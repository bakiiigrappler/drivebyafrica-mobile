import { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuthStore } from '@/store';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useCreateQuote, CreateQuoteData } from '@/hooks/useQuotes';
import { useCurrency } from '@/hooks/useCurrency';
import { formatFCFA, formatUSD, generateQuoteNumber } from '@/lib/pricing';
import { generateAndShareQuotePdf } from '@/lib/quotePdf';

// Deposit amount in USD (source of truth)
const DEPOSIT_AMOUNT_USD = 1000;

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

export interface QuotePreviewData {
  quoteNumber?: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    source: string;
    priceUsd: number;
  };
  destination: {
    id: string;
    name: string;
    country: string;
    flag: string;
  };
  shippingType: 'container' | 'groupage';
  costs: {
    vehiclePriceXAF: number;
    exportTaxXAF: number;
    shippingCostXAF: number;
    insuranceCostXAF: number;
    inspectionFeeXAF: number;
    totalXAF: number;
    totalUSD: number;
  };
  validUntil?: string;
  createdAt?: string;
  // For existing quotes (view mode)
  isExisting?: boolean;
  status?: string;
}

interface QuotePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  data: QuotePreviewData | null;
  onSaveSuccess?: () => void;
}

export function QuotePreviewModal({ visible, onClose, data, onSaveSuccess }: QuotePreviewModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useSnackbar();
  const createQuoteMutation = useCreateQuote();
  const { formatPrice } = useCurrency();

  // Format deposit amount dynamically
  const depositFormatted = formatPrice(DEPOSIT_AMOUNT_USD);

  const [quoteNumber] = useState(() => data?.quoteNumber || generateQuoteNumber());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!data) return null;

  const isExisting = data.isExisting || false;
  const validUntil = data.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const isExpired = new Date(validUntil) < new Date();
  const createdAt = data.createdAt || new Date().toISOString();

  const handleSave = async () => {
    if (!user) {
      onClose();
      router.push('/(auth)/login');
      return;
    }

    const quoteData: CreateQuoteData = {
      quote_number: quoteNumber,
      vehicle_id: data.vehicle.id,
      vehicle_make: data.vehicle.make,
      vehicle_model: data.vehicle.model,
      vehicle_year: data.vehicle.year,
      vehicle_price_usd: data.vehicle.priceUsd,
      vehicle_source: data.vehicle.source,
      destination_id: data.destination.id,
      destination_name: data.destination.name,
      destination_country: data.destination.country,
      shipping_type: data.shippingType,
      shipping_cost_xaf: data.costs.shippingCostXAF,
      insurance_cost_xaf: data.costs.insuranceCostXAF,
      inspection_fee_xaf: data.costs.inspectionFeeXAF,
      total_cost_xaf: data.costs.totalXAF,
    };

    createQuoteMutation.mutate(quoteData, {
      onSuccess: () => {
        showSnackbar({ message: `Devis ${quoteNumber} enregistré avec succès!`, type: 'success' });
        onClose();
        if (onSaveSuccess) {
          onSaveSuccess();
        } else {
          router.push('/(tabs)/quotes');
        }
      },
      onError: (error) => {
        showSnackbar({ message: error.message || 'Erreur lors de l\'enregistrement', type: 'error' });
      },
    });
  };

  const handleShare = async () => {
    try {
      const message = `
🚗 DEVIS DRIVEBY AFRICA
━━━━━━━━━━━━━━━━━━━━━

📋 N° ${quoteNumber}
📅 Date: ${new Date(createdAt).toLocaleDateString('fr-FR')}

🚙 VÉHICULE
${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.year})
Origine: ${SOURCE_FLAGS[data.vehicle.source]} ${SOURCE_NAMES[data.vehicle.source]}

📍 DESTINATION
${data.destination.flag} ${data.destination.name}, ${data.destination.country}

💰 DÉTAIL DES COÛTS
• Prix véhicule: ${formatFCFA(data.costs.vehiclePriceXAF)}
${data.costs.exportTaxXAF > 0 ? `• Taxe export: ${formatFCFA(data.costs.exportTaxXAF)}\n` : ''}• Transport maritime: ${formatFCFA(data.costs.shippingCostXAF)}
• Assurance cargo: ${formatFCFA(data.costs.insuranceCostXAF)}
• Inspection & docs: ${formatFCFA(data.costs.inspectionFeeXAF)}

━━━━━━━━━━━━━━━━━━━━━
💵 TOTAL: ${formatFCFA(data.costs.totalXAF)}
   (≈ ${formatUSD(data.costs.totalUSD)})
━━━━━━━━━━━━━━━━━━━━━

✅ Acompte requis: ${DEPOSIT_AMOUNT_USD.toLocaleString()} USD (${depositFormatted})
⏰ Devis valable jusqu'au ${new Date(validUntil).toLocaleDateString('fr-FR')}

📞 Contact: contact@driveby-africa.com
🌐 www.drivebyafrica.com
      `.trim();

      await Share.share({
        message,
        title: `Devis ${quoteNumber} - Driveby Africa`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Build PDF data from quote preview data
  const buildPdfData = () => ({
    quoteNumber,
    vehicleMake: data.vehicle.make,
    vehicleModel: data.vehicle.model,
    vehicleYear: data.vehicle.year,
    vehicleSource: data.vehicle.source,
    vehiclePriceUSD: data.vehicle.priceUsd,
    destination: {
      name: data.destination.name,
      country: data.destination.country,
    },
    shippingType: data.shippingType,
    costs: {
      vehiclePriceXAF: data.costs.vehiclePriceXAF,
      shippingCostXAF: data.costs.shippingCostXAF,
      insuranceCostXAF: data.costs.insuranceCostXAF,
      inspectionFeeXAF: data.costs.inspectionFeeXAF,
      totalXAF: data.costs.totalXAF,
    },
    userName: profile?.full_name || undefined,
    userEmail: user?.email || undefined,
    validUntil,
    createdAt,
  });

  const handleSharePdf = async () => {
    if (isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    try {
      const pdfData = buildPdfData();
      await generateAndShareQuotePdf(pdfData);
    } catch (error) {
      console.error('PDF share error:', error);
      if ((error as Error).message?.includes('partage')) {
        showSnackbar({ message: (error as Error).message, type: 'error' });
      } else {
        showSnackbar({ message: 'Erreur lors du partage du PDF', type: 'error' });
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText variant="title" size="lg">Aperçu du devis</ThemedText>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={AppTheme.orange} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quote Document */}
          <View style={[styles.document, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff' }]}>
            {/* Expired Watermark */}
            {isExpired && (
              <View style={styles.expiredWatermark}>
                <ThemedText style={styles.expiredText}>EXPIRÉ</ThemedText>
              </View>
            )}

            {/* Top Accent */}
            <View style={styles.topAccent} />

            {/* Header Section */}
            <View style={styles.documentHeader}>
              <View>
                <ThemedText style={styles.logoText}>
                  <ThemedText style={{ color: AppTheme.orange }}>driveby</ThemedText>
                  <ThemedText style={{ fontWeight: '800' }}>AFRICA</ThemedText>
                </ThemedText>
                <ThemedText variant="muted" size="xs">
                  Votre partenaire d'importation automobile
                </ThemedText>
              </View>

              <View style={[styles.quoteInfoBox, { backgroundColor: AppTheme.orange + '15', borderColor: AppTheme.orange + '30' }]}>
                <ThemedText style={styles.quoteLabel}>DEVIS N°</ThemedText>
                <ThemedText style={styles.quoteNumberText}>{quoteNumber}</ThemedText>
                <ThemedText variant="muted" size="xs">
                  Émis le {formatDate(createdAt)}
                </ThemedText>
                <ThemedText variant="muted" size="xs" style={{ color: isExpired ? '#EF4444' : colors.textMuted }}>
                  Valable jusqu'au {formatDate(validUntil)}
                </ThemedText>
              </View>
            </View>

            {/* Client & Vehicle Info */}
            <View style={styles.infoGrid}>
              {/* Client Info */}
              <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
                <ThemedText style={[styles.infoTitle, { color: AppTheme.orange }]}>CLIENT</ThemedText>
                {profile?.full_name && (
                  <View style={styles.infoRow}>
                    <ThemedText variant="muted" size="sm">Nom</ThemedText>
                    <ThemedText style={{ fontWeight: '600', fontSize: 15 }}>{profile.full_name}</ThemedText>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <ThemedText variant="muted" size="sm">Email</ThemedText>
                  <ThemedText style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{user?.email || '-'}</ThemedText>
                </View>
                {profile?.country && (
                  <View style={styles.infoRow}>
                    <ThemedText variant="muted" size="sm">Pays</ThemedText>
                    <ThemedText style={{ fontWeight: '600', fontSize: 15 }}>{profile.country}</ThemedText>
                  </View>
                )}
              </View>

              {/* Vehicle Info */}
              <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
                <ThemedText style={[styles.infoTitle, { color: AppTheme.orange }]}>VÉHICULE</ThemedText>
                <View style={styles.infoRow}>
                  <ThemedText variant="muted" size="sm">Marque / Modèle</ThemedText>
                  <ThemedText style={{ fontWeight: '700', fontSize: 15 }}>
                    {data.vehicle.make} {data.vehicle.model}
                  </ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText variant="muted" size="sm">Année</ThemedText>
                  <ThemedText style={{ fontSize: 15 }}>{data.vehicle.year}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText variant="muted" size="sm">Origine</ThemedText>
                  <ThemedText style={{ fontSize: 15 }}>
                    {SOURCE_FLAGS[data.vehicle.source]} {SOURCE_NAMES[data.vehicle.source]}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Shipping Info */}
            <View style={[styles.shippingBox, { backgroundColor: '#2563EB15', borderColor: '#2563EB30' }]}>
              <View style={styles.shippingHeader}>
                <Ionicons name="boat-outline" size={22} color="#2563EB" />
                <ThemedText style={[styles.infoTitle, { color: '#2563EB', marginLeft: 10, marginBottom: 0 }]}>
                  EXPÉDITION
                </ThemedText>
              </View>
              <View style={styles.shippingDetails}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="muted" size="sm">Destination</ThemedText>
                  <ThemedText style={{ fontWeight: '600', fontSize: 15, marginTop: 4 }}>
                    {data.destination.flag} {data.destination.name}, {data.destination.country}
                  </ThemedText>
                </View>
                <View style={[styles.shippingTypeBadge, { backgroundColor: '#2563EB' }]}>
                  <ThemedText style={styles.shippingTypeText}>
                    {data.shippingType === 'container' ? 'Container 20HQ' : 'Groupage'}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Costs Table */}
            <View style={styles.costsSection}>
              <ThemedText style={[styles.sectionTitle, { color: AppTheme.orange }]}>
                DÉTAIL DES COÛTS
              </ThemedText>

              <View style={[styles.costsTable, { borderColor: colors.border }]}>
                {/* Header */}
                <View style={[styles.costRowHeader, { backgroundColor: AppTheme.orange }]}>
                  <ThemedText style={styles.costHeaderText}>Description</ThemedText>
                  <ThemedText style={styles.costHeaderText}>Montant (FCFA)</ThemedText>
                </View>

                {/* Rows */}
                <View style={[styles.costRow, { backgroundColor: colors.surface }]}>
                  <ThemedText style={{ fontSize: 14 }}>Prix du véhicule (FOB)</ThemedText>
                  <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                    {formatFCFA(data.costs.vehiclePriceXAF)}
                  </ThemedText>
                </View>

                {data.costs.exportTaxXAF > 0 && (
                  <View style={styles.costRow}>
                    <ThemedText style={{ fontSize: 14 }}>Taxe d'exportation</ThemedText>
                    <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                      {formatFCFA(data.costs.exportTaxXAF)}
                    </ThemedText>
                  </View>
                )}

                <View style={[styles.costRow, { backgroundColor: colors.surface }]}>
                  <ThemedText style={{ fontSize: 14 }}>Transport maritime</ThemedText>
                  <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                    {formatFCFA(data.costs.shippingCostXAF)}
                  </ThemedText>
                </View>

                <View style={styles.costRow}>
                  <ThemedText style={{ fontSize: 14 }}>Assurance cargo (2.5%)</ThemedText>
                  <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                    {formatFCFA(data.costs.insuranceCostXAF)}
                  </ThemedText>
                </View>

                <View style={[styles.costRow, { backgroundColor: colors.surface }]}>
                  <ThemedText style={{ fontSize: 14 }}>Inspection & Documents</ThemedText>
                  <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
                    {formatFCFA(data.costs.inspectionFeeXAF)}
                  </ThemedText>
                </View>

                {/* Total */}
                <View style={[styles.totalRow, { backgroundColor: AppTheme.orange + '15' }]}>
                  <View>
                    <ThemedText style={{ fontWeight: '800', fontSize: 15 }}>TOTAL ESTIMÉ</ThemedText>
                    {data.costs.exportTaxXAF > 0 && (
                      <ThemedText variant="muted" size="sm">Inclut taxe et douane export</ThemedText>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={[styles.totalAmount, { color: AppTheme.orange }]}>
                      {formatFCFA(data.costs.totalXAF)}
                    </ThemedText>
                    <ThemedText variant="muted" size="sm">
                      ≈ {formatUSD(data.costs.totalUSD)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Deposit Box */}
            <View style={[styles.depositBox, { backgroundColor: '#22C55E15', borderColor: '#22C55E30' }]}>
              <ThemedText style={[styles.depositTitle, { color: '#22C55E' }]}>
                ACOMPTE REQUIS POUR BLOQUER LE VÉHICULE
              </ThemedText>
              <View style={styles.depositAmount}>
                <ThemedText style={styles.depositValue}>{DEPOSIT_AMOUNT_USD.toLocaleString()} USD</ThemedText>
                <ThemedText variant="muted" size="sm">({depositFormatted})</ThemedText>
              </View>
              <ThemedText style={[styles.depositNote, { color: '#22C55E' }]}>
                Cet acompte déclenche le rapport d'inspection détaillé du véhicule
              </ThemedText>
            </View>

            {/* Next Steps */}
            <View style={styles.stepsSection}>
              <ThemedText style={[styles.sectionTitle, { color: AppTheme.orange }]}>
                PROCHAINES ÉTAPES
              </ThemedText>
              {[
                `Versez l'acompte de ${DEPOSIT_AMOUNT_USD.toLocaleString()} USD (${depositFormatted}) pour bloquer le véhicule`,
                "Recevez le rapport d'inspection détaillé par WhatsApp",
                "Validez et réglez le solde pour lancer l'expédition",
                "Suivez votre véhicule jusqu'à la livraison",
              ].map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{step}</ThemedText>
                </View>
              ))}
            </View>

            {/* Disclaimer */}
            <ThemedText style={styles.disclaimer}>
              * Ce devis est une estimation basée sur les tarifs actuels. Les frais de dédouanement
              ne sont pas inclus et varient selon la réglementation de {data.destination.country}.
              Devis valable 7 jours.
            </ThemedText>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <View style={styles.footerItem}>
                <ThemedText variant="muted" size="sm">Email</ThemedText>
                <ThemedText size="sm" style={{ fontWeight: '600' }}>contact@driveby-africa.com</ThemedText>
              </View>
              <View style={styles.footerItem}>
                <ThemedText variant="muted" size="sm">WhatsApp</ThemedText>
                <ThemedText size="sm" style={{ fontWeight: '600' }}>+241 77 00 00 00</ThemedText>
              </View>
              <View style={styles.footerItem}>
                <ThemedText variant="muted" size="sm">Site Web</ThemedText>
                <ThemedText size="sm" style={{ fontWeight: '600' }}>www.drivebyafrica.com</ThemedText>
              </View>
            </View>

            {/* Bottom Accent */}
            <View style={styles.bottomAccent} />
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {!isExisting ? (
            <>
              <TouchableOpacity
                style={[styles.pdfButton, { borderColor: '#EF4444' }]}
                onPress={handleSharePdf}
                disabled={isGeneratingPdf || createQuoteMutation.isPending}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={18} color="#EF4444" />
                    <ThemedText style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>PDF</ThemedText>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={onClose}
                disabled={createQuoteMutation.isPending}
              >
                <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                <ThemedText style={{ marginLeft: 8 }}>Modifier</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (createQuoteMutation.isPending || isGeneratingPdf) && styles.disabledButton]}
                onPress={handleSave}
                disabled={createQuoteMutation.isPending || isGeneratingPdf}
              >
                {createQuoteMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <ThemedText style={styles.primaryButtonText}>Enregistrer</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.pdfButton, { borderColor: '#EF4444' }]}
                onPress={handleSharePdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={18} color="#EF4444" />
                    <ThemedText style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>PDF</ThemedText>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border, flex: 1 }]}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={18} color={AppTheme.orange} />
                <ThemedText style={{ marginLeft: 8, color: AppTheme.orange }}>Partager</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={onClose}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <ThemedText style={styles.primaryButtonText}>Fermer</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  shareButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  document: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  expiredWatermark: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '-30deg' }],
  },
  expiredText: {
    fontSize: 56,
    fontWeight: '900',
    color: 'rgba(239, 68, 68, 0.2)',
    letterSpacing: 10,
  },
  topAccent: {
    height: 8,
    backgroundColor: AppTheme.orange,
  },
  bottomAccent: {
    height: 8,
    backgroundColor: AppTheme.orange,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '600',
  },
  quoteInfoBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-end',
  },
  quoteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AppTheme.orange,
    letterSpacing: 1.5,
  },
  quoteNumberText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 4,
    marginBottom: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  infoBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 10,
  },
  shippingBox: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shippingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shippingTypeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shippingTypeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  costsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  costsTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  costRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  costHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  depositBox: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  depositTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  depositAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 12,
  },
  depositValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  depositNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  stepsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppTheme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
  },
  footerItem: {
    alignItems: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: AppTheme.orange,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  pdfButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
});
