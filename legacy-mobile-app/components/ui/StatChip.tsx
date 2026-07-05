import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface StatChipProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  compact?: boolean;
}

/**
 * Stat chip — displays a single metric with an icon, label, and value.
 * Used in the post card stats strip (Distance | Pace | Duration | Calories).
 */
export function StatChip({ label, value, icon, style, compact = false }: StatChipProps) {
  return (
    <View style={[styles.chip, compact && styles.chipCompact, style]}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  chipCompact: {
    paddingVertical: 6,
  },
  iconWrapper: {
    marginBottom: 2,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  valueCompact: {
    fontSize: 14,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
