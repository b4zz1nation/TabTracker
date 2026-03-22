import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveUserProfile } from '@/services/user-profile';

const { width } = Dimensions.get('window');
const TOTAL_SLIDES = 4;

/* ─────────────────────────────────────────
   Individual slides — plain components,
   no hooks, no navigation, no router refs.
───────────────────────────────────────── */

const LogoSlide = React.memo(() => (
  <View style={styles.slide} className="px-8 justify-center items-center">
    <View className="w-32 h-32 bg-sky-100 dark:bg-sky-900/30 rounded-[48px] items-center justify-center mb-10 shadow-sm">
      <Ionicons name="layers" size={64} color="#0ea5e9" />
    </View>
    <Text className="text-6xl font-black text-gray-900 dark:text-gray-100 tracking-tighter text-center">
      TabTracker
    </Text>
    <Text className="mt-4 text-lg text-gray-400 dark:text-gray-500 font-medium text-center px-10">
      Simplifying shared expenses.
    </Text>
  </View>
));

const FeaturesSlide = React.memo(() => (
  <View style={styles.slide} className="px-8 justify-center">
    <View className="items-center mb-12">
      <View className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-[32px] items-center justify-center mb-6">
        <Ionicons name="flash" size={40} color="#10b981" />
      </View>
      <Text className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tighter text-center px-4">
        Core Features
      </Text>
      <Text className="mt-2 text-gray-400 dark:text-gray-500 font-medium">What makes us special.</Text>
    </View>
    <View className="gap-6">
      <View className="flex-row items-center bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
        <View className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-900/20 items-center justify-center mr-4">
          <Ionicons name="trending-up" size={32} color="#0ea5e9" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Smart Interest</Text>
          <Text className="text-sm text-gray-400 dark:text-gray-500 leading-tight">
            Daily, Monthly, or Yearly. Real-time accumulation.
          </Text>
        </View>
      </View>
      <View className="flex-row items-center bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
        <View className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-900/20 items-center justify-center mr-4">
          <Ionicons name="people" size={32} color="#8b5cf6" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">Customer Profiles</Text>
          <Text className="text-sm text-gray-400 dark:text-gray-500 leading-tight">
            Track multiple lends for every person in one place.
          </Text>
        </View>
      </View>
    </View>
  </View>
));

const TILES = [
  { icon: 'home', label: 'Home', desc: 'Active tabs', color: '#0ea5e9' },
  { icon: 'notifications', label: 'Alerts', desc: 'Updates', color: '#f59e0b' },
  { icon: 'add-circle', label: 'Quick Add', desc: 'New entry', color: '#10b981' },
  { icon: 'journal', label: 'Logs', desc: 'History', color: '#8b5cf6' },
];

const TutorialSlide = React.memo(() => (
  <View style={styles.slide} className="px-8 justify-center">
    <Text className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tighter text-center mb-4">
      Navigations
    </Text>
    <Text className="mt-2 text-gray-400 dark:text-gray-500 font-medium text-center mb-10">
      Everything you need, at your fingertips.
    </Text>
    <View className="flex-row flex-wrap justify-between gap-4">
      {TILES.map((t, i) => (
        <View
          key={i}
          className="w-[47%] bg-white dark:bg-gray-900 p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm items-center"
        >
          <View
            style={{ backgroundColor: t.color + '20' }}
            className="w-16 h-16 rounded-3xl items-center justify-center mb-3"
          >
            <Ionicons name={t.icon as any} size={32} color={t.color} />
          </View>
          <Text className="text-base font-black text-gray-900 dark:text-gray-100 mb-1">{t.label}</Text>
          <Text className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-bold px-1">
            {t.desc}
          </Text>
        </View>
      ))}
    </View>
  </View>
));

/* ─────────────────────────────────────────
   Name slide — self-contained, no router
   at render time. Navigation only happens
   inside the async handler on button press.
───────────────────────────────────────── */
interface NameSlideProps {
  onDone: () => void;
}

