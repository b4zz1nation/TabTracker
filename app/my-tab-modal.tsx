import { useEffect, useRef, useState, useCallback } from 'react';
import { TextInput, Pressable, View, Alert, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCreditors } from '@/hooks/use-creditors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import ScreenContainer from '@/components/screen-container';

export default function MyTabModalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{
    id?: string;
  }>();
  
  const { creditors, addCreditor, updateCreditor, deleteCreditor, refresh } = useCreditors();
  
  const isEditing = !!params.id;
  const existingCreditor = isEditing ? creditors.find(c => c.id === Number(params.id)) : null;

  const [name, setName] = useState(existingCreditor?.name || '');
  const [balance, setBalance] = useState(existingCreditor ? existingCreditor.balance.toString() : '');
  const [formError, setFormError] = useState<string | null>(null);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (existingCreditor) {
      setName(existingCreditor.name);
      setBalance(existingCreditor.balance.toString());
    }
  }, [existingCreditor]);

  const handleFocus = (reactNode: any) => {
    scrollViewRef.current?.scrollToFocusedInput(reactNode);
  };

  const handleAmountChange = useCallback((text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setBalance(sanitized);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const normalized = balance.trim();
    const parsed = normalized === '' ? 0 : parseFloat(normalized);
    const numBalance = Number.isFinite(parsed) ? parsed : 0;

    try {
      if (isEditing) {
        await updateCreditor(Number(params.id), name, numBalance);
      } else {
        await addCreditor(name, numBalance);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      if (e.message === 'DUPLICATE_NAME') {
        setFormError('A creditor with this name already exists.');
      } else {
        Alert.alert('Error', 'Failed to save creditor');
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Creditor',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deleteCreditor(Number(params.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } 
        },
      ]
    );
  };

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3 bg-white dark:bg-gray-950">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} className="w-12 h-12 items-center justify-center">
            <Ionicons name="chevron-back" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 italic">
            {isEditing ? 'Edit Creditor' : 'New Debt'}
        </Text>
        <View className="w-12" />
    </View>
  );

  const isSaveDisabled = !name.trim() || !balance || parseFloat(balance) <= 0;

  const footer = (
    <View className="px-6 py-4 bg-white dark:bg-gray-950">
        <Pressable 
          className={`h-16 rounded-2xl bg-orange-500 items-center justify-center shadow-lg shadow-orange-500/30 active:opacity-90 active:scale-[0.98] ${isSaveDisabled ? 'opacity-50' : ''}`}
          onPress={handleSave}
          disabled={isSaveDisabled}
        >
          <Text className="text-white text-lg font-bold">
            {isEditing ? 'Update Entry' : 'Add to My Tab'}
          </Text>
        </Pressable>
    </View>
  );

  return (
    <ScreenContainer scrollViewRef={scrollViewRef} header={header} footer={footer} edges={['top', 'bottom']} contentContainerStyle={{ padding: 24 }}>
      {formError && (
        <View className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-200 p-4">
          <Text className="text-rose-600 font-semibold">{formError}</Text>
        </View>
      )}

      <View className="mb-6">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Name of Person</Text>
        <TextInput
          className="h-14 px-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-lg text-gray-900 dark:text-gray-100"
          placeholder="e.g. Boss"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          onFocus={(event) => handleFocus(event.target)}
          autoFocus={!isEditing}
        />
      </View>

      <View className="mb-8">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Amount You Owe</Text>
        <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
          <Text className="text-2xl font-bold text-gray-400 mr-2">₱</Text>
          <TextInput
            className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            value={balance}
            onChangeText={handleAmountChange}
            onFocus={(event) => handleFocus(event.target)}
            keyboardType="numeric"
          />
        </View>
      </View>

      {isEditing && (
        <Pressable 
          className="flex-row items-center justify-center mb-0 gap-2 active:opacity-60" 
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#f43f5e" />
          <Text className="text-rose-500 font-semibold text-base">Delete Permanently</Text>
        </Pressable>
      )}
    </ScreenContainer>
  );
}
