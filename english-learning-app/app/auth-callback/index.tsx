import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '../src/stores/useAuthStore';

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
    email?: string;
    name?: string;
    hasYouTubeAccess?: string;
    error?: string;
  }>();

  const { setTokens, setUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (params.error) {
      console.error('[AuthCallback] error:', params.error);
      router.replace('/(auth)/login');
      return;
    }

    if (params.accessToken && params.refreshToken) {
      setTokens(params.accessToken, params.refreshToken);
      setUser({
        id: params.userId || '',
        email: params.email || '',
        name: params.name || undefined,
        provider: 'google',
        hasYouTubeAccess: params.hasYouTubeAccess === 'true',
      });

      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [ready]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0e17' }}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={{ color: '#fff', marginTop: 16 }}>로그인 중...</Text>
    </View>
  );
}
