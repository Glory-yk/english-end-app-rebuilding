import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FlashCard from '../../src/components/learning/FlashCard';
import Button from '../../src/components/ui/Button';

interface ReviewWord {
  id: string;
  word: string;
  pronunciation: string;
  meaning: string;
  exampleEn: string;
  exampleKo: string;
}

const mockReviewQueue: ReviewWord[] = [
  { id: '1', word: 'accomplish', pronunciation: '/əˈkɑːmplɪʃ/', meaning: '성취하다, 달성하다', exampleEn: 'She accomplished her goal.', exampleKo: '그녀는 목표를 달성했다.' },
  { id: '2', word: 'elaborate', pronunciation: '/ɪˈlæbərət/', meaning: '정교한, 상세히 설명하다', exampleEn: 'Could you elaborate on that?', exampleKo: '그것에 대해 자세히 설명해주시겠어요?' },
  { id: '3', word: 'determine', pronunciation: '/dɪˈtɜːrmɪn/', meaning: '결정하다, 결심하다', exampleEn: 'We need to determine the cause.', exampleKo: '우리는 원인을 규명해야 합니다.' },
  { id: '4', word: 'reluctant', pronunciation: '/rɪˈlʌktənt/', meaning: '꺼리는, 마지못해 하는', exampleEn: 'He was reluctant to leave.', exampleKo: '그는 떠나기를 꺼려했다.' },
  { id: '5', word: 'significant', pronunciation: '/sɪɡˈnɪfɪkənt/', meaning: '중요한, 상당한', exampleEn: 'This is a significant improvement.', exampleKo: '이것은 상당한 개선이다.' },
];

type GradeButton = { key: string; label: string; bgColor: string; textColor: string };

const gradeButtons: GradeButton[] = [
  { key: 'again', label: '모름', bgColor: 'bg-danger/20', textColor: 'text-danger' },
  { key: 'hard', label: '어려움', bgColor: 'bg-warning/20', textColor: 'text-warning' },
  { key: 'good', label: '보통', bgColor: 'bg-primary/20', textColor: 'text-primary' },
  { key: 'easy', label: '쉬움', bgColor: 'bg-success/20', textColor: 'text-success' },
];

export default function FlashcardReviewScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<{ wordId: string; grade: string }[]>([]);
  const total = mockReviewQueue.length;
  const isFinished = currentIndex >= total;

  const handleGrade = useCallback((grade: string) => {
    setResults(prev => [...prev, { wordId: mockReviewQueue[currentIndex].id, grade }]);
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const currentWord = !isFinished ? mockReviewQueue[currentIndex] : null;
  const progress = total > 0 ? (currentIndex / total) : 0;

  if (isFinished) {
    const correctCount = results.filter(r => r.grade !== 'again').length;
    return (
      <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-success/20 w-20 h-20 rounded-full items-center justify-center mb-6">
            <Ionicons name="checkmark-done" size={40} color="#10b981" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">복습 완료!</Text>
          <Text className="text-gray-400 text-base text-center mb-2">
            총 {total}개 단어를 복습했습니다
          </Text>
          <Text className="text-primary text-lg font-semibold mb-8">
            정답률 {Math.round((correctCount / total) * 100)}%
          </Text>

          <View className="w-full gap-3">
            <Button
              title="결과 보기"
              onPress={() => router.push({
                pathname: '/review/result',
                params: { total: total.toString(), correct: correctCount.toString() },
              })}
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

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-white font-semibold">{currentIndex + 1} / {total}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress bar */}
        <View className="h-1.5 bg-dark-card rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
      </View>

      {/* Flashcard */}
      <View className="flex-1 items-center justify-center">
        {currentWord && (
          <FlashCard
            word={currentWord.word}
            pronunciation={currentWord.pronunciation}
            meaning={currentWord.meaning}
            exampleEn={currentWord.exampleEn}
            exampleKo={currentWord.exampleKo}
            onSwipeLeft={() => handleGrade('again')}
            onSwipeRight={() => handleGrade('easy')}
            onSwipeUp={() => handleGrade('hard')}
          />
        )}
      </View>

      {/* Grade buttons */}
      <View className="px-5 pb-6">
        <Text className="text-gray-600 text-xs text-center mb-3">카드를 탭하여 뒤집기 | 스와이프로 평가</Text>
        <View className="flex-row gap-2">
          {gradeButtons.map(btn => (
            <TouchableOpacity
              key={btn.key}
              onPress={() => handleGrade(btn.key)}
              className={`flex-1 ${btn.bgColor} rounded-xl py-3 items-center border border-dark-border`}
              activeOpacity={0.7}
            >
              <Text className={`${btn.textColor} font-bold text-sm`}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
