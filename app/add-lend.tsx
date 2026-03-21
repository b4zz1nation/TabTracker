import { useEffect, useState } from 'react';
import { TextInput, Pressable, View, Alert, KeyboardAvoidingView, Platform, Text, Switch, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SheetScreen } from 'react-native-sheet-transitions';

export default function AddLendScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{
    customer_id: string;
    customer_name?: string;
    lend_id?: string;
    amount?: string;
    interest_enabled?: string;
    interest_rate?: string;
    interest_type?: string;
  }>();

  const isEditing = !!params.lend_id;
  const customerId = Number(params.customer_id);
  const customerName = params.customer_name ?? '';
  const hasInterestFromParams = params.interest_enabled === '1' || params.interest_enabled === 'true';

  const [amount, setAmount] = useState(isEditing ? (params.amount ?? '') : '');
  const [interestEnabled, setInterestEnabled] = useState(isEditing ? hasInterestFromParams : false);
  const [interestRate, setInterestRate] = useState(
    isEditing && hasInterestFromParams ? (params.interest_rate ?? '') : ''
  );
  const [interestType, setInterestType] = useState<'Daily' | 'Monthly' | 'Yearly' | null>(
    isEditing && hasInterestFromParams && (params.interest_type === 'Daily' || params.interest_type === 'Monthly' || params.interest_type === 'Yearly')
      ? params.interest_type : null
  );
  const [interestError, setInterestError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInterestValidation, setShowInterestValidation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1'));
  };
  const handleRateChange = (text: string) => {
    setInterestRate(text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1'));
  };

  useEffect(() => {
    if (!showInterestValidation) return;
    if (!interestEnabled) { setInterestError(null); setShowInterestValidation(false); return; }
    const parsedRate = parseFloat(interestRate.trim());
    const invalidRate = !interestRate.trim() || !Number.isFinite(parsedRate) || parsedRate <= 0;
    const missingFreq = !interestType;
    if (!invalidRate && !missingFreq) { setInterestError(null); setShowInterestValidation(false); }
    else if (invalidRate && missingFreq) setInterestError('Please enter a valid interest rate and select a frequency.');
    else if (invalidRate) setInterestError('Please enter an interest rate greater than 0.');
    else setInterestError('Please select an interest frequency.');
  }, [interestEnabled, interestRate, interestType, showInterestValidation]);

  const handleSave = async () => {
    setFormError(null);

    const normalizedAmt = amount.trim();
    const parsedAmt = normalizedAmt === '' ? 0 : parseFloat(normalizedAmt);
    const numAmount = Number.isFinite(parsedAmt) ? parsedAmt : 0;

    if (!normalizedAmt || !Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      setFormError('Please enter an amount greater than 0.');
      return;
    }

    const normalizedRate = interestRate.trim();
    const parsedRate = normalizedRate === '' ? 0 : parseFloat(normalizedRate);
    const numRate = Number.isFinite(parsedRate) ? parsedRate : 0;
    const invalidRate = !normalizedRate || !Number.isFinite(parsedRate) || parsedRate <= 0;
    const missingFreq = !interestType;

    if (interestEnabled) {
      setShowInterestValidation(true);
      if (invalidRate && missingFreq) setInterestError('Please enter a valid interest rate and select a frequency.');
      else if (invalidRate) setInterestError('Please enter an interest rate greater than 0.');
      else if (missingFreq) setInterestError('Please select an interest frequency.');
      if (invalidRate || missingFreq) return;
    }
    setInterestError(null); setShowInterestValidation(false);

    const persistedType: 'Daily' | 'Monthly' | 'Yearly' | null = interestEnabled ? interestType : null;

    try {
      setIsSaving(true);
      if (isEditing) {
        await db.runAsync(
          'UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, interest_type = ? WHERE id = ?',
          [numAmount, interestEnabled ? 1 : 0, interestEnabled ? numRate : 0, persistedType, Number(params.lend_id)]
        );
      } else {
        await db.runAsync(
          'INSERT INTO lends (customer_id, amount, interest_enabled, interest_rate, interest_type) VALUES (?, ?, ?, ?, ?)',
          [customerId, numAmount, interestEnabled ? 1 : 0, interestEnabled ? numRate : 0, persistedType]
        );
      }

      // Update the customer's balance after insert/update
      const allLends = await db.getAllAsync<any>('SELECT amount, status FROM lends WHERE customer_id = ?', [customerId]);
      const newBalance = allLends
        .filter((l: any) => l.status === 'Ongoing')
        .reduce((s: number, l: any) => s + l.amount, 0);
      await db.runAsync('UPDATE customers SET balance = ? WHERE id = ?', [newBalance, customerId]);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save lend.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SheetScreen onClose={() => router.back()} dragDirections={{ toBottom: true, toTop: false, toLeft: false, toRight: false }} opacityOnGestureMove={true} containerRadiusSync={true}>
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={['top', 'left', 'right']}>
          <KeyboardAwareScrollView className="flex-1 bg-gray-50 dark:bg-gray-950" contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" enableOnAndroid={true} extraScrollHeight={80} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} className="w-11 h-11 items-center justify-center -ml-2 mb-2">
            <Ionicons name="close" size={28} color={colorScheme === 'dark' ? '#ffffff' : '#1f2937'} />
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {isEditing ? 'Edit Lend' : 'New Lend'}
          </Text>
          {customerName ? (
            <Text className="text-base text-gray-400 dark:text-gray-500 mb-8">for {customerName}</Text>
          ) : <View className="mb-8" />}

        {(formError || (showInterestValidation && interestError)) ? (
          <View className="mb-5 rounded-2xl bg-rose-500 dark:bg-rose-600 px-4 py-3">
            <Text className="text-white font-semibold">{formError || interestError}</Text>
          </View>
        ) : null}

        {/* Amount */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Lend Amount</Text>
          <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
            <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">$</Text>
            <TextInput
              className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
              placeholder="0" placeholderTextColor="#9ca3af"
              value={amount} onChangeText={handleAmountChange}
              keyboardType="numeric" autoFocus={!isEditing}
            />
          </View>
        </View>

        {/* Interest Settings */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 ml-1">Charge Interest</Text>
            <Switch value={interestEnabled} onValueChange={setInterestEnabled} trackColor={{ false: '#d1d5db', true: '#38bdf8' }} thumbColor={interestEnabled ? '#ffffff' : '#f3f4f6'} />
          </View>
          {interestEnabled && (
            <View className="gap-4">
              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Rate</Text>
                <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
                  <TextInput className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100" placeholder="0" placeholderTextColor="#9ca3af" value={interestRate} onChangeText={handleRateChange} keyboardType="numeric" />
                  <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">%</Text>
                </View>
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Frequency</Text>
                <View className="flex-row gap-2">
                  {(['Daily', 'Monthly', 'Yearly'] as const).map((option) => {
                    const isSelected = interestType === option;
                    return (
                      <Pressable key={option} className={`flex-1 h-11 rounded-xl items-center justify-center border ${isSelected ? 'bg-sky-500 border-sky-500' : 'bg-transparent border-gray-300 dark:border-zinc-700'}`} onPress={() => setInterestType(option)}>
                        <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

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
  );
}
