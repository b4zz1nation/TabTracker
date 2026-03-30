import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
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
import { useCustomers } from "@/hooks/use-customers";
import { Lend, useLends } from "@/hooks/use-lends";
import { calculatePayoff } from "@/services/payoff";
import { getReferenceLabel } from "@/services/reference";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const db = useSQLiteContext();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const {
    lends,
    refresh: refreshLends,
    addPayment,
    getPaymentsByCustomer,
    deleteLend,
  } = useLends();
  const [customerPayments, setCustomerPayments] = useState<
    { id: number; amount: number; created_at: string; lend_id: number }[]
  >([]);

  const [localLends, setLocalLends] = useState<Lend[]>([]);
  useEffect(() => {
    setLocalLends(lends.filter((l) => l.customer_id === customerId));
  }, [lends, customerId]);

  const [hideCompleted] = useState(false);
  const [selectedLend, setSelectedLend] = useState<Lend | null>(null);

  // Sheet Animations
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetBlockingTouches, setSheetBlockingTouches] = useState(false);
  const [isCompletingConfirm, setIsCompletingConfirm] = useState(false);
  const sheetAnim = useRef(new Animated.Value(600)).current;
  const sheetBackdropAnim = useRef(new Animated.Value(0)).current;
  const completeStepAnim = useRef(new Animated.Value(0)).current;
  const sheetTransitionId = useRef(0);

  // Delete Animations
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteModalMounted, setDeleteModalMounted] = useState(false);
  const deleteAnim = useRef(new Animated.Value(600)).current;
  const deleteBackdropAnim = useRef(new Animated.Value(0)).current;

  // Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrentBalance, setPaymentCurrentBalance] = useState("0.00");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentSlideAnim = useRef(new Animated.Value(600)).current;
  const paymentBackdropAnim = useRef(new Animated.Value(0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const paymentInputRef = useRef<TextInput>(null);

  const modalRef = useRef<View>(null);

  useEffect(() => {
    if (!paymentModalVisible) return;

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

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const keyboardHeight = e.endCoordinates.height;

      // Calculate overlap based on known layout height at rest (bottom-aligned)
      // Since it's justify-end, its resting bottom is screenHeight.
      // We only want to shift it up if the keyboard height competes with the modal height
      // or if we want a fixed gap.
      // User requested: "only the exact amount needed... not the full keyboard height"
      const overlap = Math.min(keyboardHeight + 24, keyboardHeight + 40); // Standardizing to just above keyboard

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
  }, [
    keyboardOffset,
    paymentBackdropAnim,
    paymentModalVisible,
    paymentSlideAnim,
  ]);

  useEffect(() => {
    Animated.spring(completeStepAnim, {
      toValue: isCompletingConfirm ? 1 : 0,
      damping: 28,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [completeStepAnim, isCompletingConfirm]);

  const closePaymentModal = (cb?: () => void) => {
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
      cb?.();
    });
  };

  const openSheet = useCallback(
    (lend: Lend) => {
      sheetTransitionId.current += 1;
      setSelectedLend(lend);
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
          useNativeDriver: false,
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
    (cb?: () => void) => {
      const transitionId = ++sheetTransitionId.current;
      setSheetBlockingTouches(false);
      Animated.parallel([
        Animated.spring(sheetAnim, {
          toValue: 600,
          damping: 32,
          stiffness: 350,
          useNativeDriver: false,
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
        cb?.();
      });
    },
    [completeStepAnim, sheetAnim, sheetBackdropAnim],
  );

  const openDeleteModal = useCallback(
    (id: number) => {
      setDeleteId(id);
      setDeleteModalMounted(true);
      deleteAnim.setValue(600);
      deleteBackdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(deleteAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(deleteBackdropAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [deleteAnim, deleteBackdropAnim],
  );

  const closeDeleteModal = (cb?: () => void) => {
    Animated.parallel([
      Animated.spring(deleteAnim, {
        toValue: 600,
        damping: 32,
        stiffness: 350,
        useNativeDriver: true,
      }),
      Animated.timing(deleteBackdropAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDeleteModalMounted(false);
      setDeleteId(null);
      cb?.();
    });
  };

  const refreshAll = useCallback(async () => {
    refreshCustomers();
    refreshLends();
    const payments = await getPaymentsByCustomer(customerId);
    setCustomerPayments(payments);
  }, [refreshCustomers, refreshLends, getPaymentsByCustomer, customerId]);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );

  const customer = customers.find((c) => c.id === customerId);
  const ongoingLends = useMemo(
    () => localLends.filter((l) => l.status === "Ongoing"),
    [localLends],
  );
  const completedLends = useMemo(
    () => localLends.filter((l) => l.status === "Completed"),
    [localLends],
  );
  const totalOutstanding = useMemo(
    () =>
      ongoingLends.reduce(
        (sum, lend) =>
          sum +
          calculatePayoff({
            principal: lend.amount,
            createdAt: lend.created_at,
            dueDate: lend.due_date,
            interestEnabled: lend.interest_enabled === 1,
            interestRate: lend.interest_rate || 0,
            overdueInterestRate: lend.overdue_interest_rate ?? null,
            interestType: lend.interest_type,
            completedAt: null,
          }).payoffTotal,
        0,
      ),
    [ongoingLends],
  );

  const paymentsMap = useMemo(() => {
    const map: Record<number, any[]> = {};
    customerPayments.forEach((p) => {
      if (!map[p.lend_id]) map[p.lend_id] = [];
      map[p.lend_id].push(p);
    });
    return map;
  }, [customerPayments]);

  const displayedLends = useMemo(
    () => (hideCompleted ? ongoingLends : [...ongoingLends, ...completedLends]),
    [hideCompleted, ongoingLends, completedLends],
  );

  const handleEditLend = () => {
    if (!selectedLend) return;
    const l = selectedLend;
    router.push({
      pathname: "/add-customer",
      params: {
        lendId: l.id,
        customerId: l.customer_id,
        readOnly: l.status === "Completed" ? "true" : "false",
      },
    });
    closeSheet();
  };

  const handleAddPayment = () => {
    if (!selectedLend) return;
    const l = selectedLend;
    const payoff = calculatePayoff({
      principal: l.amount,
      createdAt: l.created_at,
      dueDate: l.due_date,
      interestEnabled: l.interest_enabled === 1,
      interestRate: l.interest_rate || 0,
      overdueInterestRate: l.overdue_interest_rate ?? null,
      interestType: l.interest_type,
      completedAt: l.completed_at,
    });
    setPaymentCurrentBalance(payoff.payoffTotal.toFixed(2));
    setPaymentModalVisible(true);
    closeSheet();
  };

  const handleViewLendDetails = () => {
    if (!selectedLend) return;
    setSheetMounted(false);
    router.push(`/lend-details/${selectedLend.id}`);
  };

  const handlePaymentAmountChange = (text: string) => {
    setPaymentAmount(text);
    if (paymentError) setPaymentError(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedLend) return;
    const payAmount = parseFloat(paymentAmount);
    if (isNaN(payAmount) || payAmount <= 0) return;
    const currentBalance = parseFloat(paymentCurrentBalance);
    if (payAmount > currentBalance) {
      setPaymentError(`Amount exceeds balance of ₱${paymentCurrentBalance}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await addPayment(selectedLend.id, payAmount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closePaymentModal(() => refreshAll());
  };

  const handleCompleteLend = async () => {
    if (!selectedLend) return;
    setIsCompletingConfirm(true);
  };

  const handleSheetBackdropPress = useCallback(() => {
    if (isCompletingConfirm) {
      completeStepAnim.stopAnimation();
      completeStepAnim.setValue(0);
      setIsCompletingConfirm(false);
      return;
    }

    closeSheet();
  }, [closeSheet, completeStepAnim, isCompletingConfirm]);

  const handleConfirmCompleteLend = async () => {
    if (!selectedLend) return;
    const payoff = calculatePayoff({
      principal: selectedLend.amount,
      createdAt: selectedLend.created_at,
      dueDate: selectedLend.due_date,
      interestEnabled: selectedLend.interest_enabled === 1,
      interestRate: selectedLend.interest_rate || 0,
      overdueInterestRate: selectedLend.overdue_interest_rate ?? null,
      interestType: selectedLend.interest_type,
      completedAt: selectedLend.completed_at,
    });
    const totalNow = payoff.payoffTotal;
    await addPayment(selectedLend.id, totalNow);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    refreshAll();
    closeSheet();
  };

  const handleDeleteLend = async (id: number) => {
    await deleteLend(id);
    const updated = localLends.filter((l) => l.id !== id);
    setLocalLends(updated);
    const newTotal = updated
      .filter((l) => l.status === "Ongoing")
      .reduce((sum, l) => sum + l.amount, 0);
    await db.runAsync("UPDATE customers SET balance = ? WHERE id = ?", [
      newTotal,
      customerId,
    ]);
    refreshAll();
  };

  const LendCard = React.memo(
    ({ item, payments, onOpenSheet, onDelete }: any) => {
      const done = item.status === "Completed";
      const [isExpanded, setIsExpanded] = useState(false);
      const expandAnim = useRef(new Animated.Value(0)).current;
      const livePayoff = useMemo(
        () =>
          calculatePayoff({
            principal: item.amount,
            createdAt: item.created_at,
            dueDate: item.due_date,
            interestEnabled: item.interest_enabled === 1,
            interestRate: item.interest_rate || 0,
            overdueInterestRate: item.overdue_interest_rate ?? null,
            interestType: item.interest_type,
            completedAt: null,
          }),
        [
          item.amount,
          item.created_at,
          item.due_date,
          item.interest_enabled,
          item.interest_rate,
          item.overdue_interest_rate,
          item.interest_type,
        ],
      );

      const toggle = () => {
        const toValue = isExpanded ? 0 : 1;
        Animated.parallel([
          Animated.spring(expandAnim, {
            toValue,
            damping: 26,
            stiffness: 280,
            useNativeDriver: false,
          }),
        ]).start(({ finished }) => {
          if (finished) setIsExpanded(!isExpanded);
        });
      };

      const originalPrincipal =
        item.amount + payments.reduce((s: number, p: any) => s + p.amount, 0);
      const bodyHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 400],
      });

      return (
        <View
          className={`rounded-[32px] mx-4 mb-3 bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 ${done ? "opacity-70" : ""}`}
        >
          <Pressable
            onPress={() =>
              done
                ? router.push({
                    pathname: "/add-customer",
                    params: {
                      lendId: item.id,
                      customerId: item.customer_id,
                      readOnly: "true",
                    },
                  })
                : onOpenSheet(item)
            }
            onLongPress={() => onDelete(item.id)}
            className="p-6 active:opacity-70"
          >
            <View className="flex-row justify-between mb-2">
              <View>
                <Text
                  className={`${done ? "text-sm line-through text-gray-400" : "text-xl font-black text-gray-900 dark:text-gray-100"}`}
                >
                  ₱{originalPrincipal.toFixed(2)}
                </Text>
                {!done && (
                  <Text className="text-base font-black text-emerald-500">
                    ₱{livePayoff.payoffTotal.toFixed(2)}
                  </Text>
                )}
              </View>
              <View className="items-center justify-center">
                <Text
                  className={`text-[10px] font-black uppercase tracking-wider leading-none ${done ? "text-emerald-500" : "text-sky-500"}`}
                >
                  {item.status}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center mt-4">
              <Text className="text-[10px] text-gray-400 font-bold uppercase">
                Started {new Date(item.created_at).toLocaleDateString()}
              </Text>
              {!done && payments.length > 0 && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
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
                REF: {getReferenceLabel("lend", item.id, item.reference_code)}
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
                {payments.map((p: any) => (
                  <View
                    key={p.id}
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
                        ₱{p.amount.toFixed(2)}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-gray-400">
                      {new Date(p.created_at).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      );
    },
  );
  LendCard.displayName = "LendCard";

  const renderLend = useCallback(
    ({ item }: any) => (
      <LendCard
        item={item}
        payments={paymentsMap[item.id] || []}
        onOpenSheet={openSheet}
        onDelete={openDeleteModal}
      />
    ),
    [LendCard, paymentsMap, openDeleteModal, openSheet],
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top"]}
    >
      <View className="px-5 pt-3 pb-6 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
          className="mb-2"
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={colorScheme === "dark" ? "#fff" : "#1f2937"}
          />
        </Pressable>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-sky-500 items-center justify-center mr-3">
              <Text className="text-white font-bold text-lg">
                {(customer?.name || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-[10px] text-gray-400 uppercase font-black">
                Lending to
              </Text>
              <Text className="text-xl font-black text-gray-900 dark:text-gray-100">
                {customer?.name}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[9px] text-gray-400 uppercase font-black">
              Outstanding
            </Text>
            <Text className="text-xl font-black text-red-500">
              ₱{totalOutstanding.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      <FlatList
        data={displayedLends}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLend}
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
                    onPress={handleEditLend}
                    className="flex-row items-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
                  >
                    <Ionicons name="create-outline" size={20} color="#0ea5e9" />
                    <Text className="ml-4 flex-1 font-semibold text-gray-900 dark:text-gray-100">
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleViewLendDetails}
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
                    onPress={handleCompleteLend}
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
                  Mark lend complete?
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 mb-8">
                  This will close the lend and record the remaining amount as
                  fully paid.
                </Text>
                <Pressable
                  onPress={handleConfirmCompleteLend}
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
      {deleteModalMounted && (
        <View className="absolute inset-0 z-[3000] justify-end">
          <Animated.View
            style={{ opacity: deleteBackdropAnim }}
            className="absolute inset-0 bg-black/50"
          >
            <Pressable className="flex-1" onPress={() => closeDeleteModal()} />
          </Animated.View>
          <Animated.View
            style={{
              transform: [{ translateY: deleteAnim }],
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            }}
            className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6"
          >
            <Text className="text-2xl font-bold mb-2">Delete Entry?</Text>
            <Text className="text-gray-500 mb-8">
              This action cannot be undone.
            </Text>
            <Pressable
              onPress={() =>
                closeDeleteModal(() => {
                  if (deleteId) handleDeleteLend(deleteId);
                })
              }
              className="w-full bg-rose-500 p-5 rounded-2xl items-center mb-3"
            >
              <Text className="text-white font-bold">Delete</Text>
            </Pressable>
            <Pressable
              onPress={() => closeDeleteModal()}
              className="w-full p-4 items-center"
            >
              <Text className="text-gray-400">Cancel</Text>
            </Pressable>
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
            ref={modalRef}
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
                ₱{paymentCurrentBalance}
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
              <View className="absolute left-6 top-1/2 -mt-4 z-10">
                <Text className="text-3xl font-black text-gray-400">₱</Text>
              </View>
              <TextInput
                ref={paymentInputRef}
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={handlePaymentAmountChange}
                className={`bg-gray-50 dark:bg-gray-800/50 p-6 pl-14 rounded-3xl text-3xl font-black text-gray-900 dark:text-gray-100 border ${paymentError ? "border-rose-500" : "border-gray-100 dark:border-gray-800"}`}
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
