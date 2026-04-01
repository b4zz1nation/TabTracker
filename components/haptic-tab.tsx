import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function HapticTab(props: BottomTabBarButtonProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const isFocused = Boolean(props.accessibilityState?.selected);
  const activeAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(activeAnim, {
      toValue: isFocused ? 1 : 0,
      damping: 28,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [activeAnim, isFocused]);

  const activeOpacity = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });
  const activeScale = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <PlatformPressable
      {...props}
      style={[
        props.style,
        {
          overflow: "hidden",
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          alignSelf: "center",
          width: 56,
          height: 56,
          top: "50%",
          marginTop: -28,
          borderRadius: 14,
          backgroundColor: themeColors.tint,
          opacity: activeOpacity,
          transform: [{ scale: activeScale }],
          zIndex: 0,
        }}
      />
      <View
        style={{
          flex: 1,
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        {props.children}
      </View>
    </PlatformPressable>
  );
}
