import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function AddTabPlaceholder() {
  const router = useRouter();

  // If the listener fails, we just show a placeholder
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Text style={{ color: '#888' }}>Quick Action Redirecting...</Text>
    </View>
  );
}
