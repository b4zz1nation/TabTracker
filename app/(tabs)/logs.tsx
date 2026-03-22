import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ScreenContainer from '@/components/screen-container';
import { useLends, Lend } from '@/hooks/use-lends';
import { useCustomers } from '@/hooks/use-customers';

export default function LogsScreen() {
  const { lends, refresh: refreshLends } = useLends();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refreshLends();
      refreshCustomers();
    }, [refreshLends, refreshCustomers])
  );

  // Combine lend events into a log
  const logItems = lends.map(l => {
    const customer = customers.find(c => c.id === l.customer_id);
    return {
      id: l.id + (l.status === 'Completed' ? '_comp' : '_add'),
      lendId: l.id,
      title: l.status === 'Completed' ? 'Payment Completed' : 'New Lend Added',
      subtitle: `${customer?.name || 'Unknown'}: ₱${l.amount.toFixed(2)}`,
      date: l.status === 'Completed' && l.completed_at ? l.completed_at : l.created_at,
      type: l.status === 'Completed' ? 'success' : 'info'
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderItem = ({ item }: { item: any }) => (
    <View className="mx-4 mb-3">
      <Pressable 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/lend-details/${item.lendId}`);
        }}
        className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex-row items-center active:opacity-70"
      >
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${item.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-sky-100 dark:bg-sky-900/40'}`}>
          <Ionicons name={item.type === 'success' ? 'checkmark-circle' : 'add-circle'} size={24} color={item.type === 'success' ? '#10b981' : '#0ea5e9'} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 dark:text-gray-100">{item.title}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">{item.subtitle}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">
            {new Date(item.date).toLocaleDateString()}
          </Text>
          <Text className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Ionicons name="chevron-forward" size={12} color="#d1d5db" style={{ marginTop: 4 }} />
        </View>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer scrollable={false} header={<View className="px-5 py-4"><Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Logs</Text></View>}>
      <FlatList
        data={logItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 10 }}
        ListEmptyComponent={
          <View className="items-center mt-20 gap-3">
            <Ionicons name="journal-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 text-center px-10">No recent activity found.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
