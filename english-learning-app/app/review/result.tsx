import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import ProgressRing from '../../src/components/learning/ProgressRing';

export default function ReviewResultScreen() {
  const router = useRouter();
  const { total: totalStr, correct: correctStr } = useLocalSearchParams<{ total: string; correct: string }>();

  const total = parseInt(totalStr || '0', 10);
  const correct = parseInt(correctStr || '0', 10);
  const rate = total > 0 ? correct / total : 0;

  const getMessage = () => {
    if (rate >= 0.9) return '훌륭합니다!';
    if (rate >= 0.7) return '잘하고 있어요!';
    if (rate >= 0.5) return '조금 더 연습해봐요!';
    return '꾸준히 복습하면 나아질 거예요!';
  };

  const getEmoji = () => {
    if (rate >= 0.9) return 'trophy';
    if (rate >= 0.7) return 'thumbs-up';
    if (rate >= 0.5) return 'fitness';
    return 'heart';
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      <View className="flex-1 px-5 pt-10">
        {/* Title */}
        <View className="items-center mb-8">
          <View className="bg-primary/20 w-16 h-16 rounded-full items-center justify-center mb-4">
            <Ionicons name={getEmoji() as any} size={32} color="#3b82f6" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">복습 결과</Text>
          <Text className="text-gray-400 text-base">{getMessage()}</Text>
        </View>

        {/* Progress ring */}
        <View className="items-center mb-8">
          <ProgressRing
            progress={rate}
            size={120}
            strokeWidth={10}
            color={rate >= 0.7 ? '#10b981' : rate >= 0.5 ? '#f59e0b' : '#ef4444'}
            label="정답률"
          />
        </View>

        {/* Stats cards */}
        <View className="flex-row gap-3 mb-8">
          <Card className="flex-1 p-4 items-center">
            <Ionicons name="documents" size={24} color="#3b82f6" />
            <Text className="text-white text-2xl font-bold mt-2">{total}</Text>
            <Text className="text-gray-500 text-xs mt-1">총 복습</Text>
          </Card>
          <Card className="flex-1 p-4 items-center">
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text className="text-white text-2xl font-bold mt-2">{correct}</Text>
            <Text className="text-gray-500 text-xs mt-1">정답</Text>
          </Card>
          <Card className="flex-1 p-4 items-center">
            <Ionicons name="close-circle" size={24} color="#ef4444" />
            <Text className="text-white text-2xl font-bold mt-2">{total - correct}</Text>
            <Text className="text-gray-500 text-xs mt-1">오답</Text>
          </Card>
        </View>

        {/* Buttons */}
        <View className="gap-3">
          <Button
            title="다시 복습"
            onPress={() => router.replace('/review/flashcard')}
            variant="primary"
          />
          <Button
            title="홈으로"
            onPress={() => router.replace('/(tabs)/home')}
            variant="outline"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
