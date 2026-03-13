import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import QuizCard from '../../src/components/learning/QuizCard';
import type { Quiz } from '../../src/types/quiz';

type QuizFilter = 'all' | 'fill_blank' | 'listening' | 'matching';

const quizFilters: { key: QuizFilter; label: string; icon: string }[] = [
  { key: 'all', label: '전체', icon: 'grid' },
  { key: 'fill_blank', label: '빈칸', icon: 'create' },
  { key: 'listening', label: '듣기', icon: 'headset' },
  { key: 'matching', label: '배열', icon: 'swap-horizontal' },
];

const mockQuizzes: Quiz[] = [
  {
    id: '1', videoId: 'v1', type: 'fill_blank',
    question: 'She ___ to the store every morning.',
    options: ['goes', 'go', 'going', 'gone'],
    correctAnswer: 'goes',
    explanation: '3인칭 단수 현재시제에서는 동사에 -es를 붙입니다.',
    difficulty: 'beginner', createdAt: '2026-03-08T00:00:00Z',
  },
  {
    id: '2', videoId: 'v1', type: 'multiple_choice',
    question: '"Accomplish"의 뜻으로 가장 알맞은 것은?',
    options: ['성취하다', '포기하다', '시작하다', '반복하다'],
    correctAnswer: '성취하다',
    explanation: 'accomplish는 "성취하다, 달성하다"라는 뜻입니다.',
    difficulty: 'intermediate', createdAt: '2026-03-08T00:00:00Z',
  },
  {
    id: '3', videoId: 'v2', type: 'listening',
    question: '들려주는 문장에서 빈칸에 들어갈 단어는?',
    options: ['important', 'impossible', 'impressive', 'immediate'],
    correctAnswer: 'important',
    explanation: '"The most important thing is to practice regularly."',
    difficulty: 'beginner', createdAt: '2026-03-07T00:00:00Z',
  },
  {
    id: '4', videoId: 'v3', type: 'fill_blank',
    question: 'He was ___ to accept the offer.',
    options: ['reluctant', 'relevant', 'resilient', 'redundant'],
    correctAnswer: 'reluctant',
    explanation: 'reluctant는 "꺼리는, 마지못해 하는"이라는 뜻입니다.',
    difficulty: 'advanced', createdAt: '2026-03-07T00:00:00Z',
  },
];

const recentResults = [
  { date: '오늘', total: 10, correct: 8 },
  { date: '어제', total: 15, correct: 12 },
  { date: '3월 6일', total: 8, correct: 7 },
];

export default function QuizScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<QuizFilter>('all');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isQuizActive, setIsQuizActive] = useState(false);

  const filteredQuizzes = selectedFilter === 'all'
    ? mockQuizzes
    : mockQuizzes.filter(q => q.type === selectedFilter);

  const todayQuizCount = mockQuizzes.length;

  const handleStartQuiz = () => {
    setIsQuizActive(true);
    setQuizIndex(0);
    setScore(0);
    setActiveQuiz(filteredQuizzes[0] || null);
  };

  const handleAnswer = (answer: string) => {
    const current = filteredQuizzes[quizIndex];
    if (current && answer === current.correctAnswer) {
      setScore(prev => prev + 1);
    }

    const nextIndex = quizIndex + 1;
    if (nextIndex < filteredQuizzes.length) {
      setTimeout(() => {
        setQuizIndex(nextIndex);
        setActiveQuiz(filteredQuizzes[nextIndex]);
      }, 1600);
    } else {
      setTimeout(() => {
        setIsQuizActive(false);
        setActiveQuiz(null);
      }, 1600);
    }
  };

  // Active quiz mode
  if (isQuizActive && activeQuiz) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity onPress={() => setIsQuizActive(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text className="text-white font-semibold">{quizIndex + 1} / {filteredQuizzes.length}</Text>
            <Text className="text-primary font-bold">{score}점</Text>
          </View>
          {/* Progress bar */}
          <View className="h-1.5 bg-dark-card rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${((quizIndex + 1) / filteredQuizzes.length) * 100}%` }}
            />
          </View>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          <QuizCard quiz={activeQuiz} onAnswer={handleAnswer} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-white text-2xl font-bold">퀴즈</Text>
          <Text className="text-gray-500 text-sm mt-1">오늘의 퀴즈를 풀어보세요</Text>
        </View>

        {/* Today's quiz section */}
        <View className="px-5 mb-5">
          <Card className="p-5">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="bg-primary/20 p-3 rounded-xl">
                <Ionicons name="game-controller" size={28} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">오늘의 퀴즈</Text>
                <Text className="text-gray-400 text-sm">{todayQuizCount}문제 준비됨</Text>
              </View>
            </View>

            {/* Quiz type badges */}
            <View className="flex-row gap-2 mb-4">
              <Badge label="빈칸 채우기" color="primary" size="sm" />
              <Badge label="듣기" color="warning" size="sm" />
              <Badge label="객관식" color="success" size="sm" />
            </View>

            <Button title="퀴즈 시작" onPress={handleStartQuiz} variant="primary" />
          </Card>
        </View>

        {/* Quiz type filter */}
        <View className="px-5 mb-4">
          <Text className="text-white font-bold text-base mb-3">유형별 퀴즈</Text>
          <View className="flex-row gap-2">
            {quizFilters.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setSelectedFilter(f.key)}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl ${selectedFilter === f.key ? 'bg-primary' : 'bg-dark-card border border-dark-border'}`}
              >
                <Ionicons name={f.icon as any} size={14} color={selectedFilter === f.key ? '#ffffff' : '#64748b'} />
                <Text className={`text-xs font-medium ${selectedFilter === f.key ? 'text-white' : 'text-gray-400'}`}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quiz list preview */}
        <View className="px-5 mb-5">
          {filteredQuizzes.slice(0, 3).map((quiz) => {
            const diffBadge: Record<string, { label: string; color: 'success' | 'warning' | 'danger' }> = {
              beginner: { label: '초급', color: 'success' },
              intermediate: { label: '중급', color: 'warning' },
              advanced: { label: '고급', color: 'danger' },
            };
            const db = diffBadge[quiz.difficulty];
            return (
              <Card key={quiz.id} className="mb-2 p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-white text-sm" numberOfLines={1}>{quiz.question}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Badge label={db.label} color={db.color} size="sm" />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#64748b" />
                </View>
              </Card>
            );
          })}
        </View>

        {/* Recent results */}
        <View className="px-5">
          <Text className="text-white font-bold text-base mb-3">최근 결과</Text>
          {recentResults.map((result, i) => (
            <Card key={i} className="mb-2 p-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="bg-dark-bg w-10 h-10 rounded-xl items-center justify-center">
                    <Ionicons name="checkmark-done" size={18} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-white text-sm font-semibold">{result.date}</Text>
                    <Text className="text-gray-500 text-xs">{result.total}문제 중 {result.correct}개 정답</Text>
                  </View>
                </View>
                <Text className="text-primary font-bold text-lg">{Math.round((result.correct / result.total) * 100)}%</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
