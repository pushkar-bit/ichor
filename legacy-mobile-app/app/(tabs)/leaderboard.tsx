import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

/**
 * Leaderboard Screen
 * Full implementation in Prompt 07.
 * Six leaderboard categories:
 *  1. Calorie King
 *  2. Grind Streak
 *  3. Pace God
 *  4. Distance Destroyer
 *  5. Integrity Champion
 *  6. Clan Wars
 */
export default function LeaderboardScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Trophy size={48} color={Colors.gold} />
      <Text style={{ color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 16 }}>
        Rankings
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 8 }}>
        6 leaderboard categories — coming in Prompt 07
      </Text>
    </SafeAreaView>
  );
}
