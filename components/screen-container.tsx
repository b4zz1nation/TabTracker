import React, { useEffect, useState } from "react";
import {
  Animated,
  Keyboard,
  Pressable,
  Platform,
  StyleSheet,
  View,
  LayoutChangeEvent,
  ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import type { Edge } from "react-native-safe-area-context";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  centerContent?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  scrollViewRef?: React.RefObject<any>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  footerContainerStyle?: ViewStyle | any;
  extraHeight?: number;
}

/**
 * Robust screen container with sticky header, fixed footer, and keyboard-aware content.
 */
export default function ScreenContainer({
  children,
  scrollable = true,
  centerContent = false,
  edges = ["top", "left", "right"],
  contentContainerStyle,
  scrollViewRef,
  header,
  footer,
  footerContainerStyle,
  extraHeight = 140,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const footerSpacing = footer
    ? keyboardVisible
      ? 16
      : footerHeight + 16
    : 30 + insets.bottom;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleFooterLayout = (event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={footer ? edges.filter((e) => e !== "bottom") : edges}
    >
      {/* 1. STICKY HEADER stays at the top */}
      {header && (
        <View className="z-50 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
          {header}
        </View>
      )}

      <View style={styles.flex}>
        {scrollable ? (
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              centerContent && styles.center,
              {
                paddingBottom: footerSpacing,
              },
              contentContainerStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraHeight={extraHeight}
            extraScrollHeight={
              footer && !keyboardVisible ? footerHeight + 16 : 0
            }
            enableResetScrollToCoords={false}
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <Pressable
              onPress={Keyboard.dismiss}
              style={styles.content}
              accessible={false}
            >
              {children}
            </Pressable>
          </KeyboardAwareScrollView>
        ) : (
          <View
            style={[
              styles.flex,
              centerContent && styles.center,
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        )}
      </View>

      {footer && (
        <Animated.View
          onLayout={handleFooterLayout}
          className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 z-10 w-full shadow-[0_-4px_10px_rgba(0,0,0,0.03)]"
          style={[
            { paddingBottom: Math.max(insets.bottom, 12) },
            footerContainerStyle,
          ]}
        >
          {footer}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  center: { justifyContent: "center" },
  content: { minHeight: "100%" },
});
