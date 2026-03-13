import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const ageGroups = [
  { id: '1y', label: '1세', emoji: '🍼', desc: '동요, 색상, 소리' },
  { id: '3y', label: '3세', emoji: '🧸', desc: '짧은 만화, 따라하기' },
  { id: '6y', label: '6세', emoji: '📚', desc: '교육 만화, 간단한 퀴즈' },
];

export default function AgeGroupScreen() {
  const router = useRouter();

  const selectAge = (ageId: string) => {
    // TODO: save to store
    router.replace('/(tabs)/home');
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-dark-bg">
      <Text className="text-2xl font-bold text-white mb-2">연령 선택</Text>
      <Text className="text-sm text-gray-400 mb-10">아이의 나이에 맞는 콘텐츠를 제공해요</Text>

      {ageGroups.map((ag) => (
        <TouchableOpacity key={ag.id} onPress={() => selectAge(ag.id)} className="bg-dark-card border border-warning/30 rounded-2xl p-5 w-full mb-3 flex-row items-center">
          <Text className="text-3xl mr-4">{ag.emoji}</Text>
          <View>
            <Text className="text-lg font-bold text-white">{ag.label}</Text>
            <Text className="text-sm text-gray-400">{ag.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
