import { useEffect, useRef, useState } from 'react';
import { TextInput, Pressable, View, Alert, Text, Switch, TouchableOpacity, Animated } from 'react-native';
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
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState<'Daily' | 'Monthly' | 'Yearly'>('Monthly');
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const interestInputRef = useRef<TextInput>(null);
 
  const [errorVisible, setErrorVisible] = useState(false);
 
  const handleToggleInterest = (val: boolean) => {
    setInterestEnabled(val);
    if (val) {
      setTimeout(() => {
        interestInputRef.current?.focus();
      }, 100);
    }
  };

  const handleFocus = (reactNode: any, extraHeight?: number) => {
    scrollViewRef.current?.scrollToFocusedInput(reactNode, extraHeight);
  };

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1'));
    setErrorVisible(false);
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
        setInterestRate(lend.interest_rate?.toString() || '');
        setInterestType(lend.interest_type || 'Monthly');
      }
    }
  }, [lend_id, lends]);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const header = (
    <View className="flex-row items-center justify-between px-2 py-3">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} className="w-12 h-12 items-center justify-center">
            <Ionicons name="chevron-back" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 italic">
            {isEditing ? 'Edit Lend' : 'New Lend'}
        </Text>
        <View className="w-12" />
    </View>
  );

  const isFormValid = amount.trim() !== '' && !isNaN(parseFloat(amount));

  const footer = (
    <View className="px-6 py-4">
        <Pressable
            className={`h-16 rounded-2xl items-center justify-center shadow-lg ${!isFormValid ? 'bg-gray-100 dark:bg-gray-800' : (isSaving ? 'bg-sky-400' : 'bg-sky-500 shadow-sky-500/30 active:opacity-90 active:scale-[0.98]')}`}
            onPress={handleSave}
            disabled={isSaving || !isFormValid}
        >
            <Text className={`text-lg font-bold ${!isFormValid ? 'text-gray-400 dark:text-gray-600' : 'text-white'}`}>{isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Confirm Lend')}</Text>
        </Pressable>
    </View>
  );

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-sky-400', 'bg-emerald-400', 'bg-violet-400',
      'bg-amber-400', 'bg-rose-400', 'bg-teal-400'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <View className="flex-1">
      <ScreenContainer scrollViewRef={scrollViewRef} header={header} footer={footer} edges={['top', 'bottom']} contentContainerStyle={{ padding: 24 }}>
        <View className="flex-row items-center mb-10 px-1">
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getAvatarColor(customer_name || 'C')}`}>
          <Text className="text-white font-bold text-base">{(customer_name || 'C').charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">Lending to</Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{customer_name}</Text>
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Lend Amount</Text>
        <View className={`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border ${errorVisible ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-800'} px-4 shadow-sm`}>
          <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">₱</Text>
          <TextInput
            className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
            placeholder="0.00" placeholderTextColor="#9ca3af"
            value={amount} onChangeText={handleAmountChange}
            onFocus={(event) => handleFocus(event.target)}
            keyboardType="numeric" autoFocus={!isEditing}
          />
        </View>
      </View>

      <View className="mb-0 p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <View className={`w-10 h-10 rounded-full ${(!amount.trim()) ? 'bg-gray-100 dark:bg-zinc-800' : 'bg-sky-100 dark:bg-sky-900/40'} items-center justify-center mr-3`}>
              <Ionicons name="trending-up" size={20} color={(!amount.trim()) ? '#9ca3af' : '#0ea5e9'} />
            </View>
            <Text className={`text-base font-bold ${(!amount.trim()) ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'}`}>Interest Rate</Text>
          </View>
          <Switch
            value={interestEnabled}
            onValueChange={handleToggleInterest}
            trackColor={{ false: '#e5e7eb', true: '#bae6fd' }}
            thumbColor={interestEnabled ? '#0ea5e9' : '#f3f4f6'}
            disabled={!amount.trim()}
          />
        </View>

        {interestEnabled && (
          <View className="gap-6">
            <View>
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Rate</Text>
              <View className="flex-row items-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 shadow-sm">
                 <TextInput
                   ref={interestInputRef}
                   className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100" placeholder="0" placeholderTextColor="#9ca3af" value={interestRate} onChangeText={handleRateChange} onFocus={(event) => handleFocus(event.target, 300)} keyboardType="numeric"
                 />
                <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">%</Text>
              </View>
            </View>

            <View>
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Frequency</Text>
              <View className="flex-row gap-2">
                {(['Daily', 'Monthly', 'Yearly'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setInterestType(type)}
                    className={`flex-1 py-3 items-center rounded-xl border ${interestType === type ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/40 dark:border-sky-700' : 'bg-transparent border-gray-100 dark:border-gray-800 dark:bg-gray-800'}`}
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
    </View>
  );
}
