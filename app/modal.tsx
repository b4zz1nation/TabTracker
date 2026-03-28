import { useEffect, useRef, useState } from "react";
import {
  TextInput,
  Pressable,
  View,
  Alert,
  Text,
  Switch,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useCustomers } from "@/hooks/use-customers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import ScreenContainer from "@/components/screen-container";

export default function ModalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    balance?: string;
    interest_enabled?: string;
    interest_rate?: string;
    interest_type?: string;
  }>();
  const isEditing = !!params.id;
  const hasInterestFromParams =
    params.interest_enabled === "1" || params.interest_enabled === "true";

  const { addCustomer, updateCustomer, deleteCustomer } = useCustomers();

  const [name, setName] = useState(params.name || "");
  const [balance, setBalance] = useState(
    isEditing ? (params.balance ?? "") : "",
  );
  const [interestEnabled, setInterestEnabled] = useState(
    isEditing ? hasInterestFromParams : false,
  );
  const [interestRate, setInterestRate] = useState(
    isEditing && hasInterestFromParams ? (params.interest_rate ?? "") : "",
  );
  const [interestType, setInterestType] = useState<
    "Daily" | "Monthly" | "Yearly" | null
  >(
    isEditing &&
      hasInterestFromParams &&
      (params.interest_type === "Daily" ||
        params.interest_type === "Monthly" ||
        params.interest_type === "Yearly")
      ? (params.interest_type as any)
      : null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const scrollViewRef = useRef<any>(null);
  const footerTranslateY = useRef(new Animated.Value(0)).current;
  const keyboardVerticalOffset = Platform.OS === "ios" ? 40 : 20;
  const keyboardFooterGap = 18;

  const handleFocus = (reactNode: any) => {
    scrollViewRef.current?.scrollToFocusedInput(reactNode);
  };

  const handleAmountChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setBalance(sanitized);
  };

  const handleRateChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setInterestRate(sanitized);
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const keyboardHeight = e.endCoordinates.height;
      const toValue = -Math.max(
        0,
        keyboardHeight - keyboardVerticalOffset + keyboardFooterGap,
      );
      Animated.spring(footerTranslateY, {
        toValue,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.spring(footerTranslateY, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [footerTranslateY, keyboardVerticalOffset, keyboardFooterGap]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a customer name");
      return;
    }

    const normalized = balance.trim();
    const parsed = normalized === "" ? 0 : parseFloat(normalized);
    const numBalance = Number.isFinite(parsed) ? parsed : 0;
    const normalizedRate = interestRate.trim();
    const parsedRate = normalizedRate === "" ? 0 : parseFloat(normalizedRate);

    if (interestEnabled) {
      if (!normalizedRate || parsedRate <= 0 || !interestType) {
        Alert.alert(
          "Error",
          "Please provide a valid interest rate and frequency.",
        );
        return;
      }
    }

    try {
      if (isEditing) {
        await updateCustomer(
          Number(params.id),
          name,
          numBalance,
          interestEnabled,
          interestEnabled ? parsedRate : 0,
          interestEnabled ? interestType : null,
        );
      } else {
        await addCustomer(
          name,
          numBalance,
          interestEnabled,
          interestEnabled ? parsedRate : 0,
          interestEnabled ? interestType : null,
        );
      }
      router.back();
    } catch (e: any) {
      if (e.message === "DUPLICATE_NAME") {
        setFormError("A customer with this name already exists.");
      } else {
        Alert.alert("Error", "Failed to save customer");
      }
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Customer", `Are you sure you want to delete ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCustomer(Number(params.id));
          router.back();
        },
      },
    ]);
  };

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
      <TouchableOpacity
        onPress={() => router.back()}
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
        {isEditing ? "Edit Profile" : "New Customer"}
      </Text>
      <View className="w-12" />
    </View>
  );

  const footer = (
    <View className="px-6 py-4">
      <Pressable
        className="h-16 rounded-2xl bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/30 active:opacity-90 active:scale-[0.98]"
        onPress={handleSave}
      >
        <Text className="text-white text-lg font-bold">
          {isEditing ? "Update Profile" : "Add to Tab"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer
      scrollViewRef={scrollViewRef}
      header={header}
      footer={footer}
      footerContainerStyle={{ transform: [{ translateY: footerTranslateY }] }}
      edges={["top", "bottom"]}
      contentContainerStyle={{ padding: 24 }}
    >
      {formError && (
        <View className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-200 p-4">
          <Text className="text-rose-600 font-semibold">{formError}</Text>
        </View>
      )}

      <View className="mb-6">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
          Customer Name
        </Text>
        <TextInput
          className="h-14 px-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-lg text-gray-900 dark:text-gray-100"
          placeholder="e.g. John Doe"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          onFocus={(event) => handleFocus(event.target)}
          autoFocus={!isEditing}
        />
      </View>

      <View className="mb-8">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
          Starting Balance
        </Text>
        <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
          <Text className="text-2xl font-bold text-gray-400 mr-2">₱</Text>
          <TextInput
            className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            value={balance}
            onChangeText={handleAmountChange}
            onFocus={(event) => handleFocus(event.target)}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Interest Settings */}
      <View className="mb-4 p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/40 items-center justify-center mr-3">
              <Ionicons name="trending-up" size={20} color="#0ea5e9" />
            </View>
            <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
              Charge Interest
            </Text>
          </View>
          <Switch
            value={interestEnabled}
            onValueChange={setInterestEnabled}
            trackColor={{ false: "#e5e7eb", true: "#bae6fd" }}
            thumbColor={interestEnabled ? "#0ea5e9" : "#f3f4f6"}
          />
        </View>

        {interestEnabled && (
          <View className="gap-6">
            <View>
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Interest Rate
              </Text>
              <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
                <TextInput
                  className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  value={interestRate}
                  onChangeText={handleRateChange}
                  onFocus={(event) => handleFocus(event.target)}
                  keyboardType="numeric"
                />
                <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">
                  %
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">
                Frequency
              </Text>
              <View className="flex-row gap-2">
                {(["Daily", "Monthly", "Yearly"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setInterestType(type)}
                    className={`flex-1 py-3 items-center rounded-xl border ${interestType === type ? "bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800" : "bg-transparent border-gray-100 dark:border-zinc-800"}`}
                  >
                    <Text
                      className={`font-bold ${interestType === type ? "text-sky-600 dark:text-sky-400" : "text-gray-400"}`}
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

      {isEditing && (
        <Pressable
          className="flex-row items-center justify-center mb-0 gap-2 active:opacity-60"
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#f43f5e" />
          <Text className="text-rose-500 font-semibold text-base">
            Delete Permanently
          </Text>
        </Pressable>
      )}
    </ScreenContainer>
  );
}
