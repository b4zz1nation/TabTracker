import { useSQLiteContext } from 'expo-sqlite';
import { Animated, FlatList, Modal, Pressable, View, Text, Platform, TextInput, Keyboard, KeyboardAvoidingView, Dimensions } from 'react-native';
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
  const { lends, refresh: refreshLends, completeLend, deleteLend, addPayment } = useLends();

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

  // Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrentBalance, setPaymentCurrentBalance] = useState('0.00');
  const paymentSlideAnim = useRef(new Animated.Value(600)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const paymentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!paymentModalVisible) return;

    // Reset and animate in
    paymentAmount === '' && setPaymentAmount('');
    paymentSlideAnim.setValue(600);
    Animated.spring(paymentSlideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Auto-focus the input
    const timer = setTimeout(() => {
        paymentInputRef.current?.focus();
    }, 400);

    // Keyboard handling
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // On Android, Modals often handle the keyboard better natively.
      // On iOS, we need to shift. To avoid flying too far, we can limit the shift
      // or use exactly what's needed.
      const keyboardHeight = e.endCoordinates.height;
      
      // If the modal was flying too high, it might be due to compounding values or 
      // measureInWindow being called while an animation is in progress.
      // Let's use a more stable logic: use the keyboard height but only for the 
      // portion that actually covers the modal bottom.
      
      const screenHeight = Dimensions.get('window').height;
      const targetOffset = Platform.OS === 'ios' ? -keyboardHeight : 0;

      Animated.timing(keyboardOffset, {
        toValue: targetOffset,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      clearTimeout(timer);
      showSub.remove();
      hideSub.remove();
    };
  }, [paymentModalVisible]);

  const closePaymentModal = (cb?: () => void) => {
    Keyboard.dismiss();
    Animated.timing(paymentSlideAnim, {
      toValue: 600,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPaymentModalVisible(false);
      setPaymentAmount('');
      cb?.();
    });
  };

  const handleConfirmPayment = async () => {
    if (!selectedLend) return;
    const payAmount = parseFloat(paymentAmount);
    if (isNaN(payAmount) || payAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addPayment(selectedLend.id, payAmount);
      
      // Update local lends to reflect payment (simplification: just refresh or do more precise update)
      // Since addPayment updates DB and calls refreshLends, and we have an effect that 
      // syncs localLends with lends, it should just work.
      
      closePaymentModal();
      setSelectedLend(null);
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

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
 
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-sky-400', 'bg-emerald-400', 'bg-violet-400',
      'bg-amber-400', 'bg-rose-400', 'bg-teal-400'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
 
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

  const handleViewAccumulation = () => {
    if (!selectedLend) return;
    const l = selectedLend;
    closeSheet(() => {
      router.push({
        pathname: '/lend-details/[id]',
        params: { id: l.id.toString() }
      });
    });
  };

  const handleAddPayment = () => {
    if (!selectedLend) return;
    const l = selectedLend;
    
    // Calculate current balance for the payment modal
    const start = new Date(l.created_at);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    let intervals = 0;
    if (l.interest_type === 'Daily') intervals = Math.floor(diff / dayMs);
    else if (l.interest_type === 'Monthly') intervals = Math.floor(diff / (dayMs * 30.4375));
    else if (l.interest_type === 'Yearly') intervals = Math.floor(diff / (dayMs * 365.25));
    const interest = (l.amount * ((l.interest_rate || 0) / 100)) * intervals;
    const total = l.amount + interest;

    setPaymentCurrentBalance(total.toFixed(2));
    
    // Keep sheet mounted but hide it via animation or just close it
    closeSheet(() => {
      setPaymentModalVisible(true);
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
      <View className={`rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800 ${done ? 'opacity-70' : ''}`}>
        <Pressable
          onPress={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
            if (done) {
              router.push({
                pathname: '/add-customer',
                params: { 
                  lendId: item.id, 
                  customerId: item.customer_id,
                  readOnly: 'true'
                },
              });
            } else {
              openSheet(item); 
            }
          }}
          onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openDeleteModal(item.id); }}
          className={`w-full flex-row items-center justify-between active:opacity-70 ${done ? 'bg-gray-50 dark:bg-gray-900/50 p-3' : 'bg-white dark:bg-gray-900 p-4'}`}
          delayLongPress={500}
        >
          <View className="flex-1 mr-3">
            <View className="flex-row items-center">
              <Text className={`${done ? 'text-sm' : 'text-base'} font-bold ${done ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                ₱{item.amount.toFixed(2)}
              </Text>
              {done && item.description && (
                <Text className="text-[10px] text-gray-400 dark:text-gray-500 italic ml-2 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md" numberOfLines={1}>
                  "{item.description}"
                </Text>
              )}
            </View>

            {!done && hasInterest && (
              <View className="self-start mt-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40">
                <Text className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                  {item.interest_rate}% / {freqShort[item.interest_type!] ?? item.interest_type}
                </Text>
              </View>
            )}

            {!done && item.description && (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic" numberOfLines={1}>
                "{item.description}"
              </Text>
            )}

            <Text className={`${done ? 'text-[9px]' : 'text-xs'} text-gray-400 dark:text-gray-500 mt-0.5`}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View className={`px-2.5 py-1 rounded-full ${done ? 'bg-emerald-100/50 dark:bg-emerald-900/20' : 'bg-sky-100 dark:bg-sky-900/30'}`}>
            <Text className={`text-[10px] font-semibold ${done ? 'text-emerald-500' : 'text-sky-600 dark:text-sky-400'}`}>
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
      <View className="px-5 pt-3 pb-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
        <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center -ml-2 mb-2 active:opacity-50">
          <Ionicons name="chevron-back" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
        </Pressable>
 
         <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
                 <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${getAvatarColor(customer?.name || 'C')} shadow-sm`}>
                     <Text className="text-white font-bold text-lg">{(customer?.name || 'C').charAt(0).toUpperCase()}</Text>
                 </View>
                 <View>
                     <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] font-black mb-0.5">Lending to</Text>
                     <Text className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{customer?.name}</Text>
                 </View>
            </View>
 
            <View className="items-end">
                <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-1">Outstanding</Text>
                <Text className={`text-xl font-black ${totalOutstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    ₱{totalOutstanding.toFixed(2)}
                </Text>
            </View>
         </View>
      </View>

      {/* Show/Hide Toggle */}
      {completedLends.length > 0 && (
        <Pressable
          onPress={() => setHideCompleted((v) => !v)}
          className="flex-row items-center justify-between px-5 py-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900"
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
            className="absolute bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-6 pb-10 border-t border-gray-100 dark:border-gray-800"
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
 
               {/* Accumulation Details (only for Ongoing with interest) */}
               {selectedLend?.status === 'Ongoing' && selectedLend?.interest_enabled === 1 && (
                 <Pressable onPress={handleViewAccumulation} className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700">
                   <View className="w-10 h-10 rounded-full items-center justify-center bg-amber-100 dark:bg-amber-900/40 mr-4">
                     <Ionicons name="trending-up" size={20} color="#f59e0b" />
                   </View>
                   <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">View Accumulation</Text>
                   <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                 </Pressable>
               )}

               {/* Add Payment (only for Ongoing) */}
               {selectedLend?.status === 'Ongoing' && (
                 <Pressable onPress={handleAddPayment} className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700">
                   <View className="w-10 h-10 rounded-full items-center justify-center bg-sky-100 dark:bg-sky-900/40 mr-4">
                     <Ionicons name="cash-outline" size={20} color="#0ea5e9" />
                   </View>
                   <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">Add Payment</Text>
                   <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                 </Pressable>
               )}
 
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

      {/* Partial Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="none" onRequestClose={() => closePaymentModal()}>
        <View className="flex-1">
          {/* Backdrop */}
          <Pressable 
            className="absolute inset-0 bg-black/40" 
            onPress={() => closePaymentModal()} 
          />
          
          <View className="flex-1 justify-end">
            <Animated.View
              style={{ 
                transform: [
                  { translateY: paymentSlideAnim },
                  { translateY: keyboardOffset }
                ] 
              }}
              className="bg-white dark:bg-gray-900 rounded-t-[40px] px-6 pt-6 pb-12 shadow-2xl border-t border-gray-100 dark:border-gray-800"
            >
              <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
              
              <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[4px] font-black mb-2 text-center">Partial Payment</Text>
              <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2 text-center">How much was paid?</Text>
              <Text className="text-xs text-center text-gray-400 dark:text-gray-500 mb-8 font-medium">
                Balance: <Text className="text-sky-500 font-bold">₱{paymentCurrentBalance}</Text>
              </Text>

              <View className="relative mb-8">
                <View className="absolute left-6 top-1/2 -mt-4 z-10">
                  <Text className="text-3xl font-black text-gray-400">₱</Text>
                </View>
                <TextInput
                  ref={paymentInputRef}
                  keyboardType="decimal-pad"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 dark:bg-gray-800/50 p-6 pl-14 rounded-3xl text-3xl font-black text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-800"
                />
              </View>

              <View className="flex-row gap-4">
                <Pressable 
                  onPress={() => closePaymentModal()} 
                  className="flex-1 p-5 rounded-3xl bg-gray-100 dark:bg-gray-800 items-center justify-center active:bg-gray-200 dark:active:bg-gray-700"
                >
                  <Text className="text-lg font-bold text-gray-400 dark:text-gray-500">Cancel</Text>
                </Pressable>
                
                <Pressable 
                  onPress={handleConfirmPayment} 
                  className="flex-[2] p-5 rounded-3xl bg-sky-500 shadow-lg shadow-sky-400/40 items-center justify-center active:scale-95"
                >
                  <Text className="text-lg font-black text-white">Confirm Payment</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
