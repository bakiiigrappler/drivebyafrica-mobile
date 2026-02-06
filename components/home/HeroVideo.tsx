import { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ui/ThemedText';

const { width } = Dimensions.get('window');

export function HeroVideo() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const player = useVideoPlayer(require('@/assets/videos/hero-video.mp4'), (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    player.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
      />

      {/* Content overlay */}
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ThemedText variant="title" size="2xl" style={styles.title}>
            Votre véhicule de rêve vous attend
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Importez depuis la Corée, la Chine et Dubaï
          </ThemedText>
        </View>

        {/* Video controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={togglePlay}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Live badge */}
      <View style={[styles.liveBadge, { backgroundColor: colors.mandarin }]}>
        <View style={styles.liveDot} />
        <ThemedText size="xs" style={styles.liveText}>EN DIRECT</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