const NameSlide = React.memo(({ onDone }: NameSlideProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const wrapperRef = useRef<View>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // Only shift if we're focused and on the last slide
        if (isFocused) {
          Animated.timing(keyboardOffset, {
            toValue: -200, // Shift entire slide content up as one block
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isFocused]);

  const handleComplete = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    try {
      setIsSaving(true);
      await saveUserProfile(trimmed);
      // Signal parent to handle navigation — keeps all nav code out of this component
      onDone();
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Try again.');
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.slide} className="px-10 justify-center">
      <Animated.View
        ref={wrapperRef}
        style={{ transform: [{ translateY: keyboardOffset }] }}
      >
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-sky-100 dark:bg-sky-900/40 rounded-[40px] items-center justify-center mb-6 shadow-sm">
            <Ionicons name="person" size={48} color="#0ea5e9" />
          </View>
          <Text className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tighter text-center">
            Lastly, your name.
          </Text>
          <Text className="mt-4 text-base text-gray-400 dark:text-gray-500 font-medium text-center">
            To simplify things, we just need a name.
          </Text>
        </View>

        <TextInput
          style={[styles.nameInput, !name && { fontStyle: 'italic' }]}
          className={`text-xl text-gray-900 dark:text-gray-100 text-center ${isFocused ? 'bg-sky-50 dark:bg-sky-900/40' : 'bg-gray-100 dark:bg-gray-800/40'
            }`}
          placeholder="Name"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
          returnKeyType="done"
          value={name}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={(text) => {
            setName(text);
            if (error) setError('');
          }}
          onSubmitEditing={handleComplete}
        />

        {!!error && (
          <Text className="text-[10px] text-rose-500 font-black uppercase italic mt-4 text-center">
            {error}
          </Text>
        )}

        <View className="mt-6">
          <Pressable
            style={styles.confirmButton}
            className={
              isSaving || !name.trim()
                ? 'bg-gray-100 dark:bg-gray-800/50'
                : 'bg-sky-500 active:opacity-90'
            }
            onPress={handleComplete}
            disabled={isSaving || !name.trim()}
          >
            <Text
              className={`text-xl font-black tracking-wide ${!name.trim() ? 'text-gray-300' : 'text-white'
                }`}
            >
              {isSaving ? 'Finishing...' : 'Confirm & Start'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
});

/* ─────────────────────────────────────────
   Main onboarding screen
───────────────────────────────────────── */
export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [showNextButton, setShowNextButton] = useState(false);
  const nextButtonOpacity = useRef(new Animated.Value(0)).current;

  // 2-second delay on first slide before showing the Next button
  useEffect(() => {
    if (activeIndex === 0) {
      setShowNextButton(false);
      nextButtonOpacity.setValue(0);
      const t = setTimeout(() => {
        setShowNextButton(true);
        Animated.timing(nextButtonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 2000);
      return () => clearTimeout(t);
    }
    setShowNextButton(true);
    nextButtonOpacity.setValue(1);
  }, [activeIndex]);

  const goTo = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (activeIndex < TOTAL_SLIDES - 1) goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  // Called by NameSlide when save is complete — navigation happens here
  // where the navigation context is guaranteed to be alive.
  const handleDone = useCallback(async () => {
    // Dynamically import router so it's never touched at render time
    const { router } = await import('expo-router');
    router.replace('/(tabs)');
  }, []);

  return (
    <SafeAreaView style={styles.container} className="bg-gray-50 dark:bg-gray-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Slides rendered once, never remounted */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            {
              useNativeDriver: false,
              listener: (e: any) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                if (idx !== activeIndex) setActiveIndex(idx);
              },
            }
          )}
          style={styles.flex}
        >
          <LogoSlide />
          <FeaturesSlide />
          <TutorialSlide />
          <NameSlide onDone={handleDone} />
        </Animated.ScrollView>

        {/* Footer: dots + next button */}
        <View style={styles.footer}>
          {/* Progress dots */}
          <View style={styles.dots}>
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => {
              const dotOpacity = scrollX.interpolate({
                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              const dotWidth = scrollX.interpolate({
                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                outputRange: [8, 24, 8],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { opacity: dotOpacity, width: dotWidth }]}
                />
              );
            })}
          </View>

          {/* Next button — hidden on last slide */}
          {activeIndex < TOTAL_SLIDES - 1 && showNextButton && (
            <Animated.View style={{ opacity: nextButtonOpacity, width: '100%' }}>
              <Pressable style={styles.nextButton} onPress={handleNext} className="active:opacity-80">
                <Text className="text-white text-lg font-black mr-2">Next Step</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </Pressable>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  slide: { width, flex: 1 },
  nameInput: {
    height: 64,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  confirmButton: { height: 80, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 40, paddingBottom: 48, alignItems: 'center' },
  dots: { flexDirection: 'row', marginBottom: 32 },
  dot: { height: 6, borderRadius: 3, backgroundColor: '#0ea5e9', marginRight: 8 },
  nextButton: {
    width: '100%',
    height: 64,
    backgroundColor: '#0ea5e9',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
