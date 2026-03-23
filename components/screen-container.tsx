import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  centerContent?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  scrollViewRef?: React.RefObject<any>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  extraHeight?: number;
}

/**
 * Robust screen container with sticky header, fixed footer, and keyboard-aware content.
 */
export default function ScreenContainer({
  children,
  scrollable = true,
  centerContent = false,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  scrollViewRef,
  header,
  footer,
  extraHeight = 140,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView 
      className="flex-1 bg-gray-50 dark:bg-gray-950" 
      edges={footer ? edges.filter(e => e !== 'bottom') : edges}
    >
      {/* 1. STICKY HEADER stays at the top */}
      {header && <View className="z-50 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">{header}</View>}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.flex}>
          {scrollable ? (
            <KeyboardAwareScrollView
              ref={scrollViewRef}
              style={styles.flex}
              contentContainerStyle={[
                styles.scrollContent,
                centerContent && styles.center,
                // Add enough padding to clear the footer (approx 80-100px + safe area)
                { paddingBottom: footer ? 110 + insets.bottom : 30 + insets.bottom },
                contentContainerStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              enableOnAndroid={true} // Enable for better Android handling
              enableAutomaticScroll={true}
              extraHeight={extraHeight}
              extraScrollHeight={0}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <Pressable onPress={Keyboard.dismiss} style={styles.flex} accessible={false}>
                {children}
              </Pressable>
            </KeyboardAwareScrollView>
          ) : (
            <View style={[styles.flex, centerContent && styles.center, contentContainerStyle]}>{children}</View>
          )}
        </View>

        {/* 2. FOOTER that follows keyboard and stays above it */}
        {footer && (
          <View 
            className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 z-10 w-full shadow-[0_-4px_10px_rgba(0,0,0,0.03)]"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { justifyContent: 'center' },
});
