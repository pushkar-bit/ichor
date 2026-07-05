import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../constants/colors';

type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'clan' | 'activity';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  color?: string; // custom bg color (for clan colors)
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Small pill badge — used for: activity type (Run/Walk/Cycle),
 * verification status (Health Sync ✓ / OCR 📷), clan tags, role badges.
 */
export function Badge({
  label,
  variant = 'default',
  size = 'md',
  color,
  style,
  textStyle,
}: BadgeProps) {
  const bgColor = color ?? VARIANT_COLORS[variant].bg;
  const txtColor = color ? '#FFFFFF' : VARIANT_COLORS[variant].text;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: bgColor },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          { color: txtColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.surfaceHighlight, text: Colors.textSecondary },
  primary: { bg: Colors.primaryMuted, text: Colors.primaryLight },
  success: { bg: 'rgba(16, 185, 129, 0.15)', text: Colors.success },
  danger: { bg: 'rgba(239, 68, 68, 0.15)', text: Colors.error },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', text: Colors.warning },
  clan: { bg: Colors.primaryMuted, text: Colors.primary },
  activity: { bg: Colors.primaryMuted, text: Colors.primaryLight },
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  labelSm: {
    fontSize: 10,
  },
});
