import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Map } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

/**
 * Territory Map Screen
 * Full implementation in Prompt 06.
 * Full-screen react-native-maps with campus zone polygons.
 */
export default function MapScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <Map size={48} color={Colors.primary} />
      <Text style={{ color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 16 }}>
        Territory
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 8 }}>
        Campus zone map — coming in Prompt 06
      </Text>
    </SafeAreaView>
  );
}
