import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';
import { checkPaymentStatus, type PaymentStatusResult } from '@/lib/payment';

interface PaymentVerificationViewProps {
  visible: boolean;
  externalReference: string;
  onSuccess: (result: PaymentStatusResult) => void;
  onCancel: () => void;
  onTimeout: () => void;
}

const MAX_ATTEMPTS = 60; // 60 x 3s = 3 minutes max
const POLL_INTERVAL = 3000; // 3 seconds

export function PaymentVerificationView({
  visible,
  externalReference,
  onSuccess,
  onCancel,
  onTimeout,
}: PaymentVerificationViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'timeout'>('checking');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('Vérification du paiement en cours...');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Spin animation for loading
  useEffect(() => {
    if (status === 'checking') {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    }
  }, [status, spinAnim]);

  // Start polling when visible
  useEffect(() => {
    if (visible && externalReference) {
      setStatus('checking');
      setAttempts(0);
      setMessage('Vérification du paiement en cours...');
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [visible, externalReference]);

  const startPolling = () => {
    let currentAttempt = 0;

    const checkStatus = async () => {
      currentAttempt++;
      setAttempts(currentAttempt);

      try {
        console.log(`[POLL ${currentAttempt}] Checking payment status...`);
        const result = await checkPaymentStatus(externalReference);
        console.log(`[POLL ${currentAttempt}] Status:`, result.status);

        if (result.status === 'completed') {
          stopPolling();
          setStatus('success');
          setMessage('Paiement confirmé !');

          // Wait a moment to show success, then callback
          setTimeout(() => {
            onSuccess(result);
          }, 1500);
          return;
        }

        if (result.status === 'failed' || result.status === 'cancelled') {
          stopPolling();
          setStatus('failed');
          setMessage('Le paiement a échoué ou a été annulé.');
          return;
        }

        if (result.status === 'expired') {
          stopPolling();
          setStatus('failed');
          setMessage('La transaction a expiré. Veuillez réessayer.');
          return;
        }

        // Update message with attempt count
        if (currentAttempt > 10) {
          setMessage(`Vérification en cours... (${currentAttempt}/${MAX_ATTEMPTS})`);
        } else if (currentAttempt > 5) {
          setMessage('Validation du paiement... Veuillez patienter.');
        }

        // Check for timeout
        if (currentAttempt >= MAX_ATTEMPTS) {
          stopPolling();
          setStatus('timeout');
          setMessage('Délai de vérification dépassé.');
          onTimeout();
          return;
        }

        // Continue polling
        pollingRef.current = setTimeout(checkStatus, POLL_INTERVAL);
      } catch (error) {
        console.error('Payment status check error:', error);

        // Continue polling even on error
        if (currentAttempt < MAX_ATTEMPTS) {
          pollingRef.current = setTimeout(checkStatus, POLL_INTERVAL);
        } else {
          setStatus('timeout');
          setMessage('Erreur de connexion. Vérifiez votre connexion internet.');
          onTimeout();
        }
      }
    };

    // Start first check after a short delay
    pollingRef.current = setTimeout(checkStatus, 1000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleCancel = () => {
    stopPolling();
    onCancel();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={64} color={AppTheme.orange} />
          </Animated.View>
        );
      case 'success':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="close-circle" size={64} color="#EF4444" />
          </View>
        );
      case 'timeout':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#F5920020' }]}>
            <Ionicons name="time" size={64} color="#F59200" />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header noir */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Vérification du paiement</ThemedText>
        </View>

        <View style={styles.content}>
          {/* Status Icon */}
          <View style={styles.iconContainer}>
            {getStatusIcon()}
          </View>

          {/* Title */}
          <ThemedText style={styles.title}>
            {status === 'checking' && 'Vérification en cours'}
            {status === 'success' && 'Paiement réussi !'}
            {status === 'failed' && 'Paiement échoué'}
            {status === 'timeout' && 'Délai dépassé'}
          </ThemedText>

          {/* Message */}
          <ThemedText style={styles.message}>{message}</ThemedText>

          {/* Progress indicator for checking status */}
          {status === 'checking' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: AppTheme.orange,
                      width: `${Math.min((attempts / MAX_ATTEMPTS) * 100, 100)}%`,
                    }
                  ]}
                />
              </View>
              <ThemedText variant="muted" size="xs" style={styles.progressText}>
                Vérification {attempts}/{MAX_ATTEMPTS}
              </ThemedText>
            </View>
          )}

          {/* Info box */}
          {status === 'checking' && (
            <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="information-circle" size={20} color={AppTheme.orange} />
              <ThemedText variant="muted" size="sm" style={styles.infoText}>
                Si vous avez reçu le code USSD *144#, validez-le sur votre téléphone.
                La vérification se fait automatiquement.
              </ThemedText>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            {(status === 'failed' || status === 'timeout') && (
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: AppTheme.orange }]}
                onPress={() => {
                  setStatus('checking');
                  setAttempts(0);
                  setMessage('Nouvelle vérification en cours...');
                  startPolling();
                }}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <ThemedText style={styles.retryButtonText}>Réessayer</ThemedText>
              </TouchableOpacity>
            )}

            {(status === 'failed' || status === 'timeout') && (
              <TouchableOpacity
                style={[styles.closeButton, { borderColor: colors.border }]}
                onPress={handleCancel}
              >
                <ThemedText style={{ fontWeight: '600' }}>Fermer</ThemedText>
              </TouchableOpacity>
            )}
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
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(150,150,150,1)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
