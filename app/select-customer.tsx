import { useState, useCallback, useMemo } from 'react';
import { FlatList, Pressable, TextInput, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useCustomers, Customer } from '@/hooks/use-customers';
import { useLends } from '@/hooks/use-lends';
import { useColorScheme } from '@/hooks/use-color-scheme';
import ScreenContainer from '@/components/screen-container';

export default function SelectCustomerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const { lends, refresh: refreshLends } = useLends();
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      refreshCustomers();
      refreshLends();
    }, [refreshCustomers, refreshLends])
  );

  const customerStats = useMemo(() => {
    const map: Record<number, { totalOngoing: number; interestBadge: string | null; latestDate: string | null; lendCount: number }> = {};
    for (const c of customers) {
      const cLends = lends.filter((l) => l.customer_id === c.id && l.status === 'Ongoing');
      const total = cLends.reduce((s, l) => s + l.amount, 0);
      const withInterest = cLends.find((l) => l.interest_enabled === 1 && l.interest_type);
      const freqShort: Record<string, string> = { Daily: 'day', Monthly: 'mo', Yearly: 'yr' };
      const badge = withInterest
        ? `${withInterest.interest_rate}% / ${freqShort[withInterest.interest_type!] ?? withInterest.interest_type}`
        : null;
      // Latest lend date
      const sorted = cLends.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latestDate = sorted.length > 0 ? sorted[0].created_at : null;
      map[c.id] = { totalOngoing: total, interestBadge: badge, latestDate, lendCount: cLends.length };
    }
    return map;
  }, [customers, lends]);

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-sky-400', 'bg-emerald-400', 'bg-violet-400',
      'bg-amber-400', 'bg-rose-400', 'bg-teal-400'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

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

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} className="w-12 h-12 items-center justify-center">
            <Ionicons name="chevron-back" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 italic">
            Select Customer
        </Text>
        <View className="w-12" />
    </View>
  );

  const renderItem = ({ item }: { item: Customer }) => {
    const stats = customerStats[item.id] ?? { totalOngoing: 0, interestBadge: null, latestDate: null, lendCount: 0 };
    const isPositive = stats.totalOngoing > 0;
    const amountAbs = Math.abs(stats.totalOngoing).toFixed(2);
    const avatarColor = getAvatarColor(item.name);
    const firstChar = item.name.charAt(0).toUpperCase();

    return (
      <View className="rounded-2xl mx-4 mb-3 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <Pressable
          onPress={() => handleSelect(item)}
          className="flex-row items-center p-4 active:opacity-70"
        >
          {/* Left — Avatar */}
          <View className={`w-11 h-11 rounded-full items-center justify-center mr-4 ${avatarColor}`}>
            <Text className="text-white font-bold text-lg">{firstChar}</Text>
          </View>

          {/* Center — Name, Reference */}
          <View className="flex-1 mr-3">
            <Text className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">{item.name}</Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {stats.lendCount > 0 ? `${stats.lendCount} active lend${stats.lendCount !== 1 ? 's' : ''}` : 'No active lends'}
              {stats.interestBadge ? `  ·  ${stats.interestBadge}` : ''}
            </Text>
          </View>

          {/* Right — Amount */}
          {stats.totalOngoing !== 0 && (
            <Text className={`text-[16px] font-bold ${isPositive ? 'text-emerald-500' : 'text-gray-900 dark:text-gray-100'}`}>
              {isPositive ? '+ ' : ''}{amountAbs} $
            </Text>
          )}
          <Ionicons name="chevron-forward" size={16} color="#d1d5db" className="ml-2" />
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenContainer scrollable={false} edges={['top', 'bottom']} header={header}>
      <View className="flex-1 pt-4">
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
