import React from 'react';
<<<<<<< HEAD
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
=======
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
import type { Edge } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
<<<<<<< HEAD
  scrollable?: boolean;
  centerContent?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  scrollViewRef?: React.RefObject<any>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  keyboardOffset?: number;
}

/**
 * Robust screen container with sticky header, fixed footer, and keyboard-aware content.
=======
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
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
 */
export default function ScreenContainer({
  children,
  scrollable = true,
  centerContent = false,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
<<<<<<< HEAD
  scrollViewRef,
  header,
  footer,
}: ScreenContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={edges}>
      {/* 1. STICKY HEADER */}
      {header && <View className="z-50 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">{header}</View>}
      
      <View style={styles.flex}>
        {scrollable ? (
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              centerContent && styles.center,
              // Add padding equal to footer height (80) + small gap (20) so content isn't covered
              { paddingBottom: footer ? 100 : 20 },
              contentContainerStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            // Clears the footer being fixed at the bottom
            extraHeight={140}
            extraScrollHeight={20}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <Pressable onPress={Keyboard.dismiss} style={styles.flex} accessible={false}>
              {children}
            </Pressable>
          </KeyboardAwareScrollView>
        ) : (
          <View style={styles.flex}>{children}</View>
        )}

        {/* 2. FOOTER that follows keyboard */}
        {footer && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.footerContainer}
          >
            <View className="bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 z-10 w-full">
              {footer}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
=======
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
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { justifyContent: 'center' },
<<<<<<< HEAD
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
=======
>>>>>>> 6b90a6326142de73cba4ff628f5373ae566089a0
});
