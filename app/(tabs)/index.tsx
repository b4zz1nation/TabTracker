import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import ScreenContainer from "@/components/screen-container";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Customer, useCustomers } from "@/hooks/use-customers";
import { Creditor, useCreditors } from "@/hooks/use-creditors";
import { useLends } from "@/hooks/use-lends";
import { getUserProfile } from "@/services/user-profile";

const AVATAR_COLORS = [
  "bg-sky-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-teal-400",
];

const CREDITOR_AVATAR_COLORS = [
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
];

const CustomerCard = React.memo(
  ({
    item,
    stats,
    router,
    openDeleteModal,
  }: {
    item: Customer;
    stats: any;
    router: any;
    openDeleteModal: (id: number) => void;
  }) => {
    const avatarColor = useMemo(() => {
      const index = item.name.charCodeAt(0) % AVATAR_COLORS.length;
      return AVATAR_COLORS[index];
    }, [item.name]);

    const handlePress = useCallback(
      () => router.push(`/customer/${item.id}`),
      [router, item.id],
    );
    const handleLongPress = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      openDeleteModal(item.id);
    }, [openDeleteModal, item.id]);

    return (
      <View className="rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={500}
          className="flex-row items-center p-5 active:bg-gray-50 dark:active:bg-gray-800/50"
        >
          <View
            className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${avatarColor} shadow-sm`}
          >
            <Text className="text-white font-bold text-lg">
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] font-black mb-0.5">
              Customer
            </Text>
            <Text className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              {item.name}
            </Text>
            {stats.interestBadge && (
              <View className="flex-row items-center mt-1">
                <Ionicons
                  name="trending-up"
                  size={12}
                  color="#0ea5e9"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-[10px] text-sky-500 font-bold uppercase">
                  {stats.interestBadge}
                </Text>
              </View>
            )}
          </View>
          <View className="items-end mr-2">
            <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-1">
              Balance
            </Text>
            <Text
              className={`text-xl font-black ${item.balance > 0 ? "text-red-500" : "text-emerald-500"}`}
            >
              ₱{Math.abs(item.balance || 0).toFixed(2)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </Pressable>
      </View>
    );
  },
);

const CreditorCard = React.memo(
  ({
    item,
    router,
    openDeleteModal,
  }: {
    item: Creditor;
    router: any;
    openDeleteModal: (id: number) => void;
  }) => {
    const avatarColor = useMemo(() => {
      const index = item.name.charCodeAt(0) % CREDITOR_AVATAR_COLORS.length;
      return CREDITOR_AVATAR_COLORS[index];
    }, [item.name]);

    const handlePress = useCallback(() => {
      router.push(`/creditor/${item.id}`);
    }, [router, item.id]);

    const handleLongPress = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      openDeleteModal(item.id);
    }, [openDeleteModal, item.id]);

    return (
      <View className="rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={500}
          className="flex-row items-center p-5 active:bg-gray-50 dark:active:bg-gray-800/50"
        >
          <View
            className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${avatarColor} shadow-sm`}
          >
            <Text className="text-white font-bold text-lg">
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] font-black mb-0.5">
              Creditor
            </Text>
            <Text className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              {item.name}
            </Text>
          </View>
          <View className="items-end mr-2">
            <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-1">
              You Owe
            </Text>
            <Text className="text-xl font-black text-orange-500">
              ₱{(item.balance || 0).toFixed(2)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </Pressable>
      </View>
    );
  },
);

