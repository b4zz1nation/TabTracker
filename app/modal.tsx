import { useEffect, useState } from 'react';
import { TextInput, Pressable, View, Alert, KeyboardAvoidingView, Platform, Text, Switch } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCustomers } from '@/hooks/use-customers';

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    balance?: string;
    interest_enabled?: string;
    interest_rate?: string;
    interest_type?: string;
  }>();
  const isEditing = !!params.id;
  const hasInterestFromParams = params.interest_enabled === '1' || params.interest_enabled === 'true';
  
  const { addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  
  const [name, setName] = useState(params.name || '');
  // For "Add" flow, keep the field empty so typing doesn't get prefixed by "0".
  // For "Edit" flow, show the existing value (including "0" if that's what it is).
  const [balance, setBalance] = useState(isEditing ? (params.balance ?? '') : '');
  const [interestEnabled, setInterestEnabled] = useState(
    isEditing ? hasInterestFromParams : false
  );
  const [interestRate, setInterestRate] = useState(
    isEditing && hasInterestFromParams ? (params.interest_rate ?? '') : ''
  );
  const [interestType, setInterestType] = useState<'Daily' | 'Monthly' | 'Yearly' | null>(
    isEditing && hasInterestFromParams && (params.interest_type === 'Daily' || params.interest_type === 'Monthly' || params.interest_type === 'Yearly')
      ? params.interest_type
      : null
  );
  const [interestError, setInterestError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInterestValidation, setShowInterestValidation] = useState(false);

  const handleAmountChange = (text: string) => {
    const sanitized = text
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1");
    setBalance(sanitized);
  };

  const handleRateChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setInterestRate(sanitized);
  };

  useEffect(() => {
    if (!showInterestValidation) {
      return;
    }

    if (!interestEnabled) {
      setInterestError(null);
      setShowInterestValidation(false);
      return;
    }

    const parsedRate = parseFloat(interestRate.trim());
    const invalidRate = !interestRate.trim() || !Number.isFinite(parsedRate) || parsedRate <= 0;
    const missingFrequency = !interestType;

    if (!invalidRate && !missingFrequency) {
      setInterestError(null);
      setShowInterestValidation(false);
    } else if (invalidRate && missingFrequency) {
      setInterestError('Please enter a valid interest rate and select a frequency.');
    } else if (invalidRate) {
      setInterestError('Please enter an interest rate greater than 0.');
    } else {
      setInterestError('Please select an interest frequency.');
    }
  }, [interestEnabled, interestRate, interestType, showInterestValidation]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a customer name');
      return;
    }

    const normalized = balance.trim();
    const parsed = normalized === '' ? 0 : parseFloat(normalized);
    const numBalance = Number.isFinite(parsed) ? parsed : 0;
    const normalizedRate = interestRate.trim();
    const parsedRate = normalizedRate === '' ? 0 : parseFloat(normalizedRate);
    const numInterestRate = Number.isFinite(parsedRate) ? parsedRate : 0;
    const invalidRate = !normalizedRate || !Number.isFinite(parsedRate) || parsedRate <= 0;
    const missingFrequency = !interestType;

    if (interestEnabled) {
      setShowInterestValidation(true);
      if (invalidRate && missingFrequency) {
        setInterestError('Please enter a valid interest rate and select a frequency.');
      } else if (invalidRate) {
        setInterestError('Please enter an interest rate greater than 0.');
      } else if (missingFrequency) {
        setInterestError('Please select an interest frequency.');
      }

      if (invalidRate || missingFrequency) {
        return;
      }
    }

    setInterestError(null);
    setShowInterestValidation(false);

    const persistedInterestType: 'Daily' | 'Monthly' | 'Yearly' | null = interestEnabled ? interestType : null;

    try {
      if (isEditing) {
        await updateCustomer(
          Number(params.id),
          name,
          numBalance,
          interestEnabled,
          interestEnabled ? numInterestRate : 0,
          persistedInterestType
        );
      } else {
        await addCustomer(
          name,
          numBalance,
          interestEnabled,
          interestEnabled ? numInterestRate : 0,
          persistedInterestType
        );
      }
      router.back();
    } catch (e: any) {
      if (e.message === 'DUPLICATE_NAME') {
        setFormError('A customer with this name already exists.');
      } else {
        Alert.alert('Error', 'Failed to save customer');
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await deleteCustomer(Number(params.id));
            router.back();
          } 
        },
      ]
    );
  };

  return (
      <KeyboardAwareScrollView
        className="flex-1 bg-white dark:bg-zinc-950"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={80}
        showsVerticalScrollIndicator={false}
      >
      <View className="flex-1 p-6">
        <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          {isEditing ? 'Edit Records' : 'New Customer'}
        </Text>

        {formError || (showInterestValidation && interestError) ? (
          <View className="mb-5 rounded-2xl bg-rose-500 dark:bg-rose-600 px-4 py-3">
            <Text className="text-white font-semibold">{formError || interestError}</Text>
          </View>
        ) : null}

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Customer Name</Text>
          <TextInput
            className="h-14 px-4 rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-lg text-gray-900 dark:text-gray-100"
            placeholder="e.g. John Doe"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            autoFocus={!isEditing}
          />
        </View>

        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Current Balance</Text>
          <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
            <Text className="text-2xl font-bold text-gray-400 dark:text-gray-500 mr-2">$</Text>
            <TextInput
              className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={balance}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
          </View>
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">
            Positive if they owe you, negative if you owe them.
          </Text>
        </View>

        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 ml-1">Charge Interest</Text>
            <Switch
              value={interestEnabled}
              onValueChange={setInterestEnabled}
              trackColor={{ false: '#d1d5db', true: '#38bdf8' }}
              thumbColor={interestEnabled ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          {interestEnabled && (
            <View className="gap-4">
              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Rate</Text>
                <View className="flex-row items-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 px-4">
                  <TextInput
                    className="flex-1 h-14 text-2xl font-bold text-gray-900 dark:text-gray-100"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={interestRate}
                    onChangeText={handleRateChange}
                    keyboardType="numeric"
                  />
                  <Text className="text-xl font-bold text-gray-400 dark:text-gray-500 ml-2">%</Text>
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ml-1">Interest Frequency</Text>
                <View className="flex-row gap-2">
                  {(['Daily', 'Monthly', 'Yearly'] as const).map((option) => {
                    const isSelected = interestType === option;
                    return (
                      <Pressable
                        key={option}
                        className={`flex-1 h-11 rounded-xl items-center justify-center border ${
                          isSelected
                            ? 'bg-sky-500 border-sky-500'
                            : 'bg-transparent border-gray-300 dark:border-zinc-700'
                        }`}
                        onPress={() => setInterestType(option)}>
                        <Text
                          className={`font-semibold ${
                            isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </View>

        <Pressable 
          className="h-16 rounded-2xl bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/30 active:opacity-90 active:scale-[0.98]"
          onPress={handleSave}
        >
          <Text className="text-white text-lg font-bold">
            {isEditing ? 'Update Profile' : 'Add to Tab'}
          </Text>
        </Pressable>

        {isEditing && (
          <Pressable 
            className="flex-row items-center justify-center mt-8 gap-2 active:opacity-60" 
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#f43f5e" />
            <Text className="text-rose-500 font-semibold text-base">Delete Permanently</Text>
          </Pressable>
        )}
        <View className="pb-10" />
      </View>
      </KeyboardAwareScrollView>
  );
}
