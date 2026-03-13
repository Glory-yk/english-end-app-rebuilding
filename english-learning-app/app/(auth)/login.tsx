import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useGoogleLogin } from '../../src/services/googleAuth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const { promptAsync, isLoading: googleLoading } = useGoogleLogin(
    async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      if (tokens.user) {
        setUser({
          id: tokens.user.id,
          email: tokens.user.email || '',
          name: tokens.user.name,
          provider: 'google',
          hasYouTubeAccess: tokens.user.hasYouTubeAccess ?? true,
        });
      }
      router.replace('/(tabs)/home' as any);
    },
    (errorMsg) => {
      setError(errorMsg);
    },
  );

  const handleLogin = async () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await authService.login(email, password);
      setTokens(result.accessToken, result.refreshToken);
      try {
        const me = await authService.getMe();
        setUser({
          id: me.id,
          email: me.email,
          provider: 'email',
          hasYouTubeAccess: false,
        });
      } catch {
        // continue even if getMe fails
      }
      router.replace('/(tabs)/home' as any);
    } catch (e: any) {
      const msg = e?.response?.data?.message || '로그인에 실패했습니다';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      <View className="flex-1 justify-center px-6 bg-dark-bg">
        <Text className="text-3xl font-bold text-white text-center mb-2">English Learning</Text>
        <Text className="text-sm text-gray-400 text-center mb-10">YouTube 기반 영어 학습 앱</Text>

        <View className="mb-4">
          <Text className="text-gray-300 mb-2 text-sm">이메일</Text>
          <TextInput
            className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
            placeholder="email@example.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-300 mb-2 text-sm">비밀번호</Text>
          <TextInput
            className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white"
            placeholder="비밀번호 입력"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error ? (
          <Text className="text-red-400 text-center mb-4 text-sm">{error}</Text>
        ) : null}

        <TouchableOpacity onPress={handleLogin} disabled={loading} className="bg-primary rounded-xl py-4 mb-4" style={{ opacity: loading ? 0.6 : 1 }}>
          <Text className="text-white text-center font-bold text-base">{loading ? '로그인 중...' : '로그인'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => promptAsync()}
          disabled={googleLoading}
          className="bg-white rounded-xl py-4 mb-4 flex-row items-center justify-center"
          style={{ opacity: googleLoading ? 0.6 : 1 }}
        >
          <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 8 }} />
          <Text className="text-gray-800 text-center font-bold text-base">
            {googleLoading ? 'Google 로그인 중...' : 'Google로 시작하기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home' as any)}
          className="bg-dark-card border border-dark-border rounded-xl py-4 mb-4"
        >
          <Text className="text-gray-300 text-center font-bold text-base">게스트로 둘러보기</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-4">
          <Text className="text-gray-400">계정이 없으신가요? </Text>
          <Link href="/(auth)/register" className="text-primary font-bold">회원가입</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
