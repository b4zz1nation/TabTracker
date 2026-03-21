import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import React, { Component, Suspense, useCallback, useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, View, Text, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { migrateDbIfNeeded } from '@/services/database';
import { getUserProfile } from '@/services/user-profile';
import { AuthContext } from '@/contexts/auth-context';
import { SheetProvider } from 'react-native-sheet-transitions';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * ErrorBoundary that catches the OPFS "createSyncAccessHandle" race
 * condition on web during hot-reload and automatically retries.
 */
class DatabaseErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    if (
      Platform.OS === 'web' &&
      error?.message?.includes('createSyncAccessHandle')
    ) {
      return { hasError: true };
    }
    throw error; // re-throw non-OPFS errors
  }

  componentDidCatch(error: Error) {
    if (
      Platform.OS === 'web' &&
      error?.message?.includes('createSyncAccessHandle')
    ) {
      console.warn(
        '[TabTracker] OPFS access-handle conflict detected – retrying in 500 ms…'
      );
      setTimeout(() => this.setState({ hasError: false }), 500);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: '#888' }}>
            Reconnecting to database…
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const markProfileReady = useCallback(() => {
    setHasProfile(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const profile = await getUserProfile();
      if (!isMounted) return;
      setHasProfile(!!profile?.name);
      setIsBootstrapping(false);
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!hasProfile && pathname !== '/welcome') {
      router.replace('/welcome');
      return;
    }

    if (hasProfile && pathname === '/welcome') {
      router.replace('/(tabs)');
    }
  }, [hasProfile, isBootstrapping, pathname, router]);

  return (
    <GestureHandlerRootView className="flex-1 bg-gray-50 dark:bg-gray-950">
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <AuthContext.Provider value={{ markProfileReady }}>
        <DatabaseErrorBoundary>
        <Suspense
          fallback={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 12, color: '#888' }}>
                Opening database…
              </Text>
            </View>
          }
        >
          <SQLiteProvider databaseName="tabtracker.db" onInit={migrateDbIfNeeded} useSuspense>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              {isBootstrapping ? (
                <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
                  <Text className="text-gray-500 dark:text-gray-400">Loading TabTracker...</Text>
                </View>
              ) : (
                <SheetProvider>
                  <Stack
                // @ts-ignore
                detachInactiveScreens={false}
                screenOptions={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  animation: 'slide_from_right',
                  fullScreenGestureEnabled: true,
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                  presentation: 'card',
                }}
              >
                <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" />
                <Stack.Screen name="add-customer" />
                <Stack.Screen name="add-lend" />
                <Stack.Screen name="select-customer" />
                <Stack.Screen name="customer/[id]" />
              </Stack>
              </SheetProvider>
              )}
              <StatusBar style="auto" />
            </ThemeProvider>
          </SQLiteProvider>
        </Suspense>
        </DatabaseErrorBoundary>
      </AuthContext.Provider>
    </View>
    </GestureHandlerRootView>
  );
}
