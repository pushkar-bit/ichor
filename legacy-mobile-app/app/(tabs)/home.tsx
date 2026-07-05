import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

/**
 * Home — Social Feed
 * Full implementation in Prompt 05.
 * Displays chronological feed of all Dhaav member posts.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Flame size={48} color={Colors.primary} />
      <Text style={{ color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 16 }}>
        Feed
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 8 }}>
        Social feed — coming in Prompt 05
      </Text>
    </SafeAreaView>
  );
}
