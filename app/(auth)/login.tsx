import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { useRouter, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import api from '../../services/api';
import { LogIn } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  useWarmUpBrowser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const syncUser = async (clerkId: string, email: string, name: string, avatarUrl: string) => {
    try {
      await api.post('/api/users/sync', { clerkId, email, name, avatarUrl });
    } catch (e) {
      console.error('Failed to sync user', e);
    }
  };

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    setError('');
    try {
      const { supportedFirstFactors } = await signIn.create({
        identifier: emailAddress,
      });

      const isEmailCodeFactor = (factor: any) => {
        return factor.strategy === 'email_code';
      };
      
      const emailCodeFactor = supportedFirstFactors?.find(isEmailCodeFactor);

      if (emailCodeFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: (emailCodeFactor as any).emailAddressId,
        });
        setPendingVerification(true);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    setError('');
    try {
      const completeSignIn = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
        
        // Sync user logic
        const user = completeSignIn.userData;
        if (user) {
           await syncUser(
             (completeSignIn as any).createdUserId || '',
             emailAddress,
             user.firstName ? `${user.firstName} ${user.lastName}` : '',
             user.imageUrl || ''
           );
        }
        router.replace('/(tabs)/home');
      } else {
        console.error(JSON.stringify(completeSignIn, null, 2));
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid code.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSelectGoogleAuth = async () => {
    try {
      const { createdSessionId, signIn, signUp, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      console.error('OAuth error', err);
      Alert.alert('OAuth Error', 'Could not authenticate with Google.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center px-6">
        <View className="mb-10 items-center">
          <View className="w-20 h-20 bg-brand/20 rounded-full items-center justify-center mb-4">
            <LogIn size={40} color="#A855F7" />
          </View>
          <Text className="text-3xl font-bold text-white mb-2">Welcome Back</Text>
          <Text className="text-gray-400 text-center">Enter your email to sign in to Dhaav</Text>
        </View>

        {error ? (
          <View className="bg-red-500/20 p-3 rounded-xl mb-4 border border-red-500/50">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        ) : null}

        {!pendingVerification ? (
          <View className="space-y-4">
            <View>
              <Text className="text-gray-300 font-medium mb-2">Email Address</Text>
              <TextInput
                autoCapitalize="none"
                value={emailAddress}
                placeholder="runner@dhaav.app"
                placeholderTextColor="#666"
                onChangeText={setEmailAddress}
                className="bg-[#2A2A2A] text-white p-4 rounded-xl border border-[#333]"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity 
              className={`bg-brand p-4 rounded-xl items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
              onPress={onSignInPress}
              disabled={isLoading || !emailAddress}
            >
              {isLoading ? (
                <ActivityIndicator color="white" className="mr-2" />
              ) : null}
              <Text className="text-white font-bold text-lg">Continue with Email</Text>
            </TouchableOpacity>

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-[#333]" />
              <Text className="text-gray-500 px-4">OR</Text>
              <View className="flex-1 h-[1px] bg-[#333]" />
            </View>

            <TouchableOpacity 
              className="bg-white p-4 rounded-xl items-center"
              onPress={onSelectGoogleAuth}
            >
              <Text className="text-black font-bold text-lg">Continue with Google</Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-400">Don't have an account? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text className="text-brand font-bold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        ) : (
          <View className="space-y-4">
            <View>
              <Text className="text-gray-300 font-medium mb-2">Verification Code</Text>
              <TextInput
                value={code}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#666"
                onChangeText={setCode}
                className="bg-[#2A2A2A] text-white p-4 rounded-xl border border-[#333] text-center text-2xl tracking-widest"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity 
              className={`bg-brand p-4 rounded-xl items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
              onPress={onPressVerify}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <ActivityIndicator color="white" className="mr-2" />
              ) : null}
              <Text className="text-white font-bold text-lg">Verify & Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="p-4 items-center"
              onPress={() => setPendingVerification(false)}
            >
              <Text className="text-gray-400">Back to Email</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
