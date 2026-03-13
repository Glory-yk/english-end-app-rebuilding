import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as authService from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleRegister = async () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await authService.register(email, password);
      setTokens(result.accessToken, result.refreshToken);
      router.replace('/(onboarding)/profile-select');
    } catch (e: any) {
      const msg = e?.response?.data?.message || '회원가입에 실패했습니다';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      <View className="flex-1 justify-center px-6 bg-dark-bg">
        <Text className="text-3xl font-bold text-white text-center mb-2">회원가입</Text>
        <Text className="text-sm text-gray-400 text-center mb-10">영어 학습을 시작해보세요</Text>

        <View className="mb-4">
          <Text className="text-gray-300 mb-2 text-sm">이메일</Text>
          <TextInput className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white" placeholder="email@example.com" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View className="mb-4">
          <Text className="text-gray-300 mb-2 text-sm">비밀번호</Text>
          <TextInput className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white" placeholder="8자 이상" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <View className="mb-6">
          <Text className="text-gray-300 mb-2 text-sm">비밀번호 확인</Text>
          <TextInput className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white" placeholder="비밀번호 재입력" placeholderTextColor="#64748b" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        </View>

        {error ? (
          <Text className="text-red-400 text-center mb-4 text-sm">{error}</Text>
        ) : null}

        <TouchableOpacity onPress={handleRegister} disabled={loading} className="bg-primary rounded-xl py-4 mb-4" style={{ opacity: loading ? 0.6 : 1 }}>
          <Text className="text-white text-center font-bold text-base">{loading ? '가입 중...' : '가입하기'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} className="py-2">
          <Text className="text-gray-400 text-center">← 로그인으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
