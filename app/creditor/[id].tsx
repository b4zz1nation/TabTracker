import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Creditor, useCreditors } from "@/hooks/use-creditors";
import {
  groupCreditors,
  normalizeCreditorName,
} from "@/services/creditor-groups";
import { calculatePayoff } from "@/services/payoff";
import { getReferenceLabel } from "@/services/reference";

type CreditorPayment = {
  id: number;
  amount: number;
  created_at: string;
  creditor_id: number;
};

function EntryCard({
  entry,
  payments,
  onOpenSheet,
  onOpenReadOnly,
}: {
  entry: Creditor;
  payments: CreditorPayment[];
  onOpenSheet: (entry: Creditor) => void;
  onOpenReadOnly: (entry: Creditor) => void;
}) {
  const done = (entry.balance || 0) <= 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const livePayoff = useMemo(
    () =>
      calculatePayoff({
        principal: entry.balance || 0,
        createdAt: entry.created_at,
        dueDate: entry.due_date,
        interestEnabled: entry.interest_enabled === 1,
        interestRate: entry.interest_rate || 0,
        overdueInterestRate: entry.overdue_interest_rate ?? null,
        interestType: entry.interest_type,
        completedAt: null,
      }),
    [
      entry.balance,
      entry.created_at,
      entry.due_date,
      entry.interest_enabled,
      entry.interest_rate,
      entry.overdue_interest_rate,
      entry.interest_type,
    ],
  );
  const originalPrincipal =
    (entry.balance || 0) +
    payments.reduce((sum, payment) => sum + payment.amount, 0);
  const bodyHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400],
  });

  const toggle = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(expandAnim, {
      toValue,
      damping: 26,
      stiffness: 280,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setIsExpanded(!isExpanded);
    });
  };

  return (
    <View
      className={`rounded-[32px] mx-4 mb-3 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 ${done ? "opacity-70" : ""}`}
    >
      <Pressable
        onPress={() => (done ? onOpenReadOnly(entry) : onOpenSheet(entry))}
        className="p-6 active:opacity-70"
      >
        <View className="flex-row justify-between mb-2">
          <View>
            <Text
              className={`${done ? "text-sm line-through text-gray-400" : "text-xl font-black text-gray-900 dark:text-gray-100"}`}
            >
              PHP {originalPrincipal.toFixed(2)}
            </Text>
            {!done && (
              <Text className="text-base font-black text-orange-500">
                PHP {livePayoff.payoffTotal.toFixed(2)}
              </Text>
            )}
          </View>
          <View className="items-center justify-center">
            <Text
              className={`text-[10px] font-black uppercase tracking-wider leading-none ${done ? "text-emerald-500" : "text-orange-500"}`}
            >
              {done ? "Completed" : "Ongoing"}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between items-center mt-4">
          <Text className="text-[10px] text-gray-400 font-bold uppercase">
            Started {new Date(entry.created_at).toLocaleDateString()}
          </Text>
          {!done && payments.length > 0 && (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                toggle();
              }}
              className="p-2"
            >
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#9ca3af"
              />
            </Pressable>
          )}
          <Text className="text-[10px] text-gray-400 font-mono opacity-60">
            REF: {getReferenceLabel("tab", entry.id, entry.reference_code)}
          </Text>
        </View>
      </Pressable>
      {!done && (
        <Animated.View
          style={{
            maxHeight: bodyHeight,
            opacity: expandAnim,
            overflow: "hidden",
          }}
        >
          <View className="px-5 pb-5 border-t border-gray-50 dark:border-gray-800 pt-4 gap-2">
            {payments.map((payment) => (
              <View
                key={payment.id}
                className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-800"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color="#059669"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-bold text-gray-900 dark:text-gray-100">
                    PHP {payment.amount.toFixed(2)}
                  </Text>
                </View>
                <Text className="text-[10px] text-gray-400">
                  {new Date(payment.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export default function CreditorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const creditorId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const {
    creditors,
    refresh: refreshCreditors,
    getPayments,
    addPayment,
  } = useCreditors();
  const [paymentsByCreditor, setPaymentsByCreditor] = useState<
    Record<number, CreditorPayment[]>
  >({});
  const [selectedCreditor, setSelectedCreditor] = useState<Creditor | null>(
    null,
  );

  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetBlockingTouches, setSheetBlockingTouches] = useState(false);
  const [isCompletingConfirm, setIsCompletingConfirm] = useState(false);
  const sheetAnim = useRef(new Animated.Value(600)).current;
  const sheetBackdropAnim = useRef(new Animated.Value(0)).current;
  const completeStepAnim = useRef(new Animated.Value(0)).current;
  const sheetTransitionId = useRef(0);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrentBalance, setPaymentCurrentBalance] = useState("0.00");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentSlideAnim = useRef(new Animated.Value(600)).current;
  const paymentBackdropAnim = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  const creditor = useMemo(
    () =>
      creditors.find((creditorItem) => creditorItem.id === creditorId) ?? null,
    [creditorId, creditors],
  );
  const creditorNameKey = useMemo(
    () => (creditor ? normalizeCreditorName(creditor.name) : null),
    [creditor],
  );
  const creditorGroup = useMemo(() => {
    if (!creditorNameKey) return null;
    return (
      groupCreditors(creditors).find(
        (group) => normalizeCreditorName(group.name) === creditorNameKey,
      ) ?? null
    );
  }, [creditorNameKey, creditors]);
  const groupedEntries = creditorGroup?.entries ?? [];
  const displayEntries = groupedEntries;
  const totalOutstanding = useMemo(
    () =>
      displayEntries.reduce(
        (sum, entry) =>
          sum +
          calculatePayoff({
            principal: entry.balance || 0,
            createdAt: entry.created_at,
            dueDate: entry.due_date,
            interestEnabled: entry.interest_enabled === 1,
            interestRate: entry.interest_rate || 0,
            overdueInterestRate: entry.overdue_interest_rate ?? null,
            interestType: entry.interest_type,
            completedAt: null,
          }).payoffTotal,
        0,
      ),
    [displayEntries],
  );

  const loadPayments = useCallback(async () => {
    if (displayEntries.length === 0) {
      setPaymentsByCreditor({});
      return;
    }

    const paymentResults = await Promise.all(
      displayEntries.map(async (entry) => ({
        creditorId: entry.id,
        payments: await getPayments(entry.id),
      })),
    );

    setPaymentsByCreditor(
      paymentResults.reduce<Record<number, CreditorPayment[]>>(
        (acc, result) => {
          acc[result.creditorId] = result.payments;
          return acc;
        },
        {},
      ),
    );
  }, [displayEntries, getPayments]);

  useFocusEffect(
    useCallback(() => {
      refreshCreditors();
    }, [refreshCreditors]),
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    Animated.spring(completeStepAnim, {
      toValue: isCompletingConfirm ? 1 : 0,
      damping: 28,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [completeStepAnim, isCompletingConfirm]);

  const openSheet = useCallback(
    (entry: Creditor) => {
      sheetTransitionId.current += 1;
      setSelectedCreditor(entry);
      setSheetBlockingTouches(true);
      setIsCompletingConfirm(false);
      setSheetMounted(true);
      sheetAnim.setValue(600);
      sheetBackdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(sheetAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sheetBackdropAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [sheetAnim, sheetBackdropAnim],
  );

  const closeSheet = useCallback(
    (cb?: () => void, clearSelection: boolean = true) => {
      const transitionId = ++sheetTransitionId.current;
      setSheetBlockingTouches(false);
      Animated.parallel([
        Animated.spring(sheetAnim, {
          toValue: 600,
          damping: 32,
          stiffness: 350,
          useNativeDriver: true,
        }),
        Animated.timing(sheetBackdropAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (sheetTransitionId.current !== transitionId) {
          return;
        }
        setSheetMounted(false);
        setIsCompletingConfirm(false);
        completeStepAnim.setValue(0);
        if (clearSelection) {
          setSelectedCreditor(null);
        }
        cb?.();
      });
    },
    [completeStepAnim, sheetAnim, sheetBackdropAnim],
  );

  const closePaymentModal = useCallback(
    (cb?: () => void) => {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.spring(paymentSlideAnim, {
          toValue: 600,
          damping: 32,
          stiffness: 350,
          useNativeDriver: true,
        }),
        Animated.timing(paymentBackdropAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPaymentModalVisible(false);
        setPaymentAmount("");
        setPaymentError(null);
        setSelectedCreditor(null);
        cb?.();
      });
    },
    [paymentBackdropAnim, paymentSlideAnim],
  );

  const openPaymentModal = useCallback(() => {
    setPaymentError(null);
    setPaymentAmount("");
    setPaymentModalVisible(true);
    paymentSlideAnim.setValue(600);
    paymentBackdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(paymentSlideAnim, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(paymentBackdropAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [paymentBackdropAnim, paymentSlideAnim]);

  React.useEffect(() => {
    if (!paymentModalVisible) return;

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const keyboardHeight = event.endCoordinates.height;
      const overlap = Math.min(keyboardHeight + 24, keyboardHeight + 40);
      Animated.timing(keyboardOffset, {
        toValue: -overlap,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset, paymentModalVisible]);

  const handleEdit = useCallback(() => {
    if (!selectedCreditor) return;
    closeSheet(() => {
      router.push({
        pathname: "/my-tab-modal",
        params: { id: selectedCreditor.id.toString() },
      });
    });
  }, [closeSheet, router, selectedCreditor]);

  const handleAddPayment = useCallback(() => {
    if (!selectedCreditor) return;
    const payoff = calculatePayoff({
      principal: selectedCreditor.balance || 0,
      createdAt: selectedCreditor.created_at,
      dueDate: selectedCreditor.due_date,
      interestEnabled: selectedCreditor.interest_enabled === 1,
      interestRate: selectedCreditor.interest_rate || 0,
      overdueInterestRate: selectedCreditor.overdue_interest_rate ?? null,
      interestType: selectedCreditor.interest_type,
      completedAt: selectedCreditor.completed_at,
    });

    setPaymentCurrentBalance(payoff.payoffTotal.toFixed(2));
    setSheetMounted(false);
    sheetAnim.setValue(600);
    sheetBackdropAnim.setValue(0);
    openPaymentModal();
  }, [openPaymentModal, selectedCreditor, sheetAnim, sheetBackdropAnim]);

  const handleViewDetails = useCallback(() => {
    if (!selectedCreditor) return;
    setSheetMounted(false);
    router.push(`/my-tab-details/${selectedCreditor.id}`);
  }, [router, selectedCreditor]);

  const handleComplete = useCallback(async () => {
    if (!selectedCreditor) return;
    setIsCompletingConfirm(true);
  }, [selectedCreditor]);

  const handleSheetBackdropPress = useCallback(() => {
    if (isCompletingConfirm) {
      completeStepAnim.stopAnimation();
      completeStepAnim.setValue(0);
      setIsCompletingConfirm(false);
      return;
    }

    closeSheet();
  }, [closeSheet, completeStepAnim, isCompletingConfirm]);

  const handleConfirmComplete = useCallback(async () => {
    if (!selectedCreditor) return;
    const payoff = calculatePayoff({
      principal: selectedCreditor.balance || 0,
      createdAt: selectedCreditor.created_at,
      dueDate: selectedCreditor.due_date,
      interestEnabled: selectedCreditor.interest_enabled === 1,
      interestRate: selectedCreditor.interest_rate || 0,
      overdueInterestRate: selectedCreditor.overdue_interest_rate ?? null,
      interestType: selectedCreditor.interest_type,
      completedAt: selectedCreditor.completed_at,
    });
    await addPayment(selectedCreditor.id, payoff.payoffTotal);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeSheet(() => refreshCreditors());
  }, [addPayment, closeSheet, refreshCreditors, selectedCreditor]);

  const handleConfirmPayment = useCallback(async () => {
    if (!selectedCreditor) return;
    const payAmount = parseFloat(paymentAmount);
    const selectedBalance = parseFloat(paymentCurrentBalance);
    if (Number.isNaN(payAmount) || payAmount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (payAmount > selectedBalance) {
      setPaymentError(
        `Amount exceeds balance of PHP ${selectedBalance.toFixed(2)}`,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await addPayment(selectedCreditor.id, payAmount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closePaymentModal(() => refreshCreditors());
  }, [
    addPayment,
    closePaymentModal,
    paymentAmount,
    paymentCurrentBalance,
    refreshCreditors,
    selectedCreditor,
  ]);

  const openReadOnlyEntry = useCallback(
    (entry: Creditor) => {
      router.push({
        pathname: "/my-tab-modal",
        params: { id: entry.id.toString(), readOnly: "true" },
      });
    },
    [router],
  );

  if (!creditor || !creditorGroup) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Tab entry not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top"]}
    >
      <View className="px-5 pt-3 pb-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
        <Pressable onPress={() => router.back()} className="mb-2">
          <Ionicons
            name="chevron-back"
            size={28}
            color={colorScheme === "dark" ? "#fff" : "#1f2937"}
          />
        </Pressable>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-orange-500 items-center justify-center mr-3">
              <Text className="text-white font-bold text-lg">
                {(creditorGroup.name || "T").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] text-gray-400 uppercase font-black">
                My Tab
              </Text>
              <Text className="text-xl font-black text-gray-900 dark:text-gray-100">
                {creditorGroup.name}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[9px] text-gray-400 uppercase font-black">
              Outstanding
            </Text>
            <Text className="text-xl font-black text-orange-500">
              PHP {totalOutstanding.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={displayEntries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            payments={paymentsByCreditor[item.id] ?? []}
            onOpenSheet={openSheet}
            onOpenReadOnly={openReadOnlyEntry}
          />
        )}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 120 }}
      />

      {sheetMounted && (
        <View
          pointerEvents={sheetBlockingTouches ? "auto" : "none"}
          className="absolute inset-0 z-[2000] justify-end"
        >
          <Animated.View
            style={{ opacity: sheetBackdropAnim }}
            className="absolute inset-0 bg-black/50"
          >
            <Pressable className="flex-1" onPress={handleSheetBackdropPress} />
          </Animated.View>
          <Animated.View
            style={{
              transform: [{ translateY: sheetAnim }],
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }}
            className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6"
          >
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />
            <View className="relative min-h-[280px] overflow-hidden">
              <Animated.View
                pointerEvents={isCompletingConfirm ? "none" : "auto"}
                style={{
                  opacity: completeStepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [
                    {
                      translateX: completeStepAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -24],
                      }),
                    },
                  ],
                }}
                className="absolute inset-0"
              >
                <View className="gap-3">
                  <Pressable
                    onPress={handleEdit}
                    className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
                  >
                    <Ionicons name="create-outline" size={20} color="#0ea5e9" />
                    <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleViewDetails}
                    className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#0ea5e9"
                    />
                    <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                      View Details
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddPayment}
                    className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
                  >
                    <Ionicons name="cash-outline" size={20} color="#0ea5e9" />
                    <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                      Add Payment
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleComplete}
                    className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#10b981"
                    />
                    <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                      Mark Complete
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
              <Animated.View
                pointerEvents={isCompletingConfirm ? "auto" : "none"}
                style={{
                  opacity: completeStepAnim,
                  transform: [
                    {
                      translateX: completeStepAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                  ],
                }}
                className="absolute inset-0"
              >
                <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">
                  Mark tab complete?
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 mb-8">
                  This will close the tab and record the remaining amount as
                  fully paid.
                </Text>
                <Pressable
                  onPress={handleConfirmComplete}
                  className="w-full bg-emerald-500 p-5 rounded-2xl items-center mb-3"
                >
                  <Text className="text-white font-bold">Confirm</Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsCompletingConfirm(false)}
                  className="w-full p-4 items-center"
                >
                  <Text className="text-gray-400">Back</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      )}

      {paymentModalVisible && (
        <View className="absolute inset-0 z-[4000] justify-end">
          <Animated.View
            style={{ opacity: paymentBackdropAnim }}
            className="absolute inset-0 bg-black/40"
          >
            <Pressable className="flex-1" onPress={() => closePaymentModal()} />
          </Animated.View>
          <Animated.View
            style={{
              transform: [
                { translateY: paymentSlideAnim },
                { translateY: keyboardOffset },
              ],
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }}
            className="bg-white dark:bg-gray-900 rounded-t-[40px] px-6 pt-6 shadow-2xl border-t border-gray-100 dark:border-gray-800"
          >
            <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
            <Text className="text-2xl font-black text-center mb-2 text-gray-900 dark:text-gray-100">
              How much was paid?
            </Text>
            <Text className="text-center mb-6 text-gray-500">
              Balance:{" "}
              <Text className="text-sky-500 font-bold">
                {paymentCurrentBalance}
              </Text>
            </Text>

            {paymentError && (
              <View className="mb-3 rounded-2xl bg-rose-500/10 border border-rose-200 dark:border-rose-800 px-4 py-3">
                <Text className="text-rose-500 font-semibold text-sm text-center">
                  {paymentError}
                </Text>
              </View>
            )}

            <View className="relative">
              <TextInput
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={(text) => {
                  setPaymentAmount(
                    text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
                  );
                  if (paymentError) setPaymentError(null);
                }}
                className={`bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl text-3xl font-black text-gray-900 dark:text-gray-100 border ${paymentError ? "border-rose-500" : "border-gray-100 dark:border-gray-800"}`}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="flex-row gap-4 mt-8">
              <Pressable
                onPress={() => closePaymentModal()}
                className="flex-1 p-5 rounded-3xl bg-gray-100 dark:bg-gray-800 items-center justify-center active:bg-gray-200"
              >
                <Text className="font-bold text-gray-400">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmPayment}
                className="flex-[1.5] p-5 rounded-3xl bg-sky-500 items-center justify-center shadow-lg active:opacity-90"
              >
                <Text className="font-bold text-white">Confirm</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
