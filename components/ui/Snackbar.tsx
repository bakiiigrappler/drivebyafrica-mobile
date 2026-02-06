import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTheme } from '@/constants';

export interface SnackbarAction {
  label: string;
  onPress: () => void;
}

export interface SnackbarProps {
  visible: boolean;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: SnackbarAction;
  duration?: number;
  onDismiss: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
}

const TYPE_COLORS: Record<string, [string, string]> = {
  info: ['#3B82F6', '#2563EB'],
  success: ['#10B981', '#059669'],
  warning: [AppTheme.orange, AppTheme.orangeDark],
  error: ['#EF4444', '#DC2626'],
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  error: 'close-circle',
};

export function Snackbar({
  visible,
  message,
  icon,
  action,
  duration = 4000,
  onDismiss,
  type = 'warning',
}: SnackbarProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleActionPress = () => {
    handleDismiss();
    action?.onPress();
  };

  if (!visible) return null;

  const colors = TYPE_COLORS[type];
  const defaultIcon = TYPE_ICONS[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 16,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={styles.innerContainer}>
        <View style={styles.content}>
          {/* Icon */}
          <LinearGradient
            colors={colors}
            style={styles.iconContainer}
          >
            <Ionicons
              name={icon || defaultIcon}
              size={20}
              color="#fff"
            />
          </LinearGradient>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Animated.Text style={styles.message} numberOfLines={2}>
              {message}
            </Animated.Text>
          </View>

          {/* Action Button */}
          {action && (
            <TouchableOpacity
              onPress={handleActionPress}
              activeOpacity={0.7}
              style={styles.actionButton}
            >
              <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGradient}
              >
                <Animated.Text style={styles.actionText}>
                  {action.label}
                </Animated.Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Close Button */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  innerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  messageContainer: {
    flex: 1,
    marginRight: 8,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionButton: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
  },
});
