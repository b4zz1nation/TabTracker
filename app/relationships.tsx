import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { useCustomers } from "@/hooks/use-customers";
import { useCreditors } from "@/hooks/use-creditors";
import { useLends } from "@/hooks/use-lends";

type RelationshipPage = {
  key: string;
  render: () => React.ReactElement;
};

export default function RelationshipsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const { lends, refresh: refreshLends } = useLends();
  const { creditors, refresh: refreshCreditors } = useCreditors();

  const flatRef = useRef<FlatList<RelationshipPage>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activePage, setActivePage] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refreshCustomers();
      refreshLends();
      refreshCreditors();
    }, [refreshCustomers, refreshLends, refreshCreditors]),
  );

  const customerStats = useMemo(() => {
    const map: Record<number, { lendCount: number; ongoingTotal: number }> = {};
    for (const customer of customers) {
      const customerLends = lends.filter((lend) => lend.customer_id === customer.id);
      if (customerLends.length === 0) continue;
      map[customer.id] = {
        lendCount: customerLends.length,
        ongoingTotal: customerLends
          .filter((lend) => lend.status === "Ongoing")
          .reduce((sum, lend) => sum + lend.amount, 0),
      };
    }
    return map;
  }, [customers, lends]);

  const customersWithHistory = useMemo(
    () => customers.filter((customer) => customerStats[customer.id]),
    [customers, customerStats],
  );

  const creditorsWithHistory = useMemo(
    () => creditors.filter((creditor) => creditor.name.trim().length > 0),
    [creditors],
  );

  const onMomentumScrollEnd = useCallback(
    (event: any) => {
      const newPage = Math.round(event.nativeEvent.contentOffset.x / width);
      setActivePage(newPage);
    },
    [width],
  );

  const scrollToPage = useCallback(
    (page: number) => {
      flatRef.current?.scrollToOffset({ offset: page * width, animated: true });
      setActivePage(page);
    },
    [width],
  );

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

  const renderCustomerPage = useCallback(
    () => (
      <View style={{ width }}>
        <FlatList
          data={customersWithHistory}
          keyExtractor={(item) => `customer-${item.id}`}
          renderItem={({ item }) => {
            const stats = customerStats[item.id];

            return (
              <View className="rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <Pressable
                  onPress={() => router.push(`/customer/${item.id}`)}
                  className="flex-row items-center p-5 active:bg-gray-50 dark:active:bg-gray-800/50"
                >
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-4 bg-sky-500">
                    <Text className="text-white font-bold text-lg">
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] font-black mb-0.5">
                      I&apos;ve Lent
                    </Text>
                    <Text className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                      {item.name}
                    </Text>
                    <Text className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">
                      {stats.lendCount} {stats.lendCount === 1 ? "loan" : "loans"}
                    </Text>
                  </View>
                  <View className="items-end mr-2">
                    <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-1">
                      Outstanding
                    </Text>
                    <Text className="text-xl font-black text-red-500">
                      PHP {stats.ongoingTotal.toFixed(2)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                </Pressable>
              </View>
            );
          }}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center mt-20 gap-4 px-10">
              <Ionicons name="people-outline" size={40} color="#d1d5db" />
              <View>
                <Text className="text-gray-900 dark:text-gray-100 text-xl font-bold text-center mb-2">
                  No Lending History
                </Text>
                <Text className="text-gray-400 dark:text-gray-500 text-center leading-relaxed font-medium">
                  People you&apos;ve lent to will appear here.
                </Text>
              </View>
            </View>
          }
        />
      </View>
    ),
    [customerStats, customersWithHistory, router, width],
  );

  const renderCreditorPage = useCallback(
    () => (
      <View style={{ width }}>
        <FlatList
          data={creditorsWithHistory}
          keyExtractor={(item) => `creditor-${item.id}`}
          renderItem={({ item }) => (
            <View className="rounded-3xl mx-4 mb-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <Pressable
                onPress={() => router.push(`/creditor/${item.id}`)}
                className="flex-row items-center p-5 active:bg-gray-50 dark:active:bg-gray-800/50"
              >
                <View className="w-12 h-12 rounded-full items-center justify-center mr-4 bg-orange-500">
                  <Text className="text-white font-bold text-lg">
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[2px] font-black mb-0.5">
                    I&apos;ve Borrowed
                  </Text>
                  <Text className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                    {item.name}
                  </Text>
                  {!!item.description && (
                    <Text
                      numberOfLines={1}
                      className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1"
                    >
                      {item.description}
                    </Text>
                  )}
                </View>
                <View className="items-end mr-2">
                  <Text className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black mb-1">
                    Balance
                  </Text>
                  <Text className="text-xl font-black text-orange-500">
                    PHP {(item.balance || 0).toFixed(2)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </Pressable>
            </View>
          )}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center mt-20 gap-4 px-10">
              <Ionicons name="wallet-outline" size={40} color="#d1d5db" />
              <View>
                <Text className="text-gray-900 dark:text-gray-100 text-xl font-bold text-center mb-2">
                  No Borrowing History
                </Text>
                <Text className="text-gray-400 dark:text-gray-500 text-center leading-relaxed font-medium">
                  People you&apos;ve borrowed from will appear here.
                </Text>
              </View>
            </View>
          }
        />
      </View>
    ),
    [creditorsWithHistory, router, width],
  );

  const pages = useMemo(
    () => [
      { key: "lent", render: renderCustomerPage },
      { key: "borrowed", render: renderCreditorPage },
    ],
    [renderCustomerPage, renderCreditorPage],
  );

  return (
    <ScreenContainer
      scrollable={false}
      header={
        <View className="px-5 pt-3 pb-4">
          <Pressable onPress={() => router.back()} className="mb-2">
            <Ionicons
              name="chevron-back"
              size={28}
              color={colorScheme === "dark" ? "#fff" : "#1f2937"}
            />
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            People
          </Text>
          <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Who you&apos;ve lent to and borrowed from
          </Text>
        </View>
      }
    >
      <View className="py-4 bg-gray-50 dark:bg-gray-950">
        <View className="flex-row items-center">
          <Pressable onPress={() => scrollToPage(0)} className="flex-1 items-center">
            <Text
              className={`text-sm font-black ${activePage === 0 ? "text-sky-500" : "text-gray-400 dark:text-gray-500"}`}
            >
              I&apos;ve Lent
            </Text>
          </Pressable>
          <Pressable onPress={() => scrollToPage(1)} className="flex-1 items-center">
            <Text
              className={`text-sm font-black ${activePage === 1 ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`}
            >
              I&apos;ve Borrowed
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
        data={pages}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.render()}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />
    </ScreenContainer>
  );
}
