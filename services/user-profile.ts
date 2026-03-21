import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_PROFILE_STORAGE_KEY = 'user_profile';

export interface UserProfile {
  name: string;
  createdAt: string;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (!parsed?.name || typeof parsed.name !== 'string') {
      return null;
    }

    return {
      name: parsed.name,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveUserProfile(name: string) {
  const profile: UserProfile = {
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}
