import { useSQLiteContext } from 'expo-sqlite';
import { Animated, FlatList, Modal, Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

import { useCustomers } from '@/hooks/use-customers';
import { useLends, Lend } from '@/hooks/use-lends';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const router = useRouter();
  const colorScheme = useColorScheme();

  const db = useSQLiteContext();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const { lends, refresh: refreshLends, completeLend, deleteLend } = useLends();

  // Local state for lends for immediate updates
  const [localLends, setLocalLends] = useState<Lend[]>([]);
  useEffect(() => {
    setLocalLends(lends.filter((l) => l.customer_id === customerId));
  }, [lends, customerId]);

  const [hideCompleted, setHideCompleted] = useState(false);
  const [selectedLend, setSelectedLend] = useState<Lend | null>(null);
  const [sheetMounted, setSheetMounted] = useState(false);
  const sheetAnim = useRef(new Animated.Value(300)).current;

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteStep, setDeleteStep] = useState<'initial' | 'confirm'>('initial');
  const [deleteModalMounted, setDeleteModalMounted] = useState(false);
  const deleteAnim = useRef(new Animated.Value(300)).current;

  const handleDeleteLend = async (id: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // 1. Delete from SQLite
      await deleteLend(id);

      // 2. Immediate local update for UI snappiness
      const updatedLocal = localLends.filter(l => l.id !== id);
      setLocalLends(updatedLocal);

      // 3. Update customer balance in DB and refresh hooks
      await updateBalanceInDB(updatedLocal);
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setDeleteStep('initial');
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

  const openSheet = (lend: Lend) => {
    setSelectedLend(lend);
    setSheetMounted(true);
    sheetAnim.setValue(300);
    Animated.timing(sheetAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeSheet = (cb?: () => void) => {
    Animated.timing(sheetAnim, { toValue: 300, duration: 250, useNativeDriver: true }).start(() => {
      setSelectedLend(null);
      setSheetMounted(false);
      cb?.();
    });
  };

  useFocusEffect(
    useCallback(() => {
      refreshCustomers();
      refreshLends();
    }, [refreshCustomers, refreshLends])
  );

  const customer = customers.find((c) => c.id === customerId);
  const ongoingLends = useMemo(() => localLends.filter((l) => l.status === 'Ongoing'), [localLends]);
  const completedLends = useMemo(() => localLends.filter((l) => l.status === 'Completed'), [localLends]);
  const totalOutstanding = useMemo(() => ongoingLends.reduce((s, l) => s + l.amount, 0), [ongoingLends]);

  // Utility to update balance in SQLite and refresh UI
  const updateBalanceInDB = async (lendsList: Lend[]) => {
    const newTotal = lendsList
      .filter(l => l.status === "Ongoing")
      .reduce((sum, l) => sum + l.amount, 0);
    await db.runAsync('UPDATE customers SET balance = ? WHERE id = ?', [newTotal, customerId]);
    refreshCustomers();
    refreshLends();
  };

  const displayedLends = useMemo(
    () => (hideCompleted ? ongoingLends : [...ongoingLends, ...completedLends]),
    [hideCompleted, ongoingLends, completedLends]
  );

  const freqShort: Record<string, string> = { Daily: 'day', Monthly: 'mo', Yearly: 'yr' };

  // --- Lend action handlers -------------------------------------------------
  const handleEditLend = () => {
    if (!selectedLend) return;
    const l = selectedLend;
    closeSheet(() => {
      router.push({
        pathname: '/add-customer',
        params: { 
          lendId: l.id, 
          customerId: l.customer_id,
          readOnly: l.status === 'Completed' ? 'true' : 'false'
        },
      });
    });
  };

  const handleCompleteLend = async () => {
    if (!selectedLend) return;
    await completeLend(selectedLend.id);
    
    // Update local state and recompute balance
    const updatedLends = localLends.map(l => l.id === selectedLend.id ? { ...l, status: 'Completed' as const, completed_at: new Date().toISOString() } : l);
    setLocalLends(updatedLends);
    await updateBalanceInDB(updatedLends);
    
    setSelectedLend(null);
    closeSheet();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddLend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/add-lend',
      params: {
        customer_id: customerId,
        customer_name: customer?.name ?? '',
      },
    });
  };

  // --- Render ----------------------------------------------------------------
  const renderLend = ({ item }: { item: Lend }) => {
    const done = item.status === 'Completed';
    const hasInterest = item.interest_enabled === 1 && item.interest_type;
    
    return (
      <View className="rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openSheet(item); }}
          onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openDeleteModal(item.id); }}
          className={`w-full flex-row items-center justify-between p-4 active:opacity-70 ${done ? 'bg-gray-50 dark:bg-zinc-950 opacity-80' : 'bg-white dark:bg-gray-900'}`}
          delayLongPress={500}
        >
          <View className="flex-1 mr-3">
            <Text className={`text-base font-semibold ${done ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
              ${item.amount.toFixed(2)}
            </Text>
            {hasInterest ? (
              <View className="self-start mt-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40">
                <Text className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                  {item.interest_rate}% / {freqShort[item.interest_type!] ?? item.interest_type}
                </Text>
              </View>
            ) : null}
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${done ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-sky-100 dark:bg-sky-900/30'}`}>
            <Text className={`text-[11px] font-semibold ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`}>
              {item.status}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-2 pb-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
        <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center -ml-2 mb-1 active:opacity-50">
          <Ionicons name="chevron-back" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
        </Pressable>
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customer?.name ?? 'Customer'}</Text>
        <View className="flex-row items-baseline mt-1 gap-2">
          <Text className="text-sm text-gray-400 dark:text-gray-500">Outstanding</Text>
          <Text className={`text-2xl font-extrabold ${totalOutstanding > 0 ? 'text-red-500' : 'text-green-500'}`}>
            ${totalOutstanding.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Show/Hide Toggle */}
      {completedLends.length > 0 && (
        <Pressable
          onPress={() => setHideCompleted((v) => !v)}
          className="flex-row items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800"
        >
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {hideCompleted ? `Show ${completedLends.length} completed` : 'Hide completed'}
          </Text>
          <Ionicons name={hideCompleted ? 'eye-outline' : 'eye-off-outline'} size={18} color="#9ca3af" />
        </Pressable>
      )}

      {/* Lend List */}
      <FlatList
        data={displayedLends}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLend}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
        ListEmptyComponent={
          <View className="items-center mt-20 gap-3">
            <Ionicons name="wallet-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 dark:text-gray-500 text-center px-10">No lends yet.</Text>
          </View>
        }
      />

      {/* FAB — add lend for this customer */}
      <Pressable
        onPress={handleAddLend}
        className="absolute bottom-10 right-8 w-16 h-16 rounded-full items-center justify-center bg-sky-500 shadow-lg shadow-sky-400/50 dark:shadow-sky-900/40 active:scale-95"
        style={{ elevation: 8, zIndex: 1000 }}
      >
        <Ionicons name="add" size={32} color="white" />
      </Pressable>

      {/* Lend Action Sheet */}
      <Modal visible={sheetMounted} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <View className="flex-1">
          {/* Instant backdrop */}
          <Pressable className="absolute inset-0 bg-black/50" onPress={() => closeSheet()} />
          {/* Sliding bottom sheet */}
          <Animated.View
            style={{ transform: [{ translateY: sheetAnim }] }}
            className="absolute bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-6 pb-10"
          >
            {/* Pill handle */}
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />

            <View className="gap-3">
              {/* Edit / View Details */}
              <Pressable onPress={handleEditLend} className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-sky-100 dark:bg-sky-900/40 mr-4">
                  <Ionicons name={selectedLend?.status === 'Completed' ? 'eye-outline' : 'create-outline'} size={20} color="#0ea5e9" />
                </View>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {selectedLend?.status === 'Completed' ? 'View Details' : 'Edit'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>

              {/* Complete (only for Ongoing) */}
              {selectedLend?.status === 'Ongoing' && (
                <Pressable onPress={handleCompleteLend} className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700">
                  <View className="w-10 h-10 rounded-full items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 mr-4">
                    <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                  </View>
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">Mark Complete</Text>
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

            {deleteStep === 'initial' ? (
              <>
                <View className="mb-8">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Entry?</Text>
                  <Text className="text-gray-500 dark:text-gray-400">This action cannot be undone.</Text>
                </View>

                <View className="gap-4">
                  <Pressable 
                    onPress={() => setDeleteStep('confirm')} 
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
              </>
            ) : (
              <>
                <View className="mb-8">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Are you sure?</Text>
                  <Text className="text-gray-500 dark:text-gray-400">Seriously, this action cannot be undone.</Text>
                </View>

                <View className="gap-4">
                  <Pressable 
                    onPress={() => closeDeleteModal(() => { if (deleteId) handleDeleteLend(deleteId); })} 
                    className="w-full bg-rose-500 p-5 rounded-2xl items-center justify-center active:bg-rose-600"
                  >
                    <Text className="text-white font-bold text-lg">Yes, Delete</Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => setDeleteStep('initial')} 
                    className="w-full p-4 items-center justify-center active:opacity-60"
                  >
                    <Text className="text-gray-400 dark:text-gray-500 font-semibold text-lg">Go Back</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
