import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const THEME_PREFERENCE_STORAGE_KEY = "theme_preference";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => Promise<void>;
  isLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    systemColorScheme === "dark" ? "dark" : "light",
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
      .then((storedValue) => {
        if (!isMounted) return;
        if (
          storedValue === "system" ||
          storedValue === "light" ||
          storedValue === "dark"
        ) {
          setPreferenceState(storedValue);
          setResolvedTheme(
            storedValue === "system"
              ? systemColorScheme === "dark"
                ? "dark"
                : "light"
              : storedValue,
          );
        } else {
          setResolvedTheme(systemColorScheme === "dark" ? "dark" : "light");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, nextPreference);
  }, []);

  const nextResolvedTheme: ResolvedTheme =
    preference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  useLayoutEffect(() => {
    if (!isLoaded) {
      return;
    }

    setResolvedTheme(nextResolvedTheme);
  }, [isLoaded, nextResolvedTheme]);

  useLayoutEffect(() => {
    colorScheme.set(resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      isLoaded,
    }),
    [isLoaded, preference, resolvedTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  const systemColorScheme = useSystemColorScheme();

  if (context) {
    return context;
  }

  return {
    preference: "system" as ThemePreference,
    resolvedTheme:
      systemColorScheme === "dark"
        ? ("dark" as ResolvedTheme)
        : ("light" as ResolvedTheme),
    setPreference: async () => {},
    isLoaded: true,
  };
}
