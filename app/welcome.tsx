import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { saveUserProfile } from '@/services/user-profile';
import { useAuth } from '@/contexts/auth-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const { markProfileReady } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStart = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name to continue.');
      return;
    }

    try {
      setIsSaving(true);
      await saveUserProfile(trimmed);
      setError('');
      markProfileReady();
      router.replace('/(tabs)');
    } catch {
      setError('Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="flex-1 px-6 justify-center">
        <View className="mb-10 items-center">
          <Text className="text-4xl font-extrabold text-sky-600 dark:text-sky-400">TabTracker</Text>
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">Track balances in seconds</Text>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Your Name</Text>
          <TextInput
            className="h-14 px-4 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-lg text-gray-900 dark:text-gray-100"
            placeholder="Enter your name"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error && text.trim()) {
                setError('');
              }
            }}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleStart}
          />
        </View>

        {error ? <Text className="text-rose-500 dark:text-rose-400 mb-4 ml-1">{error}</Text> : null}

        <Pressable
          className={`h-14 rounded-2xl items-center justify-center ${
            isSaving ? 'bg-sky-400' : 'bg-sky-500 active:opacity-90 active:scale-[0.98]'
          }`}
          onPress={handleStart}
          disabled={isSaving}>
          <Text className="text-white text-lg font-bold">{isSaving ? 'Saving...' : 'Get Started'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
