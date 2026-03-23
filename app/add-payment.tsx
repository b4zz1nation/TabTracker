import React, { useState, useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLends } from '@/hooks/use-lends';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddPaymentScreen() {
  const router = useRouter();
  const { lendId, currentBalance } = useLocalSearchParams<{ lendId: string; currentBalance: string }>();
  const { addPayment } = useLends();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  
  const [amount, setAmount] = useState('');
  const slideAnim = useRef(new Animated.Value(600)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
    
    // Auto-focus the input
    const timer = setTimeout(() => {
        inputRef.current?.focus();
    }, 400);

    // Keyboard handling
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: -e.endCoordinates.height,
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
  }, []);

  const close = (cb?: () => void) => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.back();
      if (cb) setTimeout(cb, 50);
    });
  };

  const handleConfirm = async () => {
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addPayment(Number(lendId), payAmount);
      close();
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  return (
    <View className="flex-1">
      {/* Backdrop */}
      <Pressable 
        className="absolute inset-0 bg-black/40" 
        onPress={() => close()} 
      />
      
      <View className="flex-1 justify-end">
          <Animated.View
            style={{ 
              transform: [
                { translateY: slideAnim },
                { translateY: keyboardOffset }
              ],
              paddingBottom: Math.max(insets.bottom, 16) + 24
            }}
            className="bg-white dark:bg-gray-900 rounded-t-[40px] px-6 pt-6 shadow-2xl border-t border-gray-100 dark:border-gray-800"
          >
          <View className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8" />
          
          <Text className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[4px] font-black mb-2 text-center">Partial Payment</Text>
          <Text className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2 text-center">How much was paid?</Text>
          <Text className="text-xs text-center text-gray-400 dark:text-gray-500 mb-8 font-medium">
             Balance: <Text className="text-sky-500 font-bold">₱{currentBalance}</Text>
          </Text>

          <View className="relative mb-8">
            <View className="absolute left-6 top-1/2 -mt-4 z-10">
              <Text className="text-3xl font-black text-gray-400">₱</Text>
            </View>
            <TextInput
              ref={inputRef}
              autoFocus
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 dark:bg-gray-800/50 p-6 pl-14 rounded-3xl text-3xl font-black text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-800"
            />
          </View>

          <View className="flex-row gap-4">
            <Pressable 
              onPress={() => close()} 
              className="flex-1 p-5 rounded-3xl bg-gray-100 dark:bg-gray-800 items-center justify-center active:bg-gray-200 dark:active:bg-gray-700"
            >
              <Text className="text-lg font-bold text-gray-400 dark:text-gray-500">Cancel</Text>
            </Pressable>
            
            <Pressable 
              onPress={handleConfirm} 
              className="flex-[2] p-5 rounded-3xl bg-sky-500 shadow-lg shadow-sky-400/40 items-center justify-center active:scale-95"
            >
              <Text className="text-lg font-black text-white">Confirm Payment</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
