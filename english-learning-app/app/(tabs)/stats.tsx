import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Card from '../../src/components/ui/Card';
import { useWatchHistoryStore } from '../../src/stores/useWatchHistoryStore';
import { useChannelStore } from '../../src/stores/useChannelStore';
import { useLearningStore } from '../../src/stores/useLearningStore';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}시간 ${rm}분` : `${h}시간`;
}

function formatMinutes(sec: number): string {
  return `${Math.round(sec / 60)}분`;
}

export default function StatsScreen() {
  const router = useRouter();
  const {
    getTodayWatchTime,
    getWeeklyWatchTimes,
    getTotalWatchTime,
    getRecentVideos,
    history,
  } = useWatchHistoryStore();

  const { followedChannelIds } = useChannelStore();
  const { streak, wordsLearnedToday } = useLearningStore();

  const todaySeconds = getTodayWatchTime();
  const weeklyData = getWeeklyWatchTimes();
  const totalSeconds = getTotalWatchTime();
  const recentVideos = getRecentVideos(5);

  const maxWeeklySeconds = Math.max(...weeklyData.map((d) => d.seconds), 1);

  // Count study days this month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const studyDaysThisMonth = weeklyData.filter((d) => d.date >= monthStart && d.seconds > 0).length
    + useWatchHistoryStore.getState().dailyWatchTimes.filter((d) => d.date >= monthStart && d.seconds > 0).length;
  const uniqueStudyDays = new Set(
    useWatchHistoryStore.getState().dailyWatchTimes
      .filter((d) => d.date >= monthStart && d.seconds > 0)
      .map((d) => d.date)
  ).size;

  const summaryCards = [
    { label: '오늘 시청', value: formatSeconds(todaySeconds), icon: 'today' as const, color: '#3b82f6' },
    { label: '총 시청', value: formatSeconds(totalSeconds), icon: 'time' as const, color: '#8b5cf6' },
    { label: '시청 영상', value: `${history.length}개`, icon: 'videocam' as const, color: '#10b981' },
    { label: '팔로우 채널', value: `${followedChannelIds.length}개`, icon: 'people' as const, color: '#f59e0b' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-white text-2xl font-bold">통계</Text>
          <Text className="text-gray-500 text-sm mt-1">나의 학습 현황</Text>
        </View>

        {/* Summary cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          className="mb-5"
        >
          {summaryCards.map((card, i) => (
            <Card key={i} className="p-4 w-[130px]">
              <View className="bg-dark-bg w-10 h-10 rounded-xl items-center justify-center mb-3">
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <Text className="text-white text-xl font-bold">{card.value}</Text>
              <Text className="text-gray-500 text-xs mt-0.5">{card.label}</Text>
            </Card>
          ))}
        </ScrollView>

        {/* Weekly bar chart */}
        <View className="px-5 mb-5">
          <Card className="p-4">
            <Text className="text-white font-bold text-base mb-4">주간 시청 시간</Text>
            <View className="flex-row items-end justify-between" style={{ height: 120 }}>
              {weeklyData.map((day, i) => {
                const barHeight = maxWeeklySeconds > 0 ? (day.seconds / maxWeeklySeconds) * 100 : 0;
                const dayOfWeek = new Date(day.date).getDay();
                const isToday = day.date === new Date().toISOString().split('T')[0];
                return (
                  <View key={i} className="items-center flex-1">
                    <Text className="text-gray-500 text-[10px] mb-1">
                      {day.seconds > 0 ? formatMinutes(day.seconds) : '-'}
                    </Text>
                    <View
                      className={`w-6 rounded-t-md ${isToday ? 'bg-primary' : day.seconds > 0 ? 'bg-primary/40' : 'bg-dark-border'}`}
                      style={{ height: Math.max(barHeight, 4) }}
                    />
                    <Text className={`text-xs mt-1 ${isToday ? 'text-primary font-bold' : 'text-gray-500'}`}>
                      {DAY_LABELS[dayOfWeek]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Recent videos */}
        {recentVideos.length > 0 && (
          <View className="px-5 mb-5">
            <Card className="p-4">
              <Text className="text-white font-bold text-base mb-3">최근 시청 영상</Text>
              {recentVideos.map((video, i) => (
                <TouchableOpacity
                  key={video.youtubeId}
                  onPress={() => router.push(`/learn/${video.youtubeId}` as any)}
                  className={`flex-row items-center py-2.5 ${i < recentVideos.length - 1 ? 'border-b border-dark-border' : ''}`}
                >
                  <Image
                    source={{ uri: video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg` }}
                    style={{ width: 80, height: 45, borderRadius: 6 }}
                    contentFit="cover"
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-white text-xs font-medium" numberOfLines={1}>
                      {video.title}
                    </Text>
                    <Text className="text-gray-500 text-[10px] mt-0.5">
                      {formatSeconds(video.watchedSeconds)} 시청 · {video.channelName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* Monthly overview */}
        <View className="px-5 mb-5">
          <Card className="p-4">
            <Text className="text-white font-bold text-base mb-3">이번 달 요약</Text>
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-primary">{uniqueStudyDays}</Text>
                <Text className="text-gray-500 text-xs mt-1">학습 일수</Text>
              </View>
              <View className="w-px bg-dark-border" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-success">{history.length}</Text>
                <Text className="text-gray-500 text-xs mt-1">시청 영상</Text>
              </View>
              <View className="w-px bg-dark-border" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-warning">
                  {formatMinutes(totalSeconds)}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">총 시청</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Empty state prompt */}
        {history.length === 0 && (
          <View className="items-center px-10 py-8">
            <Ionicons name="bar-chart-outline" size={48} color="#64748b" />
            <Text className="text-gray-500 text-sm text-center mt-3">
              영상을 시청하면 학습 통계가 여기에 표시됩니다
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/channels' as any)}
              className="bg-primary rounded-xl px-6 py-3 mt-4"
            >
              <Text className="text-white font-bold">채널에서 영상 보기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
