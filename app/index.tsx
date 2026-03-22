import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getUserProfile } from '@/services/user-profile';

/**
 * Entry point. Checks if a user profile exists and redirects accordingly.
 * Runs INSIDE the Stack navigator so Redirect always has a navigation context.
 */
export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    getUserProfile().then((profile) => {
      setHasProfile(!!profile?.name);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color="#0ea5e9" />
      </View>
    );
  }

  if (hasProfile) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}
