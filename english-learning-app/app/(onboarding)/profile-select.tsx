import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileSelectScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 justify-center items-center px-6 bg-dark-bg">
      <Text className="text-2xl font-bold text-white mb-2">프로필 유형 선택</Text>
      <Text className="text-sm text-gray-400 mb-10">누가 사용하나요?</Text>

      <TouchableOpacity onPress={() => router.push('/(onboarding)/age-group')} className="bg-dark-card border border-primary/30 rounded-2xl p-6 w-full mb-4 items-center">
        <Text className="text-4xl mb-3">👶</Text>
        <Text className="text-lg font-bold text-white">유아 (1~6세)</Text>
        <Text className="text-sm text-gray-400 mt-1">큰 버튼, 동요, 따라하기</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(onboarding)/level-test')} className="bg-dark-card border border-secondary/30 rounded-2xl p-6 w-full items-center">
        <Text className="text-4xl mb-3">🧑‍🎓</Text>
        <Text className="text-lg font-bold text-white">성인</Text>
        <Text className="text-sm text-gray-400 mt-1">영상 학습, 단어장, 퀴즈</Text>
      </TouchableOpacity>
    </View>
  );
}
