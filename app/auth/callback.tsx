import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { showGlobalSnackbar } from '@/contexts/SnackbarContext';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirmation en cours...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the token hash or code from the URL params
      const tokenHash = params.token_hash as string;
      const type = params.type as string;
      const code = params.code as string;

      if (code) {
        // Handle OAuth code exchange
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        setStatus('success');
        setMessage('Connexion réussie !');

        showGlobalSnackbar({
          message: 'Connexion réussie !',
          type: 'success',
          icon: 'checkmark-circle',
          duration: 3000,
        });

        // Redirect to home after a short delay
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
        return;
      }

      if (tokenHash && type) {
        // Handle email confirmation with token hash
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email' | 'recovery' | 'invite',
        });

        if (error) {
          throw error;
        }

        setStatus('success');

        if (type === 'signup' || type === 'email') {
          setMessage('Email confirmé avec succès !');
          showGlobalSnackbar({
            message: 'Votre email a été confirmé. Vous pouvez maintenant vous connecter.',
            type: 'success',
            icon: 'checkmark-circle',
            duration: 4000,
          });

          // Redirect to login
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 1500);
        } else if (type === 'recovery') {
          setMessage('Vous pouvez maintenant réinitialiser votre mot de passe.');
          // TODO: Redirect to reset password screen when implemented
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 1500);
        }
        return;
      }

      // Check if we have a session from the URL hash (for email magic links)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (session) {
        setStatus('success');
        setMessage('Connexion réussie !');

        showGlobalSnackbar({
          message: 'Bienvenue !',
          type: 'success',
          icon: 'checkmark-circle',
          duration: 3000,
        });

        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
        return;
      }

      // No valid auth data found
      throw new Error('Lien de confirmation invalide ou expiré');
    } catch (error: any) {
      console.error('Auth callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Une erreur est survenue');

      showGlobalSnackbar({
        message: error.message || 'Erreur de confirmation',
        type: 'error',
        icon: 'alert-circle',
        duration: 5000,
      });

      // Redirect to login after error
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={AppTheme.orange} />
            <ThemedText style={styles.message}>{message}</ThemedText>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <ThemedText style={styles.title}>Succès !</ThemedText>
            <ThemedText style={styles.message}>{message}</ThemedText>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={[styles.iconContainer, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            <ThemedText style={styles.title}>Erreur</ThemedText>
            <ThemedText style={styles.message}>{message}</ThemedText>
            <ThemedText style={styles.subMessage}>
              Vous allez être redirigé vers la page de connexion...
            </ThemedText>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 16,
  },
  subMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 12,
  },
});
