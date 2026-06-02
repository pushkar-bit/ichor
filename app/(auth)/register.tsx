import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useRouter, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import { UserPlus } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  useWarmUpBrowser();
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    setError('');

    // Domain validation
    const allowedDomain = process.env.EXPO_PUBLIC_ALLOWED_DOMAIN;
    if (allowedDomain) {
      const emailDomain = emailAddress.split('@')[1];
      if (emailDomain !== allowedDomain) {
        setError(`Only emails from @${allowedDomain} are allowed.`);
        setIsLoading(false);
        return;
      }
    }

    try {
      await signUp.create({
        emailAddress,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    setIsLoading(true);
    setError('');
    
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/(tabs)/home');
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid code.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSelectGoogleAuth = async () => {
    try {
      // NOTE: For OAuth, domain validation is trickier unless we use Clerk's dashboard restrictions.
      // Clerk handles email restrictions on their end if configured in the dashboard.
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
            <UserPlus size={40} color="#E8520A" />
          </View>
          <Text className="text-3xl font-bold text-white mb-2">Join Dhaav</Text>
          <Text className="text-gray-400 text-center">Create an account to start your journey</Text>
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
                placeholder="runner@yourdomain.com"
                placeholderTextColor="#666"
                onChangeText={setEmailAddress}
                className="bg-[#2A2A2A] text-white p-4 rounded-xl border border-[#333]"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity 
              className={`bg-brand p-4 rounded-xl items-center flex-row justify-center ${isLoading ? 'opacity-70' : ''}`}
              onPress={onSignUpPress}
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
              <Text className="text-gray-400">Already have an account? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text className="text-brand font-bold">Sign In</Text>
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
              <Text className="text-white font-bold text-lg">Verify & Sign Up</Text>
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
