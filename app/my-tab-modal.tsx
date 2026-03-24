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
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCreditors } from "@/hooks/use-creditors";

const SPRING_CONFIG = {
  damping: 28,
  stiffness: 300,
  useNativeDriver: true as const,
};

export default function MyTabModalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { creditors, addCreditor, updateCreditor, deleteCreditor } =
    useCreditors();

  const keyboardOffset = Platform.OS === "ios" ? 40 : 20;
  const keyboardFooterGap = 18;
  const isEditing = useMemo(() => !!params.id, [params.id]);
  const existingCreditor = useMemo(
    () =>
      isEditing
        ? (creditors.find((creditor) => creditor.id === Number(params.id)) ??
          null)
        : null,
    [creditors, isEditing, params.id],
  );

  const [name, setName] = useState(existingCreditor?.name ?? "");
  const [balance, setBalance] = useState(
    existingCreditor ? existingCreditor.balance.toString() : "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const footerTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!existingCreditor) {
      if (!isEditing) {
        setName("");
        setBalance("");
      }
      return;
    }

    setName(existingCreditor.name);
    setBalance(existingCreditor.balance.toString());
  }, [existingCreditor, isEditing]);

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
    const sanitized = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setBalance(sanitized);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const normalizedBalance = balance.trim();
    const parsedBalance =
      normalizedBalance === "" ? 0 : parseFloat(normalizedBalance);
    const nextBalance = Number.isFinite(parsedBalance) ? parsedBalance : 0;

    if (!trimmedName) {
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      if (isEditing) {
        await updateCreditor(Number(params.id), trimmedName, nextBalance);
      } else {
        await addCreditor(trimmedName, nextBalance);
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
    isEditing,
    name,
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

  const saveDisabled = useMemo(
    () => !name.trim() || isSaving,
    [isSaving, name],
  );
  const headerTitle = useMemo(
    () => (isEditing ? "Edit Tab" : "New Tab"),
    [isEditing],
  );
  const buttonTitle = useMemo(() => {
    if (isSaving) {
      return "Saving...";
    }
    return isEditing ? "Update Tab" : "Add Tab";
  }, [isEditing, isSaving]);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top", "left", "right"]}
    >
      <View className="flex-1">
        <View className="z-10 bg-white dark:bg-gray-950 border-b border-orange-100 dark:border-orange-950/60">
          <View className="flex-row items-center justify-between px-2 py-3">
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.6}
              className="w-12 h-12 items-center justify-center"
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={colorScheme === "dark" ? "#fb923c" : "#f97316"}
              />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-orange-500 italic">
              {headerTitle}
            </Text>
            <View className="w-12" />
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 24,
            paddingBottom: 180 + insets.bottom,
          }}
        >
          {formError && (
            <View className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-200 p-4">
              <Text className="text-rose-600 font-semibold">{formError}</Text>
            </View>
          )}

          <View className="mb-6">
            <Text className="text-sm font-semibold text-orange-500 mb-2 ml-1">
              Tab Name
            </Text>
            <TextInput
              className={`h-14 px-4 rounded-2xl border text-lg shadow-sm ${
                nameFocused
                  ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20"
                  : "border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900"
              } text-gray-900 dark:text-gray-100`}
              placeholder="Tab name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (formError) {
                  setFormError(null);
                }
              }}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              autoFocus={!isEditing}
            />
          </View>

          <View className="mb-8">
            <Text className="text-sm font-semibold text-orange-500 mb-2 ml-1">
              Tab Amount
            </Text>
            <View
              className={`flex-row items-center rounded-2xl border px-4 shadow-sm ${
                amountFocused
                  ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/20"
                  : "border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900"
              }`}
            >
              <Text className="text-2xl font-bold text-orange-400 mr-2">₱</Text>
              <TextInput
                className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                value={balance}
                onChangeText={sanitizeBalance}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {isEditing && (
            <Pressable
              className="flex-row items-center justify-center mb-0 gap-2 active:opacity-60"
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#f43f5e" />
              <Text className="text-rose-500 font-semibold text-base">
                Delete Tab
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <Animated.View
          style={{ transform: [{ translateY: footerTranslateY }] }}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-orange-100 dark:border-orange-950/60"
        >
          <View
            className="px-6 py-4"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <Pressable
              className={`h-16 rounded-2xl items-center justify-center shadow-lg shadow-orange-500/30 ${
                saveDisabled
                  ? "bg-orange-500/40"
                  : "bg-orange-500 active:opacity-90 active:scale-[0.98]"
              }`}
              onPress={handleSave}
              disabled={saveDisabled}
            >
              <Text className="text-white text-lg font-bold">
                {buttonTitle}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
