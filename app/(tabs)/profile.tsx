import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { User } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

/**
 * Profile Screen
 * Full implementation in Prompt 11.
 * Shows: stats, streak, integrity score, training plan, heatmap, badges.
 */
export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <User size={48} color={Colors.primary} />
      <Text style={{ color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 16 }}>
        Profile
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 32 }}>
        {user?.primaryEmailAddress?.emailAddress}
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: Colors.surfaceElevated,
          borderColor: Colors.border,
          borderWidth: 1,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
        onPress={() => signOut()}
      >
        <Text style={{ color: Colors.error, fontWeight: '700' }}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 24 }}>
        Full profile — coming in Prompt 11
      </Text>
    </SafeAreaView>
  );
}
