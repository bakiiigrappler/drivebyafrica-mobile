import { View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme, ORDER_STATUS_STEPS } from '@/constants';
import { ThemedText } from '@/components/ui/ThemedText';
import type { OrderTracking } from '@/types';

interface OrderTimelineProps {
  tracking: OrderTracking[];
  currentStatus?: string;
  documents?: any[];
}

// Main workflow steps matching 13-step ORDER_STATUSES
// Showing 8 main steps for compact mobile display
const TIMELINE_STEPS = [
  { status: 'deposit_paid', icon: 'card-outline', label: 'Acompte', step: 1 },
  { status: 'vehicle_locked', icon: 'lock-closed-outline', label: 'Bloqué', step: 2 },
  { status: 'inspection_sent', icon: 'clipboard-outline', label: 'Inspection', step: 3 },
  { status: 'full_payment_received', icon: 'card-outline', label: 'Paiement', step: 4 },
  { status: 'vehicle_purchased', icon: 'cart-outline', label: 'Acheté', step: 5 },
  { status: 'shipping', icon: 'boat-outline', label: 'En mer', step: 9 },
  { status: 'documents_ready', icon: 'document-text-outline', label: 'Documents', step: 10 },
  { status: 'delivered', icon: 'home-outline', label: 'Livré', step: 13 },
];

