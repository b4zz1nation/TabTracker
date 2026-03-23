import { useSQLiteContext } from 'expo-sqlite';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, useEffect } from 'react';

import ScreenContainer from '@/components/screen-container';
import { useLends } from '@/hooks/use-lends';
import { useCustomers } from '@/hooks/use-customers';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LendDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { lends, getPayments } = useLends();
  const { customers } = useCustomers();
  const colorScheme = useColorScheme();

  const [payments, setPayments] = useState<{ id: number; amount: number; created_at: string }[]>([]);

  const lendId = Number(id);
  const lend = lends.find((l) => l.id === lendId);
  const customer = customers.find((c) => c.id === lend?.customer_id);

  useEffect(() => {
    let isMounted = true;
    if (lendId) {
      getPayments(lendId).then((res) => {
        if (isMounted) setPayments(res);
      });
    }
    return () => { isMounted = false; };
  }, [lendId, getPayments, lends]); // getPayments is now stable

  const stats = useMemo(() => {
    if (!lend) return null;
    
    const start = new Date(lend.created_at);
    const now = lend.status === 'Completed' && lend.completed_at ? new Date(lend.completed_at) : new Date();
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
    
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // For completed lends, use history as the truth because amount is zeroed out
    if (lend.status === 'Completed') {
      return {
        intervals,
        label,
        interest: 0, // In completed state, interest is already part of totalPaid
        total: totalPaid,
        totalPaid,
        daysElapsed: Math.floor(diff / dayMs)
      };
    }

    const interest = (lend.amount * ((lend.interest_rate || 0) / 100)) * intervals;
    const total = lend.amount + interest;

    return {
      intervals,
      label,
      interest,
      total,
      totalPaid,
      daysElapsed: Math.floor(diff / dayMs)
    };
  }, [lend, payments]);

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
    <ScreenContainer header={header} edges={['top', 'bottom']} centerContent={false} scrollable={true}>
      <View className="bg-white dark:bg-gray-900 rounded-[32px] p-6 mx-6 shadow-2xl border border-gray-100 dark:border-gray-800 mt-4 mb-4">
        <View className="items-center mb-6">
          <View className={`w-16 h-16 rounded-full ${lend.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-sky-100 dark:bg-sky-900/30'} items-center justify-center mb-3`}>
            <Ionicons name={lend.status === 'Completed' ? 'checkmark-done' : 'pulse'} size={32} color={lend.status === 'Completed' ? '#10b981' : '#0ea5e9'} />
          </View>
          <Text className={`text-[10px] ${lend.status === 'Completed' ? 'text-emerald-500' : 'text-sky-500'} font-black uppercase tracking-[4px] mb-1`}>
            {lend.status === 'Completed' ? 'Final Snapshot' : 'Accumulating Now'}
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{customer?.name}</Text>
        </View>

        <View className="border-t border-b border-dashed border-gray-200 dark:border-gray-800 py-4 my-1 gap-4">
          <View className="flex-row justify-between">
            <Text className="text-gray-400 dark:text-gray-500 font-medium">Remaining Principal</Text>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">₱{lend.amount.toFixed(2)}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">Agreement</Text>
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{lend.interest_type}</Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">{lend.interest_rate}%</Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 font-medium">Duration</Text>
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stats.daysElapsed} days total</Text>
            </View>
            <Text className="text-gray-900 dark:text-gray-100 font-bold">{stats.label}</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-400 dark:text-gray-500 font-medium font-black">Accrued Interest</Text>
            <Text className="text-emerald-500 font-black text-xl">+ ₱{stats.interest.toFixed(2)}</Text>
          </View>
        </View>

        <View className="mt-6 items-center">
            <Text className="text-gray-400 dark:text-gray-500 uppercase text-[9px] font-black tracking-[4px] mb-2 text-center leading-4">
              {lend.status === 'Completed' ? 'Total Amount\nSettled' : 'Current Balance\n(if settled now)'}
            </Text>
            <Text className="text-4xl font-black text-gray-900 dark:text-gray-100">₱{stats.total.toFixed(2)}</Text>
        </View>

        <View className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 border-dashed">
            <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-xs">Total Paid (History)</Text>
                <Text className="text-sky-500 font-bold text-xs">₱{stats.totalPaid.toFixed(2)}</Text>
            </View>
        </View>

        {lend.description ? (
          <View className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1 ml-1">Description</Text>
            <Text className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
              "{lend.description}"
            </Text>
          </View>
        ) : null}
        
        <View className="mt-4">
            <Text className="text-[9px] text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest leading-relaxed">
              Started {new Date(lend.created_at).toLocaleDateString()}
            </Text>
        </View>
      </View>

      {/* Payment History Section */}
      {payments.length > 0 && (
        <View className="mx-6 mb-10">
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[4px] mb-4 ml-2">Payment History</Text>
            <View className="bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800">
                {payments.map((p, i) => (
                    <View key={p.id} className={`flex-row items-center justify-between p-4 ${i !== payments.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}>
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mr-3">
                                <Ionicons name="cash-outline" size={16} color="#10b981" />
                            </View>
                            <View>
                                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">₱{p.amount.toFixed(2)}</Text>
                                <Text className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(p.created_at).toLocaleDateString()}</Text>
                            </View>
                        </View>
                        <View className="bg-sky-50 dark:bg-sky-900/20 px-2 py-1 rounded-full">
                            <Text className="text-[8px] font-black text-sky-500 uppercase tracking-widest">Partial</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
      )}
    </ScreenContainer>
  );
}
