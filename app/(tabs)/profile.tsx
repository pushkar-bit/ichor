import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-brand-background justify-center items-center">
      <Text className="text-white text-2xl font-bold mb-4">Profile Screen</Text>
      <Text className="text-gray-300 mb-8">Hello, {user?.primaryEmailAddress?.emailAddress}</Text>
      
      <TouchableOpacity 
        className="bg-brand px-6 py-3 rounded-xl"
        onPress={() => signOut()}
      >
        <Text className="text-white font-bold">Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
