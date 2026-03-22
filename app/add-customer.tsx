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

export default function AddCustomerScreen() {
  const router = useRouter();
  const { customerId, lendId, readOnly } = useLocalSearchParams<{ customerId?: string; lendId?: string; readOnly?: string }>();
  const isEditing = !!lendId;
  const isReadOnly = readOnly === 'true';
  const colorScheme = useColorScheme();

<<<<<<< HEAD
  const db = useSQLiteContext();
  const { refresh: refreshCustomers } = useCustomers();
  const { lends, refresh: refreshLends } = useLends();
=======
  const params = useLocalSearchParams<{ lendId?: string, customerId?: string, readOnly?: string }>();
  const isEditing = !!params.lendId;
  const isReadOnly = params.readOnly === 'true';
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0

  const [name, setName] = useState('');
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
    const sanitized = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1');
    setAmount(sanitized);
  };

  const handleRateChange = (text: string) => {
    setInterestRate(text.replace(/[^0-9.]/g, '').replace(/(\..*)\./, '$1'));
  };

  useEffect(() => {
    if (lendId) {
      const lend = lends.find((l) => l.id === Number(lendId));
      if (lend) {
        setAmount(lend.amount.toString());
        setInterestEnabled(lend.interest_enabled === 1);
        setInterestRate(lend.interest_rate?.toString() || '5');
        setInterestType(lend.interest_type || 'Monthly');
        
        db.getFirstAsync<{ name: string }>('SELECT name FROM customers WHERE id = ?', [lend.customer_id]).then(res => {
          if (res) setName(res.name);
        });
      }
    } else if (customerId) {
        db.getFirstAsync<{ name: string }>('SELECT name FROM customers WHERE id = ?', [Number(customerId)]).then(res => {
            if (res) setName(res.name);
        });
    }
  }, [lendId, lends, customerId, db]);

  const handleSave = async () => {
    if (isReadOnly) return;
    const trimmedName = name.trim();
    const numAmount = parseFloat(amount);

    if (!trimmedName || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid name and amount.');
      return;
    }

    try {
      setIsSaving(true);
<<<<<<< HEAD
      if (isEditing) {
        await db.runAsync(
          'UPDATE lends SET amount = ?, interest_enabled = ?, interest_rate = ?, interest_type = ? WHERE id = ?',
          [numAmount, interestEnabled ? 1 : 0, parseFloat(interestRate), interestType, Number(lendId)]
        );
      } else if (customerId) {
=======
      let custId: number | undefined;

      await db.withTransactionAsync(async () => {
        if (isEditing && params.lendId) {
          custId = Number(params.customerId);
          if (params.customerId || name.trim()) {
             const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM customers WHERE LOWER(name) = LOWER(?) AND id != ?', [name.trim(), custId]);
             if (existing) throw new Error('DUPLICATE_NAME');
             await db.runAsync('UPDATE customers SET name = ? WHERE id = ?', [name.trim(), custId]);
          }
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
          await db.runAsync(
            'INSERT INTO lends (customer_id, amount, status, interest_enabled, interest_rate, interest_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [Number(customerId), numAmount, 'Ongoing', interestEnabled ? 1 : 0, parseFloat(interestRate), interestType, new Date().toISOString()]
          );
<<<<<<< HEAD
      } else {
        const result = await db.runAsync('INSERT INTO customers (name, balance) VALUES (?, ?)', [trimmedName, numAmount]);
        const newCustomerId = result.lastInsertRowId;
        await db.runAsync(
          'INSERT INTO lends (customer_id, amount, status, interest_enabled, interest_rate, interest_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [newCustomerId, numAmount, 'Ongoing', interestEnabled ? 1 : 0, parseFloat(interestRate), interestType, new Date().toISOString()]
        );
=======
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
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
      }

      const cId = Number(customerId || (isEditing ? lends.find(l => l.id === Number(lendId))?.customer_id : null));
      if (cId || !isEditing) {
          const targetId = cId || (await db.getFirstAsync<{id: number}>('SELECT id FROM customers WHERE name = ? ORDER BY id DESC', [trimmedName]))?.id;
          if (targetId) {
              const allLends = await db.getAllAsync<{amount: number}>('SELECT amount FROM lends WHERE customer_id = ? AND status = ?', [targetId, 'Ongoing']);
              const newBalance = allLends.reduce((sum, l) => sum + l.amount, 0);
              await db.runAsync('UPDATE customers SET balance = ? WHERE id = ?', [newBalance, targetId]);
          }
      }

      await refreshCustomers();
      await refreshLends();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
<<<<<<< HEAD
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save entries. Please try again.');
=======
    } catch (error: any) {
      if (error.message === 'DUPLICATE_NAME') {
        setFormError('A customer with this name already exists.');
      } else {
        Alert.alert('Error', 'Failed to save entries.');
      }
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
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
            {isEditing ? (isReadOnly ? 'Lend Details' : 'Edit Lend') : 'New Entry'}
        </Text>
        <View className="w-12" />
    </View>
  );

  const footer = !isReadOnly ? (
    <View className="px-6 py-4">
        <Pressable
            className={`h-16 rounded-2xl items-center justify-center shadow-lg shadow-sky-500/30 ${isSaving ? 'bg-sky-400' : 'bg-sky-500 active:opacity-90 active:scale-[0.98]'}`}
            onPress={handleSave}
            disabled={isSaving}
        >
            <Text className="text-white text-lg font-bold">{isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Customer & Lend')}</Text>
        </Pressable>
    </View>
  ) : null;

  return (
<<<<<<< HEAD
    <ScreenContainer scrollViewRef={scrollViewRef} header={header} footer={footer} edges={['top', 'bottom']} contentContainerStyle={{ padding: 24 }}>
=======
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
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
        <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Customer Name</Text>
            <TextInput
            className="h-14 px-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-lg text-gray-900 dark:text-gray-100"
            placeholder="Who are you lending to?"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
<<<<<<< HEAD
            onFocus={(event) => handleFocus(event.target)}
            autoFocus={!isReadOnly}
            editable={!isReadOnly && !customerId && !isEditing}
            />
=======
            autoFocus={!isReadOnly}
            editable={!isReadOnly}
          />
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
        </View>

        <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Amount Owed</Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
            <Text className="text-2xl font-bold text-gray-400 mr-2">$</Text>
            <TextInput
              className="flex-1 h-16 text-3xl font-bold text-gray-900 dark:text-gray-100"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              value={amount}
              onChangeText={handleAmountChange}
              onFocus={(event) => handleFocus(event.target)}
              keyboardType="numeric"
              editable={!isReadOnly}
            />
            </View>
        </View>

<<<<<<< HEAD
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
                onValueChange={!isReadOnly ? setInterestEnabled : undefined}
                trackColor={{ false: '#e5e7eb', true: '#bae6fd' }}
                thumbColor={interestEnabled ? '#0ea5e9' : '#f3f4f6'}
            />
            </View>

            {interestEnabled && (
            <View className="gap-6">
              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Rate</Text>
                <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
                   <TextInput className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100" placeholder="0" placeholderTextColor="#9ca3af" value={interestRate} onChangeText={handleRateChange} onFocus={(event) => handleFocus(event.target)} keyboardType="numeric" editable={!isReadOnly} />
=======
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
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
                  <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">%</Text>
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Frequency</Text>
                <View className="flex-row gap-2">
<<<<<<< HEAD
                  {(['Daily', 'Monthly', 'Yearly'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => !isReadOnly && setInterestType(type)}
                      className={`flex-1 py-3 items-center rounded-xl border ${interestType === type ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800' : 'bg-transparent border-gray-100 dark:border-zinc-800'}`}
                    >
                      <Text className={`font-bold ${interestType === type ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400'}`}>{type}</Text>
                    </TouchableOpacity>
                  ))}
=======
                  {(['Daily', 'Monthly', 'Yearly'] as const).map((option) => {
                    const isSelected = interestType === option;
                    return (
                      <Pressable key={option} className={`flex-1 h-11 rounded-xl items-center justify-center border ${isSelected ? 'bg-sky-500 border-sky-500' : 'bg-transparent border-gray-300 dark:border-zinc-700'}`} onPress={() => { if (!isReadOnly) setInterestType(option); }}>
                        <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{option}</Text>
                      </Pressable>
                    );
                  })}
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
                </View>
              </View>
            </View>
            )}
        </View>
<<<<<<< HEAD
    </ScreenContainer>
=======

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
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
  );
}
