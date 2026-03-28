import { Ionicons } from "@expo/vector-icons";
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
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  findNodeHandle,
} from "react-native";
import ScreenContainer from "@/components/screen-container";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCreditors } from "@/hooks/use-creditors";
import { getReferenceLabel } from "@/services/reference";

const SPRING_CONFIG = {
  damping: 28,
  stiffness: 300,
  useNativeDriver: true as const,
};

const TAB_AVATAR_COLORS = [
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-rose-400",
  "bg-red-400",
  "bg-orange-500",
];

export default function MyTabModalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{
    id?: string;
    readOnly?: string;
    mode?: string;
  }>();
  const {
    creditors,
    addCreditor,
    updateCreditor,
    deleteCreditor,
    getPayments,
  } = useCreditors();
  const isReadOnly = params.readOnly === "true";
  const isAddingToExisting = params.mode === "add_existing" && !!params.id;
  const hasExistingCreditorId = !!params.id;

  const keyboardOffset = Platform.OS === "ios" ? 40 : 20;
  const keyboardFooterGap = 18;
  const interestFocusOffset = Platform.OS === "ios" ? 420 : 380;
  const descriptionFocusOffset = Platform.OS === "ios" ? 320 : 280;
  const isEditing = useMemo(
    () => hasExistingCreditorId && !isAddingToExisting,
    [hasExistingCreditorId, isAddingToExisting],
  );
  const existingCreditor = useMemo(
    () =>
      hasExistingCreditorId
        ? (creditors.find((creditor) => creditor.id === Number(params.id)) ??
          null)
        : null,
    [creditors, hasExistingCreditorId, params.id],
  );

  const [name, setName] = useState(existingCreditor?.name ?? "");
  const [balance, setBalance] = useState(
    existingCreditor ? existingCreditor.balance.toString() : "",
  );
  const [description, setDescription] = useState(
    existingCreditor?.description ?? "",
  );
  const [interestEnabled, setInterestEnabled] = useState(
    existingCreditor?.interest_enabled === 1,
  );
  const [interestRate, setInterestRate] = useState(
    existingCreditor && existingCreditor.interest_rate > 0
      ? existingCreditor.interest_rate.toString()
      : "",
  );
  const [interestType, setInterestType] = useState<
    "Daily" | "Monthly" | "Yearly" | null
  >(existingCreditor?.interest_type ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [interestRateError, setInterestRateError] = useState(false);
  const [interestFrequencyError, setInterestFrequencyError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [payments, setPayments] = useState<
    { id: number; amount: number; created_at: string; creditor_id: number }[]
  >([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const historyExpandAnim = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef<any>(null);
  const interestInputRef = useRef<TextInput>(null);
  const interestSectionY = useRef(0);
  const footerTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!existingCreditor) {
      if (!hasExistingCreditorId) {
        setName("");
        setBalance("");
        setDescription("");
        setInterestEnabled(false);
        setInterestRate("");
        setInterestType(null);
      }
      return;
    }

    setName(existingCreditor.name);
    setBalance(isAddingToExisting ? "" : existingCreditor.balance.toString());
    setDescription(
      isAddingToExisting ? "" : (existingCreditor.description ?? ""),
    );
    setInterestEnabled(
      isAddingToExisting ? false : existingCreditor.interest_enabled === 1,
    );
    setInterestRate(
      isAddingToExisting
        ? ""
        : existingCreditor.interest_rate > 0
          ? existingCreditor.interest_rate.toString()
          : "",
    );
    setInterestType(
      isAddingToExisting ? null : (existingCreditor.interest_type ?? null),
    );
  }, [existingCreditor, isAddingToExisting, isEditing]);

  useEffect(() => {
    if (!isReadOnly || !params.id) return;
    getPayments(Number(params.id)).then(setPayments);
  }, [getPayments, isReadOnly, params.id]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextValue = -Math.max(
        0,
        event.endCoordinates.height - keyboardOffset + keyboardFooterGap,
      );
      Animated.spring(footerTranslateY, {
        ...SPRING_CONFIG,
        toValue: nextValue,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.spring(footerTranslateY, {
        ...SPRING_CONFIG,
        toValue: 0,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [footerTranslateY, keyboardOffset, keyboardFooterGap]);

  const sanitizeBalance = useCallback((text: string) => {
    setBalance(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
  }, []);

  const sanitizeRate = useCallback(
    (text: string) => {
      setInterestRate(text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
      if (interestRateError) setInterestRateError(false);
    },
    [interestRateError],
  );

  const handleFocus = useCallback((reactNode: any, extraHeight?: number) => {
    const resolvedNode =
      typeof reactNode === "number" ? reactNode : findNodeHandle(reactNode);
    if (!resolvedNode) return;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToFocusedInput(resolvedNode, extraHeight);
    });
  }, []);

  const scrollInterestSectionToTop = useCallback(() => {
    const targetY = Math.max(0, interestSectionY.current - 48);
    scrollViewRef.current?.scrollToPosition?.(0, targetY, true);
  }, []);

  const handleToggleInterest = useCallback(
    (val: boolean) => {
      setInterestEnabled(val);
      if (val) {
        setTimeout(() => {
          scrollInterestSectionToTop();
          interestInputRef.current?.focus();
        }, 100);
      } else {
        setInterestType(null);
      }
    },
    [scrollInterestSectionToTop],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    if (isReadOnly) return;
    const trimmedName = name.trim();
    const normalizedBalance = balance.trim();
    const parsedBalance =
      normalizedBalance === "" ? 0 : parseFloat(normalizedBalance);
    const nextBalance = Number.isFinite(parsedBalance) ? parsedBalance : 0;
    const trimmedDescription = description.trim();

    if (
      !trimmedName ||
      normalizedBalance === "" ||
      !Number.isFinite(parsedBalance)
    ) {
      return;
    }

    if (interestEnabled) {
      const parsedRate = parseFloat(interestRate);
      if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
        setInterestRateError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (!interestType) {
        setInterestFrequencyError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const nextRate = interestEnabled ? parseFloat(interestRate) : 0;
      const nextType = interestEnabled ? interestType : null;
      const nextDescription = trimmedDescription ? trimmedDescription : null;

      if (isAddingToExisting && existingCreditor) {
        await addCreditor(
          existingCreditor.name,
          nextBalance,
          nextDescription ?? existingCreditor.description ?? null,
          interestEnabled,
          nextRate,
          nextType,
          { allowDuplicateName: true },
        );
      } else if (isEditing) {
        await updateCreditor(
          Number(params.id),
          trimmedName,
          nextBalance,
          nextDescription,
          interestEnabled,
          nextRate,
          nextType,
        );
      } else {
        await addCreditor(
          trimmedName,
          nextBalance,
          nextDescription,
          interestEnabled,
          nextRate,
          nextType,
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      if (error.message === "DUPLICATE_NAME") {
        setFormError("A tab with this name already exists.");
      } else {
        Alert.alert("Error", "Failed to save tab");
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    addCreditor,
    balance,
    description,
    hasExistingCreditorId,
    interestEnabled,
    interestRate,
    interestType,
    isAddingToExisting,
    isEditing,
    isReadOnly,
    name,
    existingCreditor,
    params.id,
    router,
    updateCreditor,
  ]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Tab",
      `Are you sure you want to delete ${name.trim() || "this tab"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCreditor(Number(params.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ],
    );
  }, [deleteCreditor, name, params.id, router]);

  const isFormValid =
    name.trim() !== "" &&
    balance.trim() !== "" &&
    !Number.isNaN(parseFloat(balance));
  const saveDisabled = useMemo(
    () => !isFormValid || isSaving,
    [isFormValid, isSaving],
  );
  const headerTitle = useMemo(
    () =>
      isAddingToExisting
        ? "Add Existing Tab"
        : isEditing
          ? "Edit Tab"
          : "New Tab",
    [isAddingToExisting, isEditing],
  );
  const buttonTitle = useMemo(() => {
    if (isSaving) return "Saving...";
    if (isAddingToExisting) return "Add to Tab";
    return isEditing ? "Update Tab" : "Add Tab";
  }, [isAddingToExisting, isEditing, isSaving]);
  const isNewTab = useMemo(
    () => !isEditing && !isAddingToExisting,
    [isAddingToExisting, isEditing],
  );

  const avatarColor = useMemo(() => {
    const sourceName = name.trim() || existingCreditor?.name || "T";
    const index = sourceName.charCodeAt(0) % TAB_AVATAR_COLORS.length;
    return TAB_AVATAR_COLORS[index];
  }, [existingCreditor?.name, name]);

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
      <TouchableOpacity
        onPress={handleBack}
        activeOpacity={0.6}
        className="w-12 h-12 items-center justify-center"
      >
        <Ionicons
          name="chevron-back"
          size={28}
          color={colorScheme === "dark" ? "#ffffff" : "#1f2937"}
        />
      </TouchableOpacity>
      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {headerTitle}
      </Text>
      <View className="w-12" />
    </View>
  );

  const footer = (
    <View className="px-6 py-4">
      <Pressable
        className={`h-16 rounded-2xl items-center justify-center shadow-lg shadow-orange-500/30 ${
          saveDisabled
            ? "bg-orange-500/40"
            : "bg-orange-500 active:opacity-90 active:scale-[0.98]"
        }`}
        onPress={handleSave}
        disabled={saveDisabled}
      >
        <Text className="text-white text-lg font-bold">{buttonTitle}</Text>
      </Pressable>
    </View>
  );

  const toggleHistory = useCallback(() => {
    const toValue = isHistoryExpanded ? 0 : 1;
    Animated.spring(historyExpandAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
    setIsHistoryExpanded(!isHistoryExpanded);
  }, [historyExpandAnim, isHistoryExpanded]);

  if (isReadOnly && existingCreditor) {
    const historyTotal = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const displayAmount =
      historyTotal > 0 ? historyTotal : existingCreditor.balance;
    const historyRotation = historyExpandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "180deg"],
    });
    const historyHeight = historyExpandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 300],
    });
    const settledDate =
      existingCreditor.completed_at ?? payments[0]?.created_at ?? null;

    return (
      <View className="flex-1">
        <ScreenContainer
          header={header}
          edges={["top", "bottom"]}
          scrollable={true}
          centerContent={true}
        >
          <View className="bg-white dark:bg-gray-900 rounded-[32px] p-6 mx-6 shadow-2xl border border-gray-100 dark:border-gray-800 mb-20 mt-4">
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              </View>
              <Text className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                Payment Settled
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-mono mt-1 opacity-60">
                REF:{" "}
                {getReferenceLabel(
                  "tab",
                  existingCreditor.id,
                  existingCreditor.reference_code,
                )}
              </Text>
            </View>

            <View className="border-t border-b border-dashed border-gray-200 dark:border-zinc-800 py-6 my-1 gap-4">
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Tab Name
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">
                  {existingCreditor.name}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Principal Paid
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-base">
                  PHP {displayAmount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                  Interest Rate
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">
                  {existingCreditor.interest_enabled
                    ? `${existingCreditor.interest_rate}% / ${existingCreditor.interest_type ?? "Monthly"}`
                    : "0%"}
                </Text>
              </View>
            </View>

            {!!existingCreditor.description && (
              <View className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1.5 ml-1">
                  Description
                </Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                  {`"${existingCreditor.description}"`}
                </Text>
              </View>
            )}

            {payments.length > 0 && (
              <View className="mt-4">
                <Pressable
                  onPress={toggleHistory}
                  className="flex-row items-center justify-between py-3 px-1 active:opacity-60"
                >
                  <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-[2px]">
                    Payment History
                  </Text>
                  <Animated.View
                    style={{ transform: [{ rotate: historyRotation }] }}
                  >
                    <Ionicons name="chevron-down" size={14} color="#9ca3af" />
                  </Animated.View>
                </Pressable>
                <Animated.View
                  style={{
                    maxHeight: historyHeight,
                    opacity: historyExpandAnim,
                    overflow: "hidden",
                  }}
                >
                  <View className="gap-2 pt-1 pb-2">
                    {payments.map((payment) => (
                      <View
                        key={payment.id}
                        className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl"
                      >
                        <View className="flex-row items-center">
                          <View className="w-7 h-7 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 items-center justify-center mr-3">
                            <Ionicons
                              name="cash-outline"
                              size={12}
                              color="#10b981"
                            />
                          </View>
                          <View>
                            <Text className="text-gray-900 dark:text-gray-100 font-bold text-xs">
                              PHP {payment.amount.toFixed(2)}
                            </Text>
                            <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-tighter">
                              {new Date(payment.created_at).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[8px] text-sky-500 font-black uppercase tracking-widest">
                          Paid
                        </Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              </View>
            )}

            <View className="py-4 mt-2 gap-3">
              <View className="flex-row justify-between items-center px-1">
                <View>
                  <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">
                    Issue Date
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-[10px]">
                    {new Date(existingCreditor.created_at).toLocaleString()}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={12} color="#d1d5db" />
                <View className="items-end">
                  <Text className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">
                    Settled Date
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-[10px]">
                    {settledDate
                      ? new Date(settledDate).toLocaleString()
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="border-t-2 border-gray-100 dark:border-zinc-800 pt-6 mt-1 items-center">
              <Text className="text-gray-400 dark:text-gray-500 uppercase text-[10px] font-black tracking-[3px] mb-1">
                Total Settled
              </Text>
              <Text className="text-4xl font-black text-gray-900 dark:text-gray-100">
                PHP {historyTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScreenContainer
        scrollViewRef={scrollViewRef}
        header={header}
        footer={footer}
        footerContainerStyle={{ transform: [{ translateY: footerTranslateY }] }}
        edges={["top", "bottom"]}
        extraHeight={260}
        contentContainerStyle={{ padding: 24 }}
      >
        {formError && (
          <View className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-200 p-4">
            <Text className="text-rose-600 font-semibold">{formError}</Text>
          </View>
        )}

        {!isNewTab && (
          <View className="flex-row items-center mb-10 px-1">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${avatarColor}`}
            >
              <Text className="text-white font-bold text-base">
                {(name.trim() || existingCreditor?.name || "T")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {name.trim() || existingCreditor?.name || "New Tab"}
              </Text>
            </View>
          </View>
        )}

        {isNewTab ? (
          <View className="mb-8 flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Tab Name
              </Text>
              <View
                className={`bg-white dark:bg-gray-900 rounded-2xl border ${
                  nameFocused
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-gray-200 dark:border-gray-800"
                } px-4 shadow-sm`}
              >
                <TextInput
                  className="h-16 text-lg font-bold text-gray-900 dark:text-gray-100"
                  placeholder="Tab name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (formError) setFormError(null);
                  }}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  autoFocus={true}
                  editable={true}
                />
              </View>
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Amount Owed
              </Text>
              <View
                className={`bg-white dark:bg-gray-900 rounded-2xl border ${
                  amountFocused
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-gray-200 dark:border-gray-800"
                } px-4 shadow-sm`}
              >
                <TextInput
                  className="h-16 text-lg font-bold text-gray-900 dark:text-gray-100"
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  value={balance}
                  onChangeText={sanitizeBalance}
                  onFocus={(event) => {
                    setAmountFocused(true);
                    handleFocus(event.target);
                  }}
                  onBlur={() => setAmountFocused(false)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ) : (
          <>
            {!isAddingToExisting && (
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                  Tab Name
                </Text>
                <View
                  className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${
                    nameFocused
                      ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                      : "border-gray-200 dark:border-gray-800"
                  } px-4 shadow-sm`}
                >
                  <TextInput
                    className="flex-1 h-16 text-xl font-bold text-gray-900 dark:text-gray-100"
                    placeholder="Tab name"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (formError) setFormError(null);
                    }}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    autoFocus={!isEditing}
                    editable={true}
                  />
                </View>
              </View>
            )}

            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Amount Owed
              </Text>
              <View
                className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${
                  amountFocused
                    ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    : "border-gray-200 dark:border-gray-800"
                } px-4 shadow-sm`}
              >
                <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">
                  PHP
                </Text>
                <TextInput
                  className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  value={balance}
                  onChangeText={sanitizeBalance}
                  onFocus={(event) => {
                    setAmountFocused(true);
                    handleFocus(event.target);
                  }}
                  onBlur={() => setAmountFocused(false)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
            Description (Optional)
          </Text>
          <View className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm min-h-[100px]">
            <TextInput
              className="text-lg text-gray-900 dark:text-gray-100 min-h-[80px]"
              placeholder="What's this for?"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              onFocus={(event) =>
                handleFocus(event.target, descriptionFocusOffset)
              }
              multiline={true}
              textAlignVertical="top"
              maxLength={100}
            />
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-1">
              {description.length}/100
            </Text>
          </View>
        </View>

        <View className="mb-0 p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View
                className={`w-10 h-10 rounded-full ${
                  !balance.trim()
                    ? "bg-gray-100 dark:bg-zinc-800"
                    : "bg-orange-100 dark:bg-orange-900/40"
                } items-center justify-center mr-3`}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={!balance.trim() ? "#9ca3af" : "#f97316"}
                />
              </View>
              <Text
                className={`text-base font-bold ${
                  !balance.trim()
                    ? "text-gray-300 dark:text-gray-600"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                Interest Rate
              </Text>
            </View>
            <Switch
              value={interestEnabled}
              onValueChange={handleToggleInterest}
              trackColor={{ false: "#e5e7eb", true: "#fed7aa" }}
              thumbColor={interestEnabled ? "#f97316" : "#f3f4f6"}
              disabled={!balance.trim()}
            />
          </View>

          {interestEnabled && (
            <View className="gap-6">
              <View>
                <View className="flex-row items-center justify-between mb-2 ml-1">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Interest Rate
                  </Text>
                  {interestRateError && (
                    <Text className="text-[10px] text-red-500 font-semibold mr-1">
                      Invalid interest rate
                    </Text>
                  )}
                </View>
                <View
                  className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${
                    interestRateError
                      ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-gray-800"
                  } px-4 shadow-sm`}
                >
                  <TextInput
                    ref={interestInputRef}
                    className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={interestRate}
                    onChangeText={sanitizeRate}
                    onFocus={(event) =>
                      handleFocus(event.target, interestFocusOffset)
                    }
                    keyboardType="numeric"
                  />
                  <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">
                    %
                  </Text>
                </View>
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-2 ml-1">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Frequency
                  </Text>
                  {interestFrequencyError && (
                    <Text className="text-[10px] text-red-500 font-semibold mr-1">
                      Select a frequency
                    </Text>
                  )}
                </View>
                <View className="flex-row gap-2">
                  {(["Daily", "Monthly", "Yearly"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        setInterestType(type);
                        setInterestFrequencyError(false);
                      }}
                      className={`flex-1 py-3 items-center rounded-xl border ${
                        interestType === type
                          ? "bg-orange-50 border-orange-200 dark:bg-orange-900/40 dark:border-orange-700"
                          : interestFrequencyError
                            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                            : "bg-transparent border-gray-100 dark:border-gray-800 dark:bg-gray-800"
                      }`}
                    >
                      <Text
                        className={`font-bold ${
                          interestType === type
                            ? "text-orange-500"
                            : "text-gray-400"
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {isEditing && !isReadOnly && (
          <Pressable
            className="flex-row items-center justify-center mt-6 gap-2 active:opacity-60"
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#f43f5e" />
            <Text className="text-rose-500 font-semibold text-base">
              Delete Tab
            </Text>
          </Pressable>
        )}
      </ScreenContainer>
    </View>
  );
}