export function OrderTimeline({ tracking, currentStatus, documents = [] }: OrderTimelineProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const currentStep = currentStatus ? (ORDER_STATUS_STEPS[currentStatus] || 0) : 0;
  const isCancelled = currentStatus === 'cancelled';
  const isPendingReassignment = currentStatus === 'pending_reassignment';

  // Find the index of the completed step in TIMELINE_STEPS
  const completedStepIndex = TIMELINE_STEPS.findIndex(s => s.step > currentStep);
  const progressIndex = completedStepIndex === -1 ? TIMELINE_STEPS.length : completedStepIndex;
  const progressPercentage = Math.min(100, (progressIndex / (TIMELINE_STEPS.length - 1)) * 100);

  // Filter only client-visible documents
  const docList = documents.filter((doc: any) => doc.visible_to_client !== false);

  return (
    <View style={styles.container}>
      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {/* Progress Line Background */}
        <View style={[styles.progressLineBackground, { backgroundColor: colors.surface }]} />

        {/* Progress Line Filled */}
        <View
          style={[
            styles.progressLineFilled,
            {
              backgroundColor: isCancelled ? '#DC2626' : isPendingReassignment ? '#EAB308' : AppTheme.orange,
              width: isCancelled || isPendingReassignment ? '0%' : `${progressPercentage}%`,
            }
          ]}
        />

        {/* Steps */}
        <View style={styles.stepsRow}>
          {TIMELINE_STEPS.map((step, index) => {
            const isCompleted = step.step <= currentStep;
            const isNext = step.step > currentStep &&
              (index === 0 || TIMELINE_STEPS[index - 1]?.step <= currentStep);
            const isCurrent = isNext;

            return (
              <View key={step.status} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && { backgroundColor: '#22C55E' },
                    isCurrent && !isCancelled && !isPendingReassignment && {
                      backgroundColor: AppTheme.orange,
                      shadowColor: AppTheme.orange,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                    isCancelled && { backgroundColor: 'rgba(220, 38, 38, 0.2)' },
                    isPendingReassignment && index === 0 && { backgroundColor: '#EAB308' },
                    !isCompleted && !isCurrent && !isCancelled && { backgroundColor: colors.surface },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={step.icon as any}
                      size={12}
                      color={isCurrent ? '#FFFFFF' : isCancelled ? '#DC2626' : colors.textMuted}
                    />
                  )}
                </View>
                <ThemedText
                  size="xs"
                  style={[
                    styles.stepLabel,
                    { color: (isCompleted || isCurrent) && !isCancelled && !isPendingReassignment
                      ? colors.textPrimary
                      : colors.textMuted
                    }
                  ]}
                >
                  {step.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tracking History */}
      {tracking.length > 0 ? (
        <View style={styles.historySection}>
          <ThemedText variant="muted" size="xs" style={styles.historyTitle}>
            HISTORIQUE
          </ThemedText>
          <View style={styles.historyList}>
            {tracking.map((item, index) => {
              const isLatest = index === tracking.length - 1;

              // Find documents uploaded around this event's time
              const eventDate = new Date(item.completed_at || item.created_at);
              const relatedDocs = docList.filter((doc: any) => {
                const docDate = new Date(doc.uploaded_at);
                const timeDiff = Math.abs(docDate.getTime() - eventDate.getTime());
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                return hoursDiff <= 24;
              });

              return (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyDotContainer}>
                    <View
                      style={[
                        styles.historyDot,
                        { backgroundColor: isLatest ? AppTheme.orange : colors.textMuted },
                      ]}
                    />
                    {index < tracking.length - 1 && (
                      <View
                        style={[
                          styles.historyLine,
                          { backgroundColor: colors.border }
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyHeader}>
                      <ThemedText
                        variant={isLatest ? 'subtitle' : 'muted'}
                        size="sm"
                        style={{ fontWeight: isLatest ? '600' : '400' }}
                      >
                        {item.title}
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        {format(new Date(item.completed_at || item.created_at), 'd MMM', { locale: fr })}
                      </ThemedText>
                    </View>
                    {item.description && (
                      <ThemedText variant="muted" size="xs" style={{ marginTop: 2 }}>
                        {item.description}
                      </ThemedText>
                    )}
                    {item.location && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                        <ThemedText variant="muted" size="xs" style={{ marginLeft: 4 }}>
                          {item.location}
                        </ThemedText>
                      </View>
                    )}
                    {/* Related documents */}
                    {relatedDocs.length > 0 && (
                      <View style={styles.docsRow}>
                        {relatedDocs.map((doc: any, docIndex: number) => (
                          <TouchableOpacity
                            key={docIndex}
                            style={styles.docLink}
                            onPress={() => Linking.openURL(doc.url)}
                          >
                            <Ionicons name="document-text-outline" size={12} color={AppTheme.orange} />
                            <ThemedText size="xs" style={{ color: AppTheme.orange, marginLeft: 4 }}>
                              {doc.name}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color={colors.textMuted} />
          <ThemedText variant="muted" style={{ marginTop: 12 }}>
            Aucune mise à jour de suivi
          </ThemedText>
        </View>
      )}

      {/* Documents Section */}
      {docList.length > 0 && tracking.length === 0 && (
        <View style={styles.docsSection}>
          <ThemedText variant="muted" size="xs" style={styles.historyTitle}>
            DOCUMENTS DISPONIBLES
          </ThemedText>
          {docList.map((doc: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.docItem}
              onPress={() => Linking.openURL(doc.url)}
            >
              <Ionicons name="document-text-outline" size={16} color={AppTheme.orange} />
              <ThemedText size="sm" style={{ color: AppTheme.orange, marginLeft: 8, flex: 1 }}>
                {doc.name}
              </ThemedText>
              <Ionicons name="download-outline" size={16} color={AppTheme.orange} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  progressContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  progressLineBackground: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    height: 2,
  },
  progressLineFilled: {
    position: 'absolute',
    top: 12,
    left: 16,
    height: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 44,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepLabel: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 9,
  },
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    letterSpacing: 1,
    marginBottom: 12,
  },
  historyList: {
    paddingLeft: 4,
  },
  historyItem: {
    flexDirection: 'row',
    paddingBottom: 16,
  },
  historyDotContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 12,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    paddingTop: 0,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  docsRow: {
    marginTop: 8,
    gap: 4,
  },
  docLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  docsSection: {
    marginTop: 16,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
});
