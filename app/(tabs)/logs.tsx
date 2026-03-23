import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ScreenContainer from '@/components/screen-container';
import { useLends } from '@/hooks/use-lends';
import { useCustomers } from '@/hooks/use-customers';

const LogCard = React.memo(({ group }: { group: any }) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(expandAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const rotation = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const height = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400] 
  });

  const getIcon = (type: string) => {
    if (type === 'success') return { name: 'checkmark-done-circle', color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-900/40' };
    if (type === 'payment') return { name: 'cash-outline', color: '#0ea5e9', bg: 'bg-sky-100 dark:bg-sky-900/40' };
    return { name: 'add-circle', color: '#8b5cf6', bg: 'bg-violet-100 dark:bg-violet-900/40' };
  };

  return (
    <View className="mx-4 mb-4">
      <Pressable 
        onPress={toggle}
        className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
      >
        <View className="p-5">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${group.lend.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-sky-50 dark:bg-sky-900/20'}`}>
                <Ionicons name={group.lend.status === 'Completed' ? 'checkmark-circle' : 'pulse'} size={24} color={group.lend.status === 'Completed' ? '#10b981' : '#38bdf8'} />
              </View>
              <View>
                <Text className="text-lg font-black text-gray-900 dark:text-gray-100">{group.customer?.name || 'Unknown'}</Text>
                <Text className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">REF: #{group.lend.id.toString().padStart(6, '0')}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
               <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </Animated.View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">Principal</Text>
              <Text className="text-base font-black text-gray-900 dark:text-gray-100">₱{group.initialPrincipal.toFixed(2)}</Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">Total Settled</Text>
              <Text className="text-base font-black text-emerald-500">₱{group.totalPaid.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <Animated.View style={{ maxHeight: height, opacity: expandAnim, overflow: 'hidden' }}>
          <View className="bg-gray-50 dark:bg-gray-800/20 px-4 pt-2 pb-5 border-t border-gray-50 dark:border-gray-800/50">
             <Text className="text-[8px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[3px] mb-3 mt-2 ml-1 text-center font-mono">--- Activity Sequence ---</Text>
             <View className="gap-2">
               {group.activities.map((act: any) => {
                 const icon = getIcon(act.type);
                 return (
                   <View key={act.id} className="flex-row items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      <View className="flex-row items-center">
                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${icon.bg}`}>
                          <Ionicons name={icon.name as any} size={16} color={icon.color} />
                        </View>
                        <View>
                          <Text className="text-[11px] font-black text-gray-900 dark:text-gray-100">{act.title}</Text>
                          <Text className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">{new Date(act.date).toLocaleDateString()} • {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                      </View>
                      <Text className="text-[12px] font-black text-gray-900 dark:text-gray-100">{act.subtitle}</Text>
                   </View>
                 );
               })}
             </View>
             <Pressable 
                onPress={() => router.push(`/lend-details/${group.lend.id}`)}
                className="mt-4 flex-row items-center justify-center gap-2 active:opacity-50"
             >
               <Text className="text-[10px] font-black text-sky-500 uppercase tracking-widest">View Full Details</Text>
               <Ionicons name="arrow-forward" size={14} color="#0ea5e9" />
             </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
});

export default function LogsScreen() {
  const { lends, refresh: refreshLends, getPaymentsByCustomer } = useLends();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const [allPayments, setAllPayments] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    refreshLends();
    refreshCustomers();
    
    const paymentsBatch = await Promise.all(
      customers.map(c => getPaymentsByCustomer(c.id))
    );
    setAllPayments(paymentsBatch.flat());
  }, [refreshLends, refreshCustomers, customers, getPaymentsByCustomer]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const groupedLogs = useMemo(() => {
    const groups: Record<number, any> = {};

    lends.forEach(l => {
      const customer = customers.find(c => c.id === l.customer_id);
      const payments = allPayments.filter(p => p.lend_id === l.id);
      const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
      const initialPrincipal = l.amount + totalPayments;

      const items: any[] = [];

      items.push({
        id: `lend_${l.id}`,
        title: 'New Lend Added',
        subtitle: `₱${initialPrincipal.toFixed(2)}`,
        date: l.created_at,
        type: 'info'
      });

      payments.forEach(p => {
        items.push({
          id: `pay_${p.id}`,
          title: 'Payment Received',
          subtitle: `₱${p.amount.toFixed(2)}`,
          date: p.created_at,
          type: 'payment'
        });
      });

      if (l.status === 'Completed' && l.completed_at) {
        items.push({
          id: `comp_${l.id}`,
          title: 'Loan Settled',
          subtitle: `₱${totalPayments.toFixed(2)}`,
          date: l.completed_at,
          type: 'success'
        });
      }

      const latestDate = items.reduce((max, cur) => 
        new Date(cur.date).getTime() > new Date(max).getTime() ? cur.date : max, 
        l.created_at
      );

      groups[l.id] = {
        lend: l,
        customer,
        activities: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        latestDate,
        totalPaid: totalPayments,
        initialPrincipal
      };
    });

    return Object.values(groups).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [lends, customers, allPayments]);

  return (
    <ScreenContainer scrollable={false} header={<View className="px-5 py-4"><Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Logs</Text></View>}>
      <FlatList
        data={groupedLogs}
        keyExtractor={item => item.lend.id.toString()}
        renderItem={({ item }) => <LogCard group={item} />}
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