export default function HomeScreen() {
  const { customers, refresh: refreshCustomers } = useCustomers();
  const { lends, refresh: refreshLends } = useLends();
  const {
    creditors,
    refresh: refreshCreditors,
    deleteCreditor,
  } = useCreditors();
  const db = useSQLiteContext();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [userName, setUserName] = useState("");
  const [activePage, setActivePage] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Modals for deletes
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteModalType, setDeleteModalType] = useState<
    "customer" | "creditor"
  >("customer");
  const [deleteModalMounted, setDeleteModalMounted] = useState(false);
  const deleteAnim = useRef(new Animated.Value(600)).current;
  const deleteBackdropAnim = useRef(new Animated.Value(0)).current;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (deleteModalType === "customer") {
        await db.runAsync(
          "DELETE FROM lends WHERE customer_id = ? AND status = 'Ongoing'",
          [deleteId],
        );
        await db.runAsync("UPDATE customers SET balance = 0 WHERE id = ?", [
          deleteId,
        ]);
        await refreshCustomers();
        await refreshLends();
      } else {
        await deleteCreditor(deleteId);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
    }
  };

  const openDeleteModal = useCallback(
    (id: number, type: "customer" | "creditor" = "customer") => {
      setDeleteId(id);
      setDeleteModalType(type);
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

  const closeDeleteModal = useCallback(
    (cb?: () => void) => {
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
    },
    [deleteAnim, deleteBackdropAnim],
  );

  useFocusEffect(
    useCallback(() => {
      refreshCustomers();
      refreshLends();
      refreshCreditors();
      setDeleteModalMounted(false);
    }, [refreshCustomers, refreshLends, refreshCreditors]),
  );

  useEffect(() => {
    (async () => {
      const p = await getUserProfile();
      setUserName(p?.name ?? "");
    })();
  }, []);

  // Stats calculation
  const customerStats = useMemo(() => {
    const map: Record<number, any> = {};
    for (const c of customers) {
      const cLends = lends.filter(
        (l) => l.customer_id === c.id && l.status === "Ongoing",
      );
      const total = cLends.reduce((s, l) => s + l.amount, 0);
      const withInterest = cLends.find(
        (l) => l.interest_enabled === 1 && l.interest_type,
      );
      const freqShort: Record<string, string> = {
        Daily: "day",
        Monthly: "mo",
        Yearly: "yr",
      };
      const badge = withInterest
        ? `${withInterest.interest_rate}% / ${freqShort[withInterest.interest_type!] ?? withInterest.interest_type}`
        : null;
      map[c.id] = {
        totalOngoing: total,
        interestBadge: badge,
        lendCount: cLends.length,
      };
    }
    return map;
  }, [customers, lends]);

  const grandTotal = useMemo(
    () => customers.reduce((s, c) => s + (c.balance || 0), 0),
    [customers],
  );
  const totalIOWe = useMemo(
    () => creditors.reduce((s, c) => s + (c.balance || 0), 0),
    [creditors],
  );
  const activeCreditors = useMemo(
    () => creditors.filter((c) => (c.balance || 0) > 0),
    [creditors],
  );

  const activeCustomers = useMemo(() => {
    return customers.filter((c) => {
      const stats = customerStats[c.id];
      return stats && (stats.lendCount > 0 || stats.totalOngoing !== 0);
    });
  }, [customers, customerStats]);

  const onMomentumScrollEnd = (e: any) => {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newPage !== activePage) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActivePage(newPage);
    }
  };

  const scrollToPage = (page: number) => {
    flatRef.current?.scrollToOffset({ offset: page * width, animated: true });
    setActivePage(page);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderCollectPage = () => (
    <View style={{ width }}>
      <FlatList
        data={activeCustomers}
        keyExtractor={(item) => `customer-${item.id}`}
        renderItem={({ item }) => (
          <CustomerCard
            item={item}
            stats={customerStats[item.id] || {}}
            router={router}
            openDeleteModal={(id) => openDeleteModal(id, "customer")}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={collectListHeader}
        ListEmptyComponent={
          <View className="items-center mt-20 gap-6 px-10">
            <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Ionicons name="people-outline" size={40} color="#d1d5db" />
            </View>
            <View>
              <Text className="text-gray-900 dark:text-gray-100 text-xl font-bold text-center mb-2">
                No Active Tabs
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-center leading-relaxed font-medium">
                Your lending dashboard is empty. Tap the center add to track a
                lend.
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );

  const renderMyTabPage = () => (
    <View style={{ width }}>
      <FlatList
        data={activeCreditors}
        keyExtractor={(item) => `creditor-${item.id}`}
        renderItem={({ item }) => (
          <CreditorCard
            item={item}
            router={router}
            openDeleteModal={(id) => openDeleteModal(id, "creditor")}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={myTabListHeader}
        ListEmptyComponent={
          <View className="items-center mt-20 gap-6 px-10">
            <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Ionicons name="wallet-outline" size={40} color="#d1d5db" />
            </View>
            <View>
              <Text className="text-gray-900 dark:text-gray-100 text-xl font-bold text-center mb-2">
                No Tabs Yet
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 text-center leading-relaxed font-bold">
                You're debt-free! Tap the add button to track a new tab you
                borrowed.
              </Text>
            </View>
          </View>
        }
      />
      {/* Floating Add Button for creditors specifically on this page if needed, but per-page add is specified */}
    </View>
  );

  const collectListHeader = (
    <View className="px-4 pt-2 pb-2">
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-sky-500 mb-1">
            To Collect
          </Text>
          <Text className="text-base font-black text-sky-600 dark:text-sky-400">
            ₱{grandTotal.toFixed(2)}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-gray-500 dark:text-gray-400 mb-1">
            Active List
          </Text>
          <Text className="text-base font-black text-gray-900 dark:text-gray-100">
            {activeCustomers.length}
          </Text>
        </View>
      </View>
    </View>
  );

  const myTabListHeader = (
    <View className="px-4 pt-2 pb-2">
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-orange-500 mb-1">
            I Owe
          </Text>
          <Text className="text-base font-black text-orange-500">
            PHP {totalIOWe.toFixed(2)}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
          <Text className="text-[10px] font-black uppercase tracking-[2px] text-gray-500 dark:text-gray-400 mb-1">
            Active List
          </Text>
          <Text className="text-base font-black text-gray-900 dark:text-gray-100">
            {activeCreditors.length}
          </Text>
        </View>
      </View>
    </View>
  );

  const pages = [
    { key: "collect", render: renderCollectPage },
    { key: "mytab", render: renderMyTabPage },
  ];
  const indicatorTranslateX = useMemo(
    () =>
      scrollX.interpolate({
        inputRange: [0, width],
        outputRange: [0, width / 2],
        extrapolate: "clamp",
      }),
    [scrollX, width],
  );
  const indicatorColor = useMemo(
    () =>
      scrollX.interpolate({
        inputRange: [0, width],
        outputRange: ["#0ea5e9", "#f97316"],
        extrapolate: "clamp",
      }),
    [scrollX, width],
  );

  return (
    <ScreenContainer scrollable={false}>
      {/* Page Indicator */}
      <View className="py-4 bg-gray-50 dark:bg-gray-950">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => scrollToPage(0)}
            className="flex-1 items-center"
          >
            <Text
              className={`text-sm font-black ${activePage === 0 ? "text-sky-500" : "text-gray-400 dark:text-gray-500"}`}
            >
              To Collect
            </Text>
          </Pressable>
          <Pressable
            onPress={() => scrollToPage(1)}
            className="flex-1 items-center"
          >
            <Text
              className={`text-sm font-black ${activePage === 1 ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`}
            >
              My Tab
            </Text>
          </Pressable>
        </View>
        <View className="mt-2 h-0.5 w-full bg-gray-200 dark:bg-gray-800">
          <Animated.View
            style={{
              width: width / 2,
              transform: [{ translateX: indicatorTranslateX }],
              backgroundColor: indicatorColor,
            }}
            className="h-0.5"
          />
        </View>
      </View>

      <Animated.FlatList
        ref={flatRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={pages}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.render()}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        bounces={false}
      />

      {/* Delete Confirmation Overlay */}
      {deleteModalMounted && (
        <View className="absolute inset-0 z-[1000] justify-end">
          <Animated.View
            style={{ opacity: deleteBackdropAnim }}
            className="absolute inset-0 bg-black/50"
          >
            <Pressable className="flex-1" onPress={() => closeDeleteModal()} />
          </Animated.View>
          <Animated.View
            style={{ transform: [{ translateY: deleteAnim }] }}
            className="w-full bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-6 pb-12 border-t border-gray-100 dark:border-gray-800"
          >
            <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
            <View className="mb-8 px-2">
              <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">
                {deleteModalType === "customer"
                  ? "Clear Transaction?"
                  : "Delete Creditor?"}
              </Text>
              <Text className="text-gray-500 dark:text-gray-400 font-medium">
                {deleteModalType === "customer"
                  ? "This will remove the ongoing lend without deleting the contact. This action cannot be undone."
                  : "This will remove this entry and its balance permanently."}
              </Text>
            </View>
            <View className="gap-4">
              <Pressable
                onPress={() => closeDeleteModal(() => handleDelete())}
                className="w-full bg-rose-500 p-5 rounded-3xl items-center justify-center active:bg-rose-600 shadow-lg shadow-rose-500/20"
              >
                <Text className="text-white font-black text-lg">
                  {deleteModalType === "customer"
                    ? "Clear Lend"
                    : "Delete Entry"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => closeDeleteModal()}
                className="w-full p-4 items-center justify-center active:opacity-60"
              >
                <Text className="text-gray-400 dark:text-gray-500 font-bold text-lg">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </ScreenContainer>
  );
}
