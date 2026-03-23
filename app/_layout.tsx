import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { Component, Suspense, useCallback } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { AuthContext } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { migrateDbIfNeeded } from '@/services/database';
import { SheetProvider } from 'react-native-sheet-transitions';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

class DatabaseErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    if (Platform.OS === 'web' && error?.message?.includes('createSyncAccessHandle')) return { hasError: true };
    throw error;
  }
  componentDidCatch(error: Error) {
    if (Platform.OS === 'web' && error?.message?.includes('createSyncAccessHandle')) {
      setTimeout(() => this.setState({ hasError: false }), 500);
    }
  }
  render() {
    if (this.state.hasError) return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: '#888' }}>Reconnecting to database…</Text>
      </View>
    );
    return this.props.children;
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const markProfileReady = useCallback(() => { }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthContext.Provider value={{ markProfileReady }}>
        <DatabaseErrorBoundary>
          <Suspense fallback={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
          }>
            <SQLiteProvider databaseName="tabtracker.db" onInit={migrateDbIfNeeded} useSuspense>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <SheetProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'slide_from_right',
                      fullScreenGestureEnabled: true,
                      gestureEnabled: true,
                      presentation: 'card',
                    }}
                  >
                    <Stack.Screen name="index" options={{ animation: 'none' }} />
                    <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="modal" />
                    <Stack.Screen name="add-customer" />
                    <Stack.Screen name="add-lend" />
                    <Stack.Screen name="select-customer" />
                    <Stack.Screen name="quick-add" options={{ presentation: 'transparentModal', animation: 'fade' }} />
                    <Stack.Screen name="customer/[id]" />
                  </Stack>
                </SheetProvider>
                <StatusBar style="auto" />
              </ThemeProvider>
            </SQLiteProvider>
          </Suspense>
        </DatabaseErrorBoundary>
      </AuthContext.Provider>
    </GestureHandlerRootView>
  );
}
