import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

/**
 * Import Workout Screen
 * Full implementation in Prompt 04.
 * Two sections:
 *  1. New Workouts Found (from HealthKit / Health Connect)
 *  2. Import from Screenshot (OCR via Gemini Vision)
 *
 * NO GPS tracking. NO expo-location. Health store data only.
 */
export default function ImportScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Plus size={48} color={Colors.primary} />
      <Text style={{ color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 16 }}>
        Import Workout
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 8 }}>
        Health sync + OCR — coming in Prompt 04
      </Text>
    </SafeAreaView>
  );
}
