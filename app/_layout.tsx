import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuthStore, useOnboardingStore, useSettingsStore, useCartStore } from '@/store';
import { SplashScreen } from '@/components/SplashScreen';
import { SnackbarProvider } from '@/contexts/SnackbarContext';

// Prevent splash screen from auto-hiding
ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const segments = useSegments();
  const { initialize, isInitialized } = useAuthStore();
  const { hasSeenOnboarding, isLoading: onboardingLoading, checkOnboardingStatus } = useOnboardingStore();
  const settingsStore = useSettingsStore();
  const cartStore = useCartStore();
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initialize();
    checkOnboardingStatus();
    settingsStore.initialize();
    cartStore.initialize();
  }, []);

  useEffect(() => {
    if (isInitialized && !onboardingLoading) {
      // Hide the native splash screen and show our custom animated one
      ExpoSplashScreen.hideAsync();
      setIsReady(true);
    }
  }, [isInitialized, onboardingLoading]);

  const handleSplashComplete = () => {
    setShowSplash(false);
    // Navigate to onboarding if not seen
    if (!hasSeenOnboarding && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  };

  return (
    <>
      <StatusBar style="light" />
      {showSplash && isReady && (
        <SplashScreen onAnimationComplete={handleSplashComplete} />
      )}
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#FFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="vehicle/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="batch/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="order/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="filter-modal"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="batches"
          options={{
            title: 'Lots de Véhicules',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="dashboard"
          options={{
            title: 'Tableau de bord',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="orders"
          options={{
            title: 'Mes Commandes',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="favorites"
          options={{
            title: 'Favoris',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="cart"
          options={{
            title: 'Container 40 pieds',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="calculator"
          options={{
            title: 'Calculateur',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="messages"
          options={{
            title: 'Messages',
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#FFF',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SnackbarProvider>
            <RootLayoutNav />
          </SnackbarProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
