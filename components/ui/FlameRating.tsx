import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface FlameRatingProps {
  /** The current average rating (0–5, can be fractional e.g. 3.5) */
  rating: number;
  /** If provided, renders interactive tappable flames */
  onRate?: (rating: number) => void;
  /** The user's own rating (1–5), if they've rated */
  userRating?: number;
  size?: number;
  style?: ViewStyle;
}

/**
 * Dhaav's signature rating UI — 5 flame icons.
 * Shows filled (orange) / empty (dark) flames based on the average rating.
 * When `onRate` is provided, becomes tappable (tap flame N = rate N/5).
 */
export function FlameRating({
  rating,
  onRate,
  userRating,
  size = 22,
  style,
}: FlameRatingProps) {
  const displayRating = userRating ?? rating;

  return (
    <View style={[styles.row, style]}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(displayRating);

        if (onRate) {
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onRate(i)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Flame
                size={size}
                color={filled ? Colors.flame : Colors.flameEmpty}
              />
            </TouchableOpacity>
          );
        }

        return (
          <Flame
            key={i}
            size={size}
            color={filled ? Colors.flame : Colors.flameEmpty}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
