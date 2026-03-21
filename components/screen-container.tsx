import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default: true). Set to false for screens with FlatList/SectionList. */
  scrollable?: boolean;
  /** Center scroll content vertically — useful for single-input screens like Welcome. */
  centerContent?: boolean;
  /** SafeAreaView edges to inset (default: ['top']). */
  edges?: Edge[];
  /** Extra padding/style for the ScrollView contentContainer. */
  contentContainerStyle?: ViewStyle;
  /** Additional offset for KeyboardAvoidingView (e.g. inside modals). */
  keyboardVerticalOffset?: number;
}

/**
 * Global screen wrapper that provides:
 * - SafeAreaView with dark/light background
 * - KeyboardAvoidingView (iOS: padding, Android: height)
 * - Pressable dismiss-keyboard on tap outside inputs
 * - Optional ScrollView with keyboardShouldPersistTaps="handled"
 *
 * Usage:
 *   <ScreenContainer>
 *     {/* your screen content *\/}
 *   </ScreenContainer>
 */
export default function ScreenContainer({
  children,
  scrollable = true,
  centerContent = false,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  keyboardVerticalOffset,
}: ScreenContainerProps) {
  const offset = keyboardVerticalOffset ?? (Platform.OS === 'ios' ? 0 : 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={edges}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={offset}
        style={styles.flex}
      >
        <Pressable onPress={Keyboard.dismiss} style={styles.flex} accessible={false}>
          {scrollable ? (
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                centerContent && styles.center,
                { paddingBottom: 80 },
                contentContainerStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { justifyContent: 'center' },
});
