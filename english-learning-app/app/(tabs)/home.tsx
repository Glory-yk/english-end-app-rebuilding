import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../src/components/ui/Card';
import ProgressRing from '../../src/components/learning/ProgressRing';
import { useProfileStore } from '../../src/stores/useProfileStore';
import { useLearningStore } from '../../src/stores/useLearningStore';
import { useWatchHistoryStore } from '../../src/stores/useWatchHistoryStore';
import { useChannelStore } from '../../src/stores/useChannelStore';
import type { ChannelVideo } from '../../src/stores/useChannelStore';
import type { Channel } from '../../src/constants/channels';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_CARD_WIDTH = SCREEN_WIDTH * 0.7;

function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}시간 ${rm}분` : `${h}시간`;
}

export default function HomeScreen() {
  const router = useRouter();
  const activeProfile = useProfileStore((s) => s.activeProfile);
  const { dailyGoal, todayMinutes } = useLearningStore();
  const {
    getTodayWatchTime,
    getRecentVideos,
  } = useWatchHistoryStore();
  const {
    followedChannelIds,
    channelVideos,
    getFollowedChannels,
    fetchChannelVideos,
  } = useChannelStore();

  const todayWatchSeconds = getTodayWatchTime();
  const recentVideos = getRecentVideos(5);
  const followedChannels = getFollowedChannels();
  const progress = dailyGoal > 0 ? todayMinutes / dailyGoal : 0;

  // Fetch videos for followed channels on mount
  useEffect(() => {
    followedChannels.forEach((ch) => {
      if (!channelVideos[ch.id]) {
        fetchChannelVideos(ch);
      }
    });
  }, [followedChannelIds.length]);

  // Collect all videos from followed channels
  const feedVideos: ChannelVideo[] = followedChannels
    .flatMap((ch) => channelVideos[ch.id] || [])
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 20);

  const renderFeedVideo = ({ item }: { item: ChannelVideo }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/learn/${item.videoId}` as any)}
      className="mr-4"
      style={{ width: VIDEO_CARD_WIDTH }}
    >
      <View className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={{ width: VIDEO_CARD_WIDTH, height: VIDEO_CARD_WIDTH * 9 / 16 }}
          contentFit="cover"
        />
        <View className="p-3">
          <Text className="text-white font-semibold text-sm" numberOfLines={2}>
            {item.title}
          </Text>
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-gray-500 text-xs">{item.channelName}</Text>
            <Text className="text-gray-600 text-xs">
              {new Date(item.publishedAt).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderChannelChip = ({ item }: { item: Channel }) => (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/channels' as any)}
      className="items-center mr-4"
    >
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#3b82f6' }}
        contentFit="cover"
      />
      <Text className="text-gray-300 text-[10px] mt-1 text-center w-16" numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-gray-400 text-sm">안녕하세요!</Text>
            <Text className="text-white text-2xl font-bold">
              {activeProfile?.name || '학습자'}님
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Today's Summary */}
        <View className="px-5 mt-4">
          <Card>
            <View className="flex-row items-center">
              <ProgressRing
                progress={Math.min(progress, 1)}
                size={72}
                strokeWidth={6}
                color="#3b82f6"
              />
              <View className="flex-1 ml-5">
                <Text className="text-white font-bold text-base mb-1">오늘의 학습</Text>
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    <Text className="text-gray-400 text-sm">
                      {formatSeconds(todayWatchSeconds)} 시청
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="book-outline" size={14} color="#94a3b8" />
                    <Text className="text-gray-400 text-sm">
                      {Math.round(todayMinutes)}/{dailyGoal}분
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Followed channels strip */}
        {followedChannels.length > 0 && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-white text-lg font-bold">팔로우 채널</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/channels' as any)}>
                <Text className="text-primary text-sm">모두 보기</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={followedChannels}
              renderItem={renderChannelChip}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          </View>
        )}

        {/* Feed from followed channels */}
        {feedVideos.length > 0 && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-white text-lg font-bold">새 영상</Text>
            </View>
            <FlatList
              data={feedVideos}
              renderItem={renderFeedVideo}
              keyExtractor={(item) => item.videoId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          </View>
        )}

        {/* Continue watching */}
        {recentVideos.length > 0 && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-white text-lg font-bold">이어서 보기</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/study' as any)}>
                <Text className="text-primary text-sm">전체</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {recentVideos.map((video) => (
                <TouchableOpacity
                  key={video.youtubeId}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/learn/${video.youtubeId}` as any)}
                  className="mr-3"
                  style={{ width: 200 }}
                >
                  <View className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                    <Image
                      source={{ uri: video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg` }}
                      style={{ width: 200, height: 112 }}
                      contentFit="cover"
                    />
                    <View className="p-2.5">
                      <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                        {video.title}
                      </Text>
                      <View className="flex-row items-center gap-1 mt-1">
                        <Ionicons name="time-outline" size={10} color="#64748b" />
                        <Text className="text-gray-500 text-[10px]">
                          {formatSeconds(video.watchedSeconds)} 시청
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* No channels followed prompt */}
        {followedChannels.length === 0 && (
          <View className="px-5 mt-6">
            <Card onPress={() => router.push('/(tabs)/channels' as any)}>
              <View className="flex-row items-center">
                <View className="bg-primary/20 rounded-full p-3 mr-3">
                  <Ionicons name="tv" size={24} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm">채널을 팔로우하세요</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    영어 학습 채널을 팔로우하면 최신 영상이 여기에 표시됩니다
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </View>
            </Card>
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-5 mt-6">
          <Text className="text-white text-lg font-bold mb-3">바로가기</Text>
          <View className="flex-row gap-3">
            <Card className="flex-1" onPress={() => router.push('/(tabs)/explore' as any)}>
              <Ionicons name="search" size={24} color="#3b82f6" />
              <Text className="text-white font-semibold text-sm mt-2">영상 검색</Text>
              <Text className="text-gray-500 text-xs mt-1">URL로 영상 찾기</Text>
            </Card>
            <Card className="flex-1" onPress={() => router.push('/(tabs)/stats' as any)}>
              <Ionicons name="stats-chart" size={24} color="#8b5cf6" />
              <Text className="text-white font-semibold text-sm mt-2">학습 통계</Text>
              <Text className="text-gray-500 text-xs mt-1">시청 기록 확인</Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
