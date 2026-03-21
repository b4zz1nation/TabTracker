import { Animated, FlatList, Modal, Pressable, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { useCustomers, Customer } from '@/hooks/use-customers';
import { useLends, Lend } from '@/hooks/use-lends';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserProfile } from '@/services/user-profile';

export default function HomeScreen() {
  const { customers, refresh: refreshCustomers, deleteCustomer } = useCustomers();
  const { lends, refresh: refreshLends } = useLends();
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMounted, setPickerMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteModalMounted, setDeleteModalMounted] = useState(false);
  const deleteAnim = useRef(new Animated.Value(300)).current;

  const handleDeleteCustomer = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteCustomer(id);
  };

  const openPicker = () => {
    setPickerMounted(true);
    setShowPicker(true);
    slideAnim.setValue(300);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closePicker = (cb?: () => void) => {
    Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }).start(() => {
      setShowPicker(false);
      setPickerMounted(false);
      cb?.();
    });
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
      setShowPicker(false);
      setPickerMounted(false);
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

  // Handlers
  const handleFabPress = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openPicker(); };
  const handleAddNew = () => { closePicker(() => router.push('/add-customer')); };
  const handleAddExisting = () => { closePicker(() => router.push('/select-customer')); };

  // Format date as DD.MM.YYYY
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

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
    const isPositive = stats.totalOngoing > 0;
    const amountAbs = Math.abs(stats.totalOngoing).toFixed(2);
    const avatarColor = getAvatarColor(item.name);
    const firstChar = item.name.charAt(0).toUpperCase();

    return (
      <View className="rounded-2xl mx-4 mb-3 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <Pressable
          onPress={() => router.push(`/customer/${item.id}` as any)}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            openDeleteModal(item.id);
          }}
          className="flex-row items-center p-4 active:opacity-70"
          delayLongPress={500}
        >
          {/* Left — Avatar */}
          <View className={`w-11 h-11 rounded-full items-center justify-center mr-4 ${avatarColor}`}>
            <Text className="text-white font-bold text-lg">{firstChar}</Text>
          </View>

          {/* Center — Name, Reference, Date */}
          <View className="flex-1 mr-3">
            <Text className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">{item.name}</Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {stats.lendCount > 0
                ? `${stats.lendCount} active lend${stats.lendCount !== 1 ? 's' : ''}`
                : 'No active lends'}
              {stats.interestBadge ? `  ·  ${stats.interestBadge}` : ''}
            </Text>
            {stats.latestDate ? (
              <Text className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">{formatDate(stats.latestDate)}</Text>
            ) : null}
          </View>

          {/* Right — Amount */}
          <Text
            className={`text-[16px] font-bold ${
              isPositive
                ? 'text-emerald-500'
                : stats.totalOngoing < 0
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {isPositive ? '+ ' : stats.totalOngoing < 0 ? '- ' : ''}{amountAbs} $
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950 pt-16">
      {userName ? <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 px-5 pt-2">{`Hey, ${userName} 👋`}</Text> : null}

      {/* Summary */}
      <View className="m-4 p-6 rounded-3xl items-center justify-center bg-sky-50 dark:bg-sky-950/20">
        <Text className="text-sm font-medium uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-1">Total Owed to You</Text>
        <Text className={`text-4xl font-extrabold ${grandTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          ${grandTotal.toFixed(2)}
        </Text>
      </View>

      {/* Customer List */}
      <FlatList
        data={activeCustomers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        ListEmptyComponent={
          <View className="items-center mt-20 gap-4">
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-400 dark:text-gray-500 text-center px-10">No customers yet. Tap + to get started!</Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable onPress={handleFabPress} className="absolute bottom-10 right-8 w-16 h-16 rounded-full items-center justify-center bg-sky-500 shadow-lg shadow-sky-400/50 dark:shadow-sky-900/40 active:scale-95" style={{ elevation: 8, zIndex: 1000 }}>
        <Ionicons name="add" size={32} color="white" />
      </Pressable>

      {/* "+" Option Picker */}
      <Modal visible={pickerMounted} transparent animationType="none" onRequestClose={() => closePicker()}>
        <View className="flex-1">
          {/* Instant backdrop */}
          <Pressable className="absolute inset-0 bg-black/50" onPress={() => closePicker()} />
          {/* Sliding bottom sheet */}
          <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            className="absolute bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-6 pb-10"
          >
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />

            <View className="gap-3">
              <Pressable onPress={handleAddNew} className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-sky-100 dark:bg-sky-900/40 mr-4"><Ionicons name="person-add" size={20} color="#0ea5e9" /></View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Add New</Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500">Create a new customer record</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
              {customers.length > 0 && (
                <Pressable onPress={handleAddExisting} className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700">
                  <View className="w-10 h-10 rounded-full items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 mr-4"><Ionicons name="people" size={20} color="#10b981" /></View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Add Existing</Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500">Add a lend to an existing customer</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

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
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Entry?</Text>
              <Text className="text-gray-500 dark:text-gray-400">This action cannot be undone.</Text>
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
