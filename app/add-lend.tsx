<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react';
import { TextInput, Pressable, View, Alert, Text, Switch, TouchableOpacity } from 'react-native';
=======
import { useEffect, useState } from 'react';
import { TextInput, Pressable, View, Alert, KeyboardAvoidingView, Platform, Text, Switch, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';

import { useCustomers } from '@/hooks/use-customers';
import { useLends } from '@/hooks/use-lends';
import { useColorScheme } from '@/hooks/use-color-scheme';
import ScreenContainer from '@/components/screen-container';

export default function AddLendScreen() {
  const router = useRouter();
  const { customer_id, customer_name, lend_id } = useLocalSearchParams<{ customer_id: string; customer_name: string; lend_id?: string }>();
  const isEditing = !!lend_id;
  const colorScheme = useColorScheme();

  const db = useSQLiteContext();
  const { refresh: refreshCustomers } = useCustomers();
  const { refresh: refreshLends, lends } = useLends();

  const [amount, setAmount] = useState('');
  const [interestEnabled, setInterestEnabled] = useState(false);
  const [interestRate, setInterestRate] = useState('5');
  const [interestType, setInterestType] = useState<'Daily' | 'Monthly' | 'Yearly'>('Monthly');
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const handleFocus = (reactNode: any) => {
    scrollViewRef.current?.scrollToFocusedInput(reactNode);
  };

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1'));
  };

  const handleRateChange = (text: string) => {
    setInterestRate(text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1'));
  };

  useEffect(() => {
    if (lend_id) {
      const lend = lends.find((l) => l.id === Number(lend_id));
      if (lend) {
        setAmount(lend.amount.toString());
        setInterestEnabled(lend.interest_enabled === 1);
        setInterestRate(lend.interest_rate?.toString() || '5');
        setInterestType(lend.interest_type || 'Monthly');
      }
    }
  }, [lend_id, lends]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing) {
        await db.runAsync(
          'UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, interest_type = ? WHERE id = ?',
          [numAmount, interestEnabled ? 1 : 0, parseFloat(interestRate), interestType, Number(lend_id)]
        );
      } else {
        await db.runAsync(
          'INSERT INTO lends (customer_id, amount, status, interest_enabled, interest_rate, interest_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [Number(customer_id), numAmount, 'Ongoing', interestEnabled ? 1 : 0, parseFloat(interestRate), interestType, new Date().toISOString()]
        );
      }

      const allLends = await db.getAllAsync<{amount: number}>('SELECT amount FROM lends WHERE customer_id = ? AND status = ?', [Number(customer_id), 'Ongoing']);
      const newBalance = allLends.reduce((sum, l) => sum + l.amount, 0);
      await db.runAsync('UPDATE customers SET balance = ? WHERE id = ?', [newBalance, Number(customer_id)]);

      await refreshCustomers();
      await refreshLends();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save lend. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

<<<<<<< HEAD
  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} className="w-12 h-12 items-center justify-center">
            <Ionicons name="chevron-back" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 italic">
=======
  return (
    <SheetScreen onClose={() => router.back()} dragDirections={{ toBottom: true, toTop: false, toLeft: false, toRight: false }} opacityOnGestureMove={true} containerRadiusSync={true}>
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={['top', 'left', 'right']}>
          <KeyboardAwareScrollView className="flex-1 bg-gray-50 dark:bg-gray-950" contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" enableOnAndroid={true} extraScrollHeight={80} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} className="w-11 h-11 items-center justify-center -ml-2 mb-2">
            <Ionicons name="close" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
            {isEditing ? 'Edit Lend' : 'New Lend'}
        </Text>
        <View className="w-12" />
    </View>
  );

  const footer = (
    <View className="px-6 py-4">
        <Pressable
            className={`h-16 rounded-2xl items-center justify-center shadow-lg shadow-sky-500/30 ${isSaving ? 'bg-sky-400' : 'bg-sky-500 active:opacity-90 active:scale-[0.98]'}`}
            onPress={handleSave}
            disabled={isSaving}
        >
            <Text className="text-white text-lg font-bold">{isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Confirm Lend')}</Text>
        </Pressable>
    </View>
  );

  return (
    <ScreenContainer scrollViewRef={scrollViewRef} header={header} footer={footer} edges={['top', 'bottom']} contentContainerStyle={{ padding: 24 }}>
      <Text className="text-gray-500 dark:text-gray-400 mb-8 capitalize px-1">for {customer_name}</Text>

      <View className="mb-8">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Lend Amount</Text>
        <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
          <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">$</Text>
          <TextInput
            className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
            placeholder="0.00" placeholderTextColor="#9ca3af"
            value={amount} onChangeText={handleAmountChange}
            onFocus={(event) => handleFocus(event.target)}
            keyboardType="numeric" autoFocus={!isEditing}
          />
        </View>
      </View>

      <View className="mb-0 p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/40 items-center justify-center mr-3">
              <Ionicons name="trending-up" size={20} color="#0ea5e9" />
            </View>
            <Text className="text-base font-bold text-gray-900 dark:text-gray-100">Interest Rate</Text>
          </View>
          <Switch
            value={interestEnabled}
            onValueChange={setInterestEnabled}
            trackColor={{ false: '#e5e7eb', true: '#bae6fd' }}
            thumbColor={interestEnabled ? '#0ea5e9' : '#f3f4f6'}
          />
        </View>

        {interestEnabled && (
          <View className="gap-6">
            <View>
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Rate</Text>
              <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
                 <TextInput className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100" placeholder="0" placeholderTextColor="#9ca3af" value={interestRate} onChangeText={handleRateChange} onFocus={(event) => handleFocus(event.target)} keyboardType="numeric" />
                <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">%</Text>
              </View>
            </View>

<<<<<<< HEAD
            <View>
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Frequency</Text>
              <View className="flex-row gap-2">
                {(['Daily', 'Monthly', 'Yearly'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setInterestType(type)}
                    className={`flex-1 py-3 items-center rounded-xl border ${interestType === type ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800' : 'bg-transparent border-gray-100 dark:border-zinc-800'}`}
                  >
                    <Text className={`font-bold ${interestType === type ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400'}`}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
=======
        <Pressable
          className={`h-16 rounded-2xl items-center justify-center shadow-lg shadow-sky-500/30 mb-8 ${isSaving ? 'bg-sky-400' : 'bg-sky-500 active:opacity-90 active:scale-[0.98]'}`}
          onPress={handleSave} disabled={isSaving}
        >
          <Text className="text-white text-lg font-bold">{isSaving ? 'Saving...' : isEditing ? 'Update Lend' : 'Add Lend'}</Text>
        </Pressable>
        <View className="pb-10" />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SheetScreen>
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
  );
}
