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

export default function AddCustomerScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();

  const params = useLocalSearchParams<{ lendId?: string, customerId?: string, readOnly?: string }>();
  const isEditing = !!params.lendId;
  const isReadOnly = params.readOnly === 'true';

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [interestEnabled, setInterestEnabled] = useState(false);
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState<'Daily' | 'Monthly' | 'Yearly' | null>(null);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInterestValidation, setShowInterestValidation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAmountChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1');
    setAmount(sanitized);
  };

  const handleRateChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1');
    setInterestRate(sanitized);
  };

  useEffect(() => {
    if (isEditing && params.lendId) {
      const loadLend = async () => {
        const l = await db.getFirstAsync<any>('SELECT * FROM lends WHERE id = ?', [params.lendId ?? null]);
        const c = await db.getFirstAsync<any>('SELECT name FROM customers WHERE id = ?', [params.customerId ?? (l?.customer_id ?? null)]);
        
        if (c) setName(c.name);
        if (l) {
          setAmount(l.amount.toString());
          setInterestEnabled(l.interest_enabled === 1);
          setInterestRate(l.interest_rate > 0 ? l.interest_rate.toString() : '');
          setInterestType(l.interest_type);
        }
      };
      loadLend();
    }
  }, [isEditing, params.lendId, db]);

  useEffect(() => {
    if (!showInterestValidation) return;
    if (!interestEnabled) {
      setInterestError(null);
      setShowInterestValidation(false);
      return;
    }
    const parsedRate = parseFloat(interestRate.trim());
    const invalidRate = !interestRate.trim() || !Number.isFinite(parsedRate) || parsedRate <= 0;
    const missingFreq = !interestType;
    if (!invalidRate && !missingFreq) {
      setInterestError(null);
      setShowInterestValidation(false);
    } else if (invalidRate && missingFreq) {
      setInterestError('Please enter a valid interest rate and select a frequency.');
    } else if (invalidRate) {
      setInterestError('Please enter an interest rate greater than 0.');
    } else {
      setInterestError('Please select an interest frequency.');
    }
  }, [interestEnabled, interestRate, interestType, showInterestValidation]);

  const handleSave = async () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter a customer name.');
      return;
    }

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
      if (invalidRate && missingFreq) {
        setInterestError('Please enter a valid interest rate and select a frequency.');
      } else if (invalidRate) {
        setInterestError('Please enter an interest rate greater than 0.');
      } else if (missingFreq) {
        setInterestError('Please select an interest frequency.');
      }
      if (invalidRate || missingFreq) return;
    }

    setInterestError(null);
    setShowInterestValidation(false);

    const persistedType: 'Daily' | 'Monthly' | 'Yearly' | null = interestEnabled ? interestType : null;

    try {
      setIsSaving(true);
      let custId: number | undefined;

      await db.withTransactionAsync(async () => {
        if (isEditing && params.lendId) {
          custId = Number(params.customerId);
          if (params.customerId || name.trim()) {
             const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM customers WHERE LOWER(name) = LOWER(?) AND id != ?', [name.trim(), custId]);
             if (existing) throw new Error('DUPLICATE_NAME');
             await db.runAsync('UPDATE customers SET name = ? WHERE id = ?', [name.trim(), custId]);
          }
          await db.runAsync(
            'UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, interest_type = ? WHERE id = ?',
            [numAmount, interestEnabled ? 1 : 0, interestEnabled ? numRate : 0, persistedType, params.lendId]
          );
        } else {
          const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM customers WHERE LOWER(name) = LOWER(?)', [name.trim()]);
          if (existing) throw new Error('DUPLICATE_NAME');

          const result = await db.runAsync(
            'INSERT INTO customers (name, balance) VALUES (?, ?)',
            [name.trim(), numAmount]
          );
          custId = result.lastInsertRowId;
          await db.runAsync(
            'INSERT INTO lends (customer_id, amount, interest_enabled, interest_rate, interest_type) VALUES (?, ?, ?, ?, ?)',
            [custId, numAmount, interestEnabled ? 1 : 0, interestEnabled ? numRate : 0, persistedType]
          );
        }
      });

      // Update the customer's balance after insert/update
      if (custId) {
        const allLends = await db.getAllAsync<any>('SELECT amount, status FROM lends WHERE customer_id = ?', [custId]);
        const newBalance = allLends
          .filter((l: any) => l.status === 'Ongoing')
          .reduce((s: number, l: any) => s + l.amount, 0);
        await db.runAsync('UPDATE customers SET balance = ? WHERE id = ?', [newBalance, custId]);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      if (error.message === 'DUPLICATE_NAME') {
        setFormError('A customer with this name already exists.');
      } else {
        Alert.alert('Error', 'Failed to save entries.');
      }
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
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{isReadOnly ? 'View Details' : (isEditing ? 'Edit Lend' : 'New Customer')}</Text>

        {(formError || (showInterestValidation && interestError)) ? (
          <View className="mb-5 rounded-2xl bg-rose-500 dark:bg-rose-600 px-4 py-3">
            <Text className="text-white font-semibold">{formError || interestError}</Text>
          </View>
        ) : null}

        {/* Customer Name */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Customer Name</Text>
          <TextInput
            className="h-14 px-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-lg text-gray-900 dark:text-gray-100"
            placeholder="e.g. John Doe"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            autoFocus={!isReadOnly}
            editable={!isReadOnly}
          />
        </View>

        {/* Lend Amount */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Lend Amount</Text>
          <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
            <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">$</Text>
            <TextInput
              className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              editable={!isReadOnly}
            />
          </View>
        </View>

        {/* Interest Settings */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 ml-1">Charge Interest</Text>
            <Switch value={interestEnabled} onValueChange={setInterestEnabled} disabled={isReadOnly} trackColor={{ false: '#d1d5db', true: '#38bdf8' }} thumbColor={interestEnabled ? '#ffffff' : '#f3f4f6'} />
          </View>
          {interestEnabled && (
            <View className="gap-4">
              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Rate</Text>
                <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
                  <TextInput className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100" placeholder="0" placeholderTextColor="#9ca3af" value={interestRate} onChangeText={handleRateChange} keyboardType="numeric" editable={!isReadOnly} />
                  <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">%</Text>
                </View>
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Frequency</Text>
                <View className="flex-row gap-2">
                  {(['Daily', 'Monthly', 'Yearly'] as const).map((option) => {
                    const isSelected = interestType === option;
                    return (
                      <Pressable key={option} className={`flex-1 h-11 rounded-xl items-center justify-center border ${isSelected ? 'bg-sky-500 border-sky-500' : 'bg-transparent border-gray-300 dark:border-zinc-700'}`} onPress={() => { if (!isReadOnly) setInterestType(option); }}>
                        <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

        {!isReadOnly && (
          <Pressable
            className={`h-16 rounded-2xl items-center justify-center shadow-lg shadow-sky-500/30 mb-8 ${isSaving ? 'bg-sky-400' : 'bg-sky-500 active:opacity-90 active:scale-[0.98]'}`}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text className="text-white text-lg font-bold">{isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Customer & Lend')}</Text>
          </Pressable>
        )}
        <View className="pb-10" />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </SheetScreen>
  );
}
