import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../src/components/ui/Card';
import { useChannelStore } from '../../src/stores/useChannelStore';
import type { ChannelVideo } from '../../src/stores/useChannelStore';
import type { Channel } from '../../src/constants/channels';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PADDING = 16;
const COLS = 3;
const TILE_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLS - 1)) / COLS;

type SortMode = 'latest' | 'popular';

export default function ChannelsScreen() {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('latest');

  const {
    channelVideos,
    isLoadingVideos,
    getAllChannels,
    addCustomChannel,
    removeChannel,
    fetchChannelVideos,
    loadMoreVideos,
    hasMoreVideos,
  } = useChannelStore();

  const channels = getAllChannels();

  const handleAddChannel = () => {
    const name = newChannelName.trim();
    if (!name) {
      if (Platform.OS === 'web') window.alert('채널 이름을 입력해주세요.');
      return;
    }
    if (channels.some((ch) => ch.name.toLowerCase() === name.toLowerCase())) {
      if (Platform.OS === 'web') window.alert('이미 등록된 채널입니다.');
      return;
    }
    const channel = addCustomChannel(name, newChannelDesc);
    setNewChannelName('');
    setNewChannelDesc('');
    setShowAddForm(false);
    setExpandedChannel(channel.id);
    fetchChannelVideos(channel);
  };

  const handleRemoveChannel = (channelId: string) => {
    removeChannel(channelId);
    if (expandedChannel === channelId) setExpandedChannel(null);
  };

  const handleExpandChannel = (channel: Channel) => {
    if (expandedChannel === channel.id) {
      setExpandedChannel(null);
    } else {
      setExpandedChannel(channel.id);
      if (!channelVideos[channel.id]) {
        fetchChannelVideos(channel);
      }
    }
  };

  const getSortedVideos = (videos: ChannelVideo[]): ChannelVideo[] => {
    if (sortMode === 'popular') {
      // YouTube search results are roughly by relevance/popularity already
      // Just reverse the date sort to approximate popularity
      return [...videos];
    }
    // latest: sort by publishedAt desc
    return [...videos].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  };

  const renderVideoGrid = (videos: ChannelVideo[]) => {
    const sorted = getSortedVideos(videos);
    const rows: ChannelVideo[][] = [];
    for (let i = 0; i < sorted.length; i += COLS) {
      rows.push(sorted.slice(i, i + COLS));
    }

    return (
      <View style={{ paddingHorizontal: GRID_PADDING }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP }}>
            {row.map((video) => (
              <TouchableOpacity
                key={video.videoId}
                activeOpacity={0.7}
                onPress={() => router.push(`/learn/${video.videoId}` as any)}
                style={{ width: TILE_WIDTH }}
              >
                <Image
                  source={{ uri: video.thumbnailUrl }}
                  style={{ width: TILE_WIDTH, height: TILE_WIDTH * 9 / 16, borderRadius: 8 }}
                  contentFit="cover"
                />
                <Text className="text-white text-[11px] font-medium mt-1" numberOfLines={2}>
                  {video.title}
                </Text>
                <Text className="text-gray-500 text-[9px] mt-0.5">
                  {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Fill empty cells */}
            {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: TILE_WIDTH }} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">내 채널</Text>
          <Text className="text-gray-500 text-sm mt-1">
            {channels.length > 0 ? `${channels.length}개 채널` : '채널을 추가해보세요'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddForm(!showAddForm)}
          className={`w-10 h-10 rounded-full items-center justify-center ${showAddForm ? 'bg-red-500/20' : 'bg-primary/20'}`}
        >
          <Ionicons name={showAddForm ? 'close' : 'add'} size={24} color={showAddForm ? '#ef4444' : '#3b82f6'} />
        </TouchableOpacity>
      </View>

      {/* Add channel form */}
      {showAddForm && (
        <View className="px-5 pb-3">
          <Card className="p-4">
            <Text className="text-white font-bold text-sm mb-3">채널 추가</Text>
            <TextInput
              className="bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-white text-sm mb-2"
              placeholder="YouTube 채널 이름 (예: English with Lucy)"
              placeholderTextColor="#64748b"
              value={newChannelName}
              onChangeText={setNewChannelName}
              onSubmitEditing={handleAddChannel}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              className="bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-white text-sm mb-3"
              placeholder="설명 (선택사항)"
              placeholderTextColor="#64748b"
              value={newChannelDesc}
              onChangeText={setNewChannelDesc}
              onSubmitEditing={handleAddChannel}
            />
            <TouchableOpacity
              onPress={handleAddChannel}
              className="bg-primary rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold text-sm">채널 추가</Text>
            </TouchableOpacity>
          </Card>
        </View>
      )}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Empty state */}
        {channels.length === 0 && !showAddForm && (
          <View className="items-center justify-center py-20 px-10">
            <View className="bg-dark-card rounded-full p-6 mb-4">
              <Ionicons name="tv-outline" size={48} color="#64748b" />
            </View>
            <Text className="text-white font-bold text-lg text-center">채널이 없습니다</Text>
            <Text className="text-gray-500 text-sm text-center mt-2">
              상단의 + 버튼을 눌러 YouTube 채널을 추가하세요
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              className="bg-primary rounded-xl px-6 py-3 mt-6"
            >
              <Text className="text-white font-bold">첫 채널 추가하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Channel list */}
        {channels.map((channel) => {
          const expanded = expandedChannel === channel.id;
          const videos = channelVideos[channel.id] || [];

          return (
            <View key={channel.id} className="mb-3">
              {/* Channel header */}
              <TouchableOpacity
                onPress={() => handleExpandChannel(channel)}
                activeOpacity={0.7}
                className="flex-row items-center px-5 py-3"
              >
                {channel.thumbnailUrl ? (
                  <Image
                    source={{ uri: channel.thumbnailUrl }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                    <Ionicons name="tv" size={18} color="#3b82f6" />
                  </View>
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>
                    {channel.name}
                  </Text>
                  <Text className="text-gray-500 text-xs" numberOfLines={1}>
                    {channel.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveChannel(channel.id)}
                  className="px-2.5 py-1.5 rounded-lg mr-2"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748b"
                />
              </TouchableOpacity>

              {/* Expanded: sort tabs + video grid */}
              {expanded && (
                <View>
                  {/* Sort tabs */}
                  <View className="flex-row px-5 mb-3 gap-2">
                    <TouchableOpacity
                      onPress={() => setSortMode('latest')}
                      className={`px-4 py-1.5 rounded-full border ${
                        sortMode === 'latest' ? 'bg-primary border-primary' : 'bg-dark-card border-dark-border'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${sortMode === 'latest' ? 'text-white' : 'text-gray-400'}`}>
                        최신순
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSortMode('popular')}
                      className={`px-4 py-1.5 rounded-full border ${
                        sortMode === 'popular' ? 'bg-primary border-primary' : 'bg-dark-card border-dark-border'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${sortMode === 'popular' ? 'text-white' : 'text-gray-400'}`}>
                        인기순
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Video grid */}
                  {isLoadingVideos && videos.length === 0 ? (
                    <View className="items-center py-8">
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text className="text-gray-500 text-xs mt-2">영상을 불러오는 중...</Text>
                    </View>
                  ) : videos.length > 0 ? (
                    <>
                      {renderVideoGrid(videos)}
                      {/* Load more button */}
                      {hasMoreVideos(channel.id) && (
                        <TouchableOpacity
                          onPress={() => loadMoreVideos(channel)}
                          disabled={isLoadingVideos}
                          className="mx-4 mb-2 py-3 rounded-xl border border-dark-border items-center"
                        >
                          {isLoadingVideos ? (
                            <ActivityIndicator size="small" color="#3b82f6" />
                          ) : (
                            <View className="flex-row items-center gap-2">
                              <Ionicons name="add-circle-outline" size={16} color="#3b82f6" />
                              <Text className="text-primary text-sm font-medium">더 보기</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <View className="items-center py-8">
                      <Text className="text-gray-500 text-xs">영상을 불러올 수 없습니다</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Divider */}
              <View className="h-px bg-dark-border mx-5" />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
