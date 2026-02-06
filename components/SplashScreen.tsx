import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { AppTheme } from '@/constants';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spinner animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    // Main animation sequence
    const animationSequence = Animated.sequence([
      // 1. Logo fade in and scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 2. Text fade in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 3. Loader fade in
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 4. Wait
      Animated.delay(1500),
      // 5. Fade out
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start(() => {
      spinAnimation.stop();
      onAnimationComplete();
    });

    return () => {
      spinAnimation.stop();
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('@/assets/images/logo-driveby.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>

      {/* Brand Text */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Animated.Text style={styles.brandText}>
          <Animated.Text style={styles.brandDriveby}>DRIVEBY </Animated.Text>
          <Animated.Text style={styles.brandAfrica}>AFRICA</Animated.Text>
        </Animated.Text>
        <Animated.Text style={styles.tagline}>
          Votre véhicule, livré chez vous
        </Animated.Text>
      </Animated.View>

      {/* Loader */}
      <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          <View style={styles.spinnerTrack} />
          <View style={styles.spinnerHead} />
        </Animated.View>
        <Animated.Text style={styles.loadingText}>Chargement...</Animated.Text>
      </Animated.View>

      {/* Country flags */}
      <Animated.View style={[styles.flagsContainer, { opacity: loaderOpacity }]}>
        <Animated.Text style={styles.flag}>🇰🇷</Animated.Text>
        <View style={styles.flagDivider} />
        <Animated.Text style={styles.flag}>🇨🇳</Animated.Text>
        <View style={styles.flagDivider} />
        <Animated.Text style={styles.flag}>🇦🇪</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 180,
    height: 60,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  brandDriveby: {
    color: '#ffffff',
  },
  brandAfrica: {
    color: AppTheme.orange,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 140,
    alignItems: 'center',
  },
  spinner: {
    width: 36,
    height: 36,
    marginBottom: 12,
  },
  spinnerTrack: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  spinnerHead: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: AppTheme.orange,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  flagsContainer: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 28,
  },
  flagDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
});
