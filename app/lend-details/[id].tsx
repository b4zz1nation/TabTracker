import { useSQLiteContext } from 'expo-sqlite';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';

import ScreenContainer from '@/components/screen-container';
import { useLends } from '@/hooks/use-lends';
import { useCustomers } from '@/hooks/use-customers';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LendDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { lends } = useLends();
  const { customers } = useCustomers();
  const colorScheme = useColorScheme();

  const lendId = Number(id);
  const lend = lends.find((l) => l.id === lendId);
  const customer = customers.find((c) => c.id === lend?.customer_id);

  const stats = useMemo(() => {
    if (!lend) return null;
    
    const start = new Date(lend.created_at);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    
    let intervals = 0;
    let label = '';
    
    if (lend.interest_type === 'Daily') {
      intervals = Math.floor(diff / dayMs);
      label = `${intervals} Days`;
    } else if (lend.interest_type === 'Monthly') {
      intervals = Math.floor(diff / (dayMs * 30.4375));
      label = `${intervals} Months`;
    } else if (lend.interest_type === 'Yearly') {
      intervals = Math.floor(diff / (dayMs * 365.25));
      label = `${intervals} Years`;
    }
    
    const interest = (lend.amount * ((lend.interest_rate || 0) / 100)) * intervals;
    const total = lend.amount + interest;
    
    return {
      intervals,
      label,
      interest,
      total,
      daysElapsed: Math.floor(diff / dayMs)
    };
  }, [lend]);

  if (!lend || !stats) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loan not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const header = (
    <View className="px-5 py-4 flex-row items-center gap-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
      <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center p-2 active:opacity-50">
        <Ionicons name="chevron-back" size={24} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
      </Pressable>
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Interest Snapshot</Text>
    </View>
  );

  return (
    <ScreenContainer header={header} edges={['top', 'bottom']} centerContent={true} scrollable={false}>
      <View className="bg-white dark:bg-gray-900 rounded-[32px] p-8 mx-6 shadow-2xl border border-gray-100 dark:border-gray-800 mb-12">
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-sky-100 dark:bg-sky-900/30 items-center justify-center mb-4">
            <Ionicons name="pulse" size={40} color="#0ea5e9" />
          </View>
          <Text className="text-xs text-sky-500 font-black uppercase tracking-[4px] mb-1">Accumulating Now</Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{customer?.name}</Text>
        </View>

        <View className="border-t border-b border-dashed border-gray-200 dark:border-gray-800 py-6 my-2 gap-5">
          <View className="flex-row justify-between">
            <Text className="text-gray-400 dark:text-gray-500 font-medium">Principal</Text>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">₱{lend.amount.toFixed(2)}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">Agreement</Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lend.interest_type}</Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">{lend.interest_rate}%</Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">Duration</Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stats.daysElapsed} days total</Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">{stats.label}</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-400 dark:text-gray-500 font-medium font-black">Accrued Interest</Text>
            <Text className="text-emerald-500 font-black text-xl">+ ₱{stats.interest.toFixed(2)}</Text>
          </View>
        </View>

        <View className="mt-8 items-center">
            <Text className="text-gray-400 dark:text-gray-500 uppercase text-[10px] font-black tracking-[4px] mb-2 text-center">Current Balance (if settled now)</Text>
            <Text className="text-5xl font-black text-gray-900 dark:text-gray-100">₱{stats.total.toFixed(2)}</Text>
        </View>
        
        <View className="mt-6">
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest leading-relaxed">
              Started {new Date(lend.created_at).toLocaleDateString()}
            </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
