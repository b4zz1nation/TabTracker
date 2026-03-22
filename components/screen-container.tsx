import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import type { Edge } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  centerContent?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  scrollViewRef?: React.RefObject<any>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
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
}: ScreenContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={edges}>
      {/* 1. STICKY HEADER stays at the top */}
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
            extraHeight={140}
            extraScrollHeight={100}
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

        {/* 2. FOOTER that follows keyboard and stays above it */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { justifyContent: 'center' },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
