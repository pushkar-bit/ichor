import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-brand-background justify-center items-center">
      <Text className="text-white text-2xl font-bold">Home Screen</Text>
    </SafeAreaView>
  );
}
