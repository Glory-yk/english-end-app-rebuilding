import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Badge from '../../src/components/ui/Badge';
import Card from '../../src/components/ui/Card';

type WordStatus = 'all' | 'learning' | 'review' | 'mastered';

interface MockWord {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string;
  status: 'learning' | 'review' | 'mastered';
  nextReviewAt: string;
}

const statusTabs: { key: WordStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'learning', label: '학습중' },
  { key: 'review', label: '복습' },
  { key: 'mastered', label: '마스터' },
];

const statusBadge: Record<string, { label: string; color: 'warning' | 'primary' | 'success' }> = {
  learning: { label: '학습중', color: 'warning' },
  review: { label: '복습', color: 'primary' },
  mastered: { label: '마스터', color: 'success' },
};

const mockWords: MockWord[] = [
  { id: '1', word: 'accomplish', meaning: '성취하다, 달성하다', pronunciation: '/əˈkɑːmplɪʃ/', status: 'learning', nextReviewAt: '2026-03-09T00:00:00Z' },
  { id: '2', word: 'elaborate', meaning: '정교한, 상세히 설명하다', pronunciation: '/ɪˈlæbərət/', status: 'review', nextReviewAt: '2026-03-08T00:00:00Z' },
  { id: '3', word: 'convenient', meaning: '편리한', pronunciation: '/kənˈviːniənt/', status: 'mastered', nextReviewAt: '2026-03-20T00:00:00Z' },
  { id: '4', word: 'determine', meaning: '결정하다, 결심하다', pronunciation: '/dɪˈtɜːrmɪn/', status: 'learning', nextReviewAt: '2026-03-08T00:00:00Z' },
  { id: '5', word: 'opportunity', meaning: '기회', pronunciation: '/ˌɑːpərˈtuːnəti/', status: 'review', nextReviewAt: '2026-03-10T00:00:00Z' },
  { id: '6', word: 'persuade', meaning: '설득하다', pronunciation: '/pərˈsweɪd/', status: 'mastered', nextReviewAt: '2026-03-25T00:00:00Z' },
  { id: '7', word: 'significant', meaning: '중요한, 상당한', pronunciation: '/sɪɡˈnɪfɪkənt/', status: 'learning', nextReviewAt: '2026-03-09T00:00:00Z' },
  { id: '8', word: 'reluctant', meaning: '꺼리는, 마지못해 하는', pronunciation: '/rɪˈlʌktənt/', status: 'review', nextReviewAt: '2026-03-08T00:00:00Z' },
];

const formatNextReview = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '오늘';
  if (diffDays === 1) return '내일';
  return `${diffDays}일 후`;
};

export default function WordsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WordStatus>('all');

  const filteredWords = activeTab === 'all'
    ? mockWords
    : mockWords.filter(w => w.status === activeTab);

  const reviewCount = mockWords.filter(w => {
    const reviewDate = new Date(w.nextReviewAt);
    return reviewDate <= new Date();
  }).length;

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold">단어장</Text>
        <Text className="text-gray-500 text-sm mt-1">총 {mockWords.length}개의 단어</Text>
      </View>

      {/* Tab filter bar */}
      <View className="flex-row px-5 gap-2 mb-3">
        {statusTabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl ${activeTab === tab.key ? 'bg-primary' : 'bg-dark-card border border-dark-border'}`}
          >
            <Text className={`text-xs font-semibold ${activeTab === tab.key ? 'text-white' : 'text-gray-400'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Word list */}
      <FlatList
        data={filteredWords}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="book-outline" size={48} color="#64748b" />
            <Text className="text-gray-500 mt-3 text-center">
              {activeTab === 'all' ? '저장된 단어가 없습니다\n영상에서 단어를 탭하여 저장해보세요' : '해당 상태의 단어가 없습니다'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = statusBadge[item.status];
          return (
            <Card className="p-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-white text-base font-bold">{item.word}</Text>
                    <Text className="text-gray-500 text-xs">{item.pronunciation}</Text>
                  </View>
                  <Text className="text-gray-300 text-sm">{item.meaning}</Text>
                  <Text className="text-gray-600 text-[10px] mt-1">
                    다음 복습: {formatNextReview(item.nextReviewAt)}
                  </Text>
                </View>
                <Badge label={badge.label} color={badge.color} size="sm" />
              </View>
            </Card>
          );
        }}
      />

      {/* FAB */}
      {reviewCount > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/review/flashcard')}
          activeOpacity={0.8}
          className="absolute bottom-6 right-5 bg-primary rounded-2xl px-6 py-4 flex-row items-center gap-2"
          style={{ shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
        >
          <Ionicons name="refresh" size={20} color="#ffffff" />
          <Text className="text-white font-bold text-sm">복습 시작 ({reviewCount})</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
