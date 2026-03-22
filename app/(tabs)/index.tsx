import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, FlatList, Modal, Pressable, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';

import { useCustomers, Customer } from '@/hooks/use-customers';
import { useLends, Lend } from '@/hooks/use-lends';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserProfile } from '@/services/user-profile';

export default function HomeScreen() {
  const { customers, refresh: refreshCustomers } = useCustomers();
  const { lends, refresh: refreshLends } = useLends();
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [userName, setUserName] = useState('');

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteModalMounted, setDeleteModalMounted] = useState(false);
  const deleteAnim = useRef(new Animated.Value(300)).current;

  const handleDeleteOngoingLends = async (customerId: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await db.runAsync("DELETE FROM lends WHERE customer_id = ? AND status = 'Ongoing'", [customerId]);
      await db.runAsync('UPDATE customers SET balance = 0 WHERE id = ?', [customerId]);
      await refreshCustomers();
      await refreshLends();
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
      setDeleteModalMounted(false);
    }, [refreshCustomers, refreshLends])
  );

  useEffect(() => {
    (async () => {
      const p = await getUserProfile();
      setUserName(p?.name ?? '');
    })();
  }, []);

  // Pre-compute per-customer stats from lends
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

  const grandTotal = useMemo(
    () => customers.reduce((s, c) => s + (c.balance || 0), 0),
    [customers]
  );

  const activeCustomers = useMemo(() => {
    return customers.filter((c) => {
      const stats = customerStats[c.id];
      return stats && (stats.lendCount > 0 || stats.totalOngoing !== 0);
    });
  }, [customers, customerStats]);

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-sky-400', 'bg-emerald-400', 'bg-violet-400',
      'bg-amber-400', 'bg-rose-400', 'bg-teal-400'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderItem = ({ item }: { item: Customer }) => {
    const stats = customerStats[item.id] ?? { totalOngoing: 0, interestBadge: null, latestDate: null, lendCount: 0 };
    const amountAbs = Math.abs(item.balance || 0).toFixed(2);
    const avatarColor = getAvatarColor(item.name);
    
    return (
      <View className="rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <Pressable
          onPress={() => router.push(`/customer/${item.id}`)}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            openDeleteModal(item.id);
          }}
          delayLongPress={500}
          className="flex-row items-center p-5 active:bg-gray-50 dark:active:bg-gray-800/50"
        >
          {/* Left — Avatar */}
          <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${avatarColor} shadow-sm`}>
            <Text className="text-white font-bold text-lg">{item.name.charAt(0).toUpperCase()}</Text>
          </View>
 
          {/* Center — Name Info */}
          <View className="flex-1">
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] font-black mb-0.5">Customer</Text>
            <Text className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{item.name}</Text>
            {stats.interestBadge && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="trending-up" size={12} color="#0ea5e9" style={{ marginRight: 4 }} />
                <Text className="text-[10px] text-sky-500 font-bold uppercase">{stats.interestBadge}</Text>
              </View>
            )}
          </View>
 
          {/* Right — Amount */}
          <View className="items-end mr-2">
            <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-1">Balance</Text>
            <Text className={`text-xl font-black ${item.balance > 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
              ₱{amountAbs}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={['top']}>
      <FlatList
        data={activeCustomers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          { paddingBottom: 100 },
          activeCustomers.length === 0 && { flexGrow: 1, justifyContent: 'center' }
        ]}
        ListHeaderComponent={
          <View className={activeCustomers.length === 0 ? 'mb-4' : ''}>
            {userName ? <Text className="text-xl font-black text-gray-900 dark:text-gray-100 px-5 pt-4 pb-2 text-center">{`Hey, ${userName}`}</Text> : null}

            {/* Summary */}
            <View className="m-4 p-8 rounded-[40px] items-center justify-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
              <Text className="text-[10px] font-black uppercase tracking-[4px] text-gray-400 dark:text-gray-500 mb-3">Total Owed to You</Text>
              <Text className={`text-6xl font-black ${grandTotal > 0 ? 'text-red-500' : 'text-emerald-500'} tracking-tighter`}>
                ₱{grandTotal.toFixed(2)}
              </Text>
            </View>
            
            {activeCustomers.length > 0 && (
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-gray-400 dark:text-gray-500 px-6 mt-4 mb-2">Active Tabs</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center gap-6 px-10">
            <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Ionicons name="people-outline" size={40} color="#d1d5db" />
            </View>
            <View>
              <Text className="text-gray-900 dark:text-gray-100 text-xl font-bold text-center mb-2">No Active Tabs</Text>
              <Text className="text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                Your lending dashboard is empty. Tap the center **+** to start tracking your first lend!
              </Text>
            </View>
          </View>
        }
      />

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
                <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Clear Transaction?</Text>
                <Text className="text-gray-500 dark:text-gray-400">This will remove the ongoing lend without deleting the contact. This action cannot be undone.</Text>
              </View>

              <View className="gap-4">
                <Pressable
                  onPress={() => closeDeleteModal(() => { if (deleteId) handleDeleteOngoingLends(deleteId); })}
                  className="w-full bg-rose-500 p-5 rounded-2xl items-center justify-center active:bg-rose-600"
                >
                  <Text className="text-white font-bold text-lg">Clear Lend</Text>
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
    </SafeAreaView>
  );
}
