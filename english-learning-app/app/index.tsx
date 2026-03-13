import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login' as any);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0e17' }}>
      <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#3b82f6', marginBottom: 16 }}>🎓</Text>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>English Learning</Text>
      <Text style={{ fontSize: 14, color: '#9ca3af', marginBottom: 32 }}>YouTube 기반 영어 학습</Text>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
