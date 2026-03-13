import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const levels = [
  { id: 'beginner', label: '초급 (Beginner)', desc: '기초 단어와 간단한 문장', color: 'border-success/30' },
  { id: 'intermediate', label: '중급 (Intermediate)', desc: '일상 회화와 뉴스 이해', color: 'border-warning/30' },
  { id: 'advanced', label: '고급 (Advanced)', desc: '원어민 수준 이해', color: 'border-danger/30' },
];

export default function LevelTestScreen() {
  const router = useRouter();

  const selectLevel = (levelId: string) => {
    // TODO: save to store
    router.replace('/(tabs)/home');
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-dark-bg">
      <Text className="text-2xl font-bold text-white mb-2">영어 레벨 선택</Text>
      <Text className="text-sm text-gray-400 mb-10">현재 영어 수준을 선택해주세요</Text>

      {levels.map((lv) => (
        <TouchableOpacity key={lv.id} onPress={() => selectLevel(lv.id)} className={`bg-dark-card border ${lv.color} rounded-2xl p-5 w-full mb-3`}>
          <Text className="text-lg font-bold text-white">{lv.label}</Text>
          <Text className="text-sm text-gray-400 mt-1">{lv.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
