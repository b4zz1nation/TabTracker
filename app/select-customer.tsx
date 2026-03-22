import { useState, useCallback, useMemo, useRef } from 'react';
import { FlatList, Pressable, TextInput, View, Text, TouchableOpacity, Animated, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCustomers, Customer } from '@/hooks/use-customers';
import { useLends } from '@/hooks/use-lends';
import { useColorScheme } from '@/hooks/use-color-scheme';
import ScreenContainer from '@/components/screen-container';

export default function SelectCustomerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { customers, refresh: refreshCustomers, deleteCustomer } = useCustomers();
  const { lends, refresh: refreshLends } = useLends();
  const [search, setSearch] = useState('');
 
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteModalMounted, setDeleteModalMounted] = useState(false);
  const deleteAnim = useRef(new Animated.Value(300)).current;
 
  const handleDeleteCustomer = async (id: number) => {
    try {
      await deleteCustomer(id);
      refreshCustomers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
    }
  };
 
  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setDeleteModalMounted(true);
    deleteAnim.setValue(300);
    Animated.timing(deleteAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  };
 
  const closeDeleteModal = (cb?: () => void) => {
    Animated.timing(deleteAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => {
      setDeleteModalMounted(false);
      setDeleteId(null);
      cb?.();
    });
  };

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
      <View className="rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <Pressable
          onPress={() => handleSelect(item)}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            openDeleteModal(item.id);
          }}
          delayLongPress={500}
          className="flex-row items-center p-5 active:opacity-70"
        >
          {/* Left — Avatar */}
          <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${avatarColor} shadow-sm`}>
            <Text className="text-white font-bold text-lg">{firstChar}</Text>
          </View>
 
          {/* Center — Name Info */}
          <View className="flex-1">
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] font-black mb-0.5">Customer</Text>
            <Text className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{item.name}</Text>
          </View>
 
          {/* Right — Amount */}
          {stats.totalOngoing !== 0 && (
            <View className="items-end mr-2">
              <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-0.5">Balance</Text>
              <Text className={`text-base font-black ${isPositive ? 'text-emerald-500' : 'text-gray-900 dark:text-gray-100'}`}>
                ₱{amountAbs}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </Pressable>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <ScreenContainer scrollable={false} edges={['top', 'bottom']} header={header}>
      <View className="flex-1 pt-4">
        {/* Search Bar */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-900 rounded-2xl border border-transparent dark:border-gray-800 px-4 h-14">
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
 
    {/* Delete Confirmation Modal */}
    <Modal visible={deleteModalMounted} transparent animationType="none" onRequestClose={() => closeDeleteModal()}>
      <View className="flex-1">
        <Pressable className="absolute inset-0 bg-black/50" onPress={() => closeDeleteModal()} />
        <Animated.View
          style={{ transform: [{ translateY: deleteAnim }] }}
          className="absolute bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-6 pb-12"
        >
          <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
 
          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Contact?</Text>
            <Text className="text-gray-500 dark:text-gray-400">This will also delete all their transaction history. This action cannot be undone.</Text>
          </View>
 
          <View className="gap-4">
            <Pressable 
              onPress={() => closeDeleteModal(() => { if (deleteId) handleDeleteCustomer(deleteId); })} 
              className="w-full bg-rose-500 p-5 rounded-2xl items-center justify-center active:bg-rose-600"
            >
              <Text className="text-white font-bold text-lg">Delete</Text>
            </Pressable>
            
            <Pressable 
              onPress={() => closeDeleteModal()} 
              className="w-full p-4 items-center justify-center active:opacity-60"
            >
              <Text className="text-gray-400 dark:text-gray-500 font-semibold text-lg">Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
    </View>
  );
}
