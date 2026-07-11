import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary' }: Props) {
  const isSecondary = variant === 'secondary';

  if (isSecondary) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.button, styles.secondary, (disabled || loading) && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={styles.secondaryLabel}>{label}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.glow, (disabled || loading) && styles.disabled]}
    >
      <LinearGradient
        colors={[colors.accent, colors.accentAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.primaryLabel}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Мягкое свечение под градиентной кнопкой.
  glow: {
    borderRadius: 16,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  secondary: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
}));
