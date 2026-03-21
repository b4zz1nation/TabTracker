import { FlatList, Pressable, View, Text } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { useCustomers, Customer } from '@/hooks/use-customers';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const { customers, isLoading, refresh } = useCustomers();
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Ensure dashboard reflects changes made in the modal immediately after navigating back.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + c.balance, 0);

  const renderItem = ({ item }: { item: Customer }) => (
    <Pressable 
      onPress={() => router.push({ pathname: '/modal', params: { id: item.id, name: item.name, balance: item.balance } })}
      className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 active:opacity-70 bg-white dark:bg-black"
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.name}</Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text 
          className={`text-lg font-bold ${
            item.balance > 0 ? 'text-red-500' : item.balance < 0 ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {item.balance > 0 ? `-$${item.balance.toFixed(2)}` : `$${Math.abs(item.balance).toFixed(2)}`}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950 pt-16">
      {/* Header Summary */}
      <View className="m-4 p-6 rounded-3xl items-center justify-center bg-sky-50 dark:bg-sky-950/20">
        <Text className="text-sm font-medium uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-1">Total Owed to You</Text>
        <Text className={`text-4xl font-extrabold ${totalOutstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          ${totalOutstanding.toFixed(2)}
        </Text>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center mt-20 gap-4">
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-400 dark:text-gray-500 text-center px-10">No customers yet. Add your first tab!</Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Link href="/modal" asChild>
        <Pressable 
          className="absolute bottom-10 right-8 w-16 h-16 rounded-full items-center justify-center bg-sky-500 shadow-lg shadow-sky-400/50 dark:shadow-sky-900/40"
          style={{ elevation: 8, zIndex: 1000 }}
        >
          <Ionicons name="add" size={32} color="white" />
        </Pressable>
      </Link>
    </View>
  );
}
