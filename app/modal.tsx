import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCustomers } from '@/hooks/use-customers';

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string, name?: string, balance?: string }>();
  const isEditing = !!params.id;
  
  const { addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  
  const [name, setName] = useState(params.name || '');
  // For "Add" flow, keep the field empty so typing doesn't get prefixed by "0".
  // For "Edit" flow, show the existing value (including "0" if that's what it is).
  const [balance, setBalance] = useState(isEditing ? (params.balance ?? '') : '');

  const handleAmountChange = (text: string) => {
    const sanitized = text
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1");
    setBalance(sanitized);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a customer name');
      return;
    }

    const normalized = balance.trim();
    const parsed = normalized === '' ? 0 : parseFloat(normalized);
    const numBalance = Number.isFinite(parsed) ? parsed : 0;

    try {
      if (isEditing) {
        await updateCustomer(Number(params.id), name, numBalance);
      } else {
        await addCustomer(name, numBalance);
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save customer');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deleteCustomer(Number(params.id));
            router.back();
          } 
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 p-6 bg-white dark:bg-zinc-950">
        <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          {isEditing ? 'Edit Records' : 'New Customer'}
        </Text>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Customer Name</Text>
          <TextInput
            className="h-14 px-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-lg text-gray-900 dark:text-gray-100"
            placeholder="e.g. John Doe"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            autoFocus={!isEditing}
          />
        </View>

        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Current Balance</Text>
          <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
            <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">$</Text>
            <TextInput
              className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={balance}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
          </View>
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">
            Positive if they owe you, negative if you owe them.
          </Text>
        </View>

        <Pressable 
          className="h-16 rounded-2xl bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/30 active:opacity-90 active:scale-[0.98]"
          onPress={handleSave}
        >
          <Text className="text-white text-lg font-bold">
            {isEditing ? 'Update Profile' : 'Add to Tab'}
          </Text>
        </Pressable>

        {isEditing && (
          <Pressable 
            className="flex-row items-center justify-center mt-8 gap-2 active:opacity-60" 
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#f43f5e" />
            <Text className="text-rose-500 font-semibold text-base">Delete Permanently</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
