import { useState, useCallback } from 'react';
import { FlatList, Pressable, TextInput, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useCustomers, Customer } from '@/hooks/use-customers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import ScreenContainer from '@/components/screen-container';

export default function SelectCustomerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { customers, refresh } = useCustomers();
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered = search.trim()
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : customers;

  const handleSelect = (item: Customer) => {
    router.back();
    setTimeout(() => {
      router.push({
        pathname: '/add-lend',
        params: {
          customer_id: item.id.toString(),
          customer_name: item.name,
        },
      });
    }, 100);
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <Pressable
      onPress={() => handleSelect(item)}
      className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 active:opacity-70 bg-white dark:bg-zinc-950"
    >
      <View className="flex-1 mr-3">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {item.name}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    </Pressable>
  );

  return (
    <ScreenContainer scrollable={false} edges={['top', 'bottom']}>
      <View className="flex-1">
        {/* Close Button & Title */}
        <View className="px-4 pt-3 pb-4">
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} className="w-11 h-11 items-center justify-center -ml-1 mb-2">
            <Ionicons name="close" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 px-1">Select Customer</Text>
        </View>

        {/* Search Bar */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center bg-gray-100 dark:bg-zinc-900 rounded-2xl px-4 h-14">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-lg text-gray-900 dark:text-gray-100"
              placeholder="Search customers…"
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} className="p-1">
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center mt-20 gap-3">
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-400 dark:text-gray-500 text-center px-10">
                {search.trim() ? 'No customers match your search.' : 'No customers found.'}
              </Text>
            </View>
          }
        />
      </View>
    </ScreenContainer>
  );
}
