import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Badge from '../../src/components/ui/Badge';
import { videoCategories } from '../../src/constants/categories';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useYouTubeStore } from '../../src/stores/useYouTubeStore';
import type { YouTubeVideo } from '../../src/services/youtubeService';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

const difficulties = ['전체', '초급', '중급', '고급'];
const diffMap: Record<string, string> = { '초급': 'beginner', '중급': 'intermediate', '고급': 'advanced' };

const mockVideos = [
  { id: '1', youtubeId: 'dQw4w9WgXcQ', title: 'Daily English Conversation Practice', channelName: 'English Speaking', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', duration: 480, difficulty: 'beginner', category: 'conversation' },
  { id: '2', youtubeId: 'arj7oStGLkU', title: 'TED: Inside the Mind of a Master Procrastinator', channelName: 'TED', thumbnailUrl: 'https://img.youtube.com/vi/arj7oStGLkU/mqdefault.jpg', duration: 840, difficulty: 'advanced', category: 'ted' },
  { id: '3', youtubeId: 'iCvmsMzlF7o', title: 'Learn English Through Movies', channelName: 'Movie English', thumbnailUrl: 'https://img.youtube.com/vi/iCvmsMzlF7o/mqdefault.jpg', duration: 620, difficulty: 'intermediate', category: 'drama' },
  { id: '4', youtubeId: 'r5VrBasu_Bk', title: 'English News for Beginners', channelName: 'Simple News', thumbnailUrl: 'https://img.youtube.com/vi/r5VrBasu_Bk/mqdefault.jpg', duration: 300, difficulty: 'beginner', category: 'news' },
  { id: '5', youtubeId: 'hq3yfQnllfQ', title: 'Phonics Song for Kids', channelName: 'Kids Learning', thumbnailUrl: 'https://img.youtube.com/vi/hq3yfQnllfQ/mqdefault.jpg', duration: 180, difficulty: 'beginner', category: 'kids' },
  { id: '6', youtubeId: 'JxS5E-kZc2s', title: 'Business English Vocabulary', channelName: 'Biz English', thumbnailUrl: 'https://img.youtube.com/vi/JxS5E-kZc2s/mqdefault.jpg', duration: 720, difficulty: 'advanced', category: 'business' },
];

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const badgeProps: Record<string, { label: string; color: 'success' | 'warning' | 'danger' }> = {
  beginner: { label: '초급', color: 'success' },
  intermediate: { label: '중급', color: 'warning' },
  advanced: { label: '고급', color: 'danger' },
};

export default function ExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedDiff, setSelectedDiff] = useState('전체');
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const user = useAuthStore((s) => s.user);
  const hasYouTubeAccess = user?.hasYouTubeAccess ?? false;

  const {
    searchResults,
    isLoading: ytLoading,
    searchYouTube,
    clearSearchResults,
  } = useYouTubeStore();

  // Use YouTube search results when connected and searching, otherwise use local mock filter
  const isYouTubeSearchActive = hasYouTubeAccess && search.trim().length > 0 && searchResults.length > 0;

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);

    // Clear previous debounce timer
    if (searchTimer) clearTimeout(searchTimer);

    if (!text.trim()) {
      clearSearchResults();
      return;
    }

    // Debounce YouTube search (only if connected)
    if (hasYouTubeAccess) {
      const timer = setTimeout(() => {
        searchYouTube(text.trim());
      }, 500);
      setSearchTimer(timer);
    }
  }, [hasYouTubeAccess, searchTimer]);

  const handleClearSearch = () => {
    setSearch('');
    clearSearchResults();
    if (searchTimer) clearTimeout(searchTimer);
  };

  const handleUrlSubmit = () => {
    const videoId = extractYouTubeId(urlInput);
    if (videoId) {
      setUrlInput('');
      router.push(`/learn/${videoId}` as any);
    } else {
      if (Platform.OS === 'web') {
        window.alert('YouTube URL 또는 영상 ID를 입력해주세요.');
      } else {
        Alert.alert('잘못된 URL', 'YouTube URL 또는 영상 ID를 입력해주세요.');
      }
    }
  };

  // Local mock filtering (used when YouTube search not active)
  const filteredVideos = mockVideos.filter(v => {
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory !== '전체' && v.category !== selectedCategory) return false;
    if (selectedDiff !== '전체' && v.difficulty !== diffMap[selectedDiff]) return false;
    return true;
  });

  const categories = ['전체', ...videoCategories.map(c => c.id)];
  const categoryLabels: Record<string, string> = { '전체': '전체' };
  videoCategories.forEach(c => { categoryLabels[c.id] = c.label; });

  const renderYouTubeResult = ({ item }: { item: YouTubeVideo }) => {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/learn/${item.youtubeId}` as any)} style={{ width: CARD_WIDTH }}>
        <View className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          <Image source={{ uri: item.thumbnailUrl }} style={{ width: CARD_WIDTH, height: CARD_WIDTH * 9 / 16 }} contentFit="cover" />
          <View className="p-2.5">
            <Text className="text-white text-xs font-semibold" numberOfLines={2}>{item.title}</Text>
            <Text className="text-gray-500 text-[10px] mt-0.5">{item.channelName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMockVideo = ({ item }: { item: typeof mockVideos[0] }) => {
    const bp = badgeProps[item.difficulty];
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/learn/${item.youtubeId}` as any)} style={{ width: CARD_WIDTH }}>
        <View className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          <Image source={{ uri: item.thumbnailUrl }} style={{ width: CARD_WIDTH, height: CARD_WIDTH * 9 / 16 }} contentFit="cover" />
          <View className="p-2.5">
            <Text className="text-white text-xs font-semibold" numberOfLines={2}>{item.title}</Text>
            <Text className="text-gray-500 text-[10px] mt-0.5">{item.channelName}</Text>
            <View className="flex-row items-center justify-between mt-1.5">
              <Badge label={bp.label} color={bp.color} size="sm" />
              <Text className="text-gray-600 text-[10px]">{formatDuration(item.duration)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Search */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 py-2">
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            className="flex-1 text-white ml-2 text-sm"
            placeholder={hasYouTubeAccess ? 'YouTube 영상 검색...' : '영상 검색...'}
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {ytLoading && <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />}
          {search.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        {hasYouTubeAccess && search.trim().length > 0 && (
          <Text className="text-gray-500 text-xs mt-1 ml-1">YouTube에서 검색 중</Text>
        )}
      </View>

      {/* URL Input */}
      <View className="px-5 pb-3">
        <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 py-2">
          <Ionicons name="link" size={18} color="#64748b" />
          <TextInput
            className="flex-1 text-white ml-2 text-sm"
            placeholder="YouTube URL 붙여넣기..."
            placeholderTextColor="#64748b"
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleUrlSubmit}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {urlInput.length > 0 && (
            <TouchableOpacity onPress={handleUrlSubmit} className="bg-primary rounded-lg px-3 py-1.5 ml-2">
              <Text className="text-white text-xs font-bold">학습</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips (hidden during YouTube search) */}
      {!isYouTubeSearchActive && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} className="max-h-10 mb-2">
          {categories.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full border ${selectedCategory === cat ? 'bg-primary border-primary' : 'bg-dark-card border-dark-border'}`}>
              <Text className={`text-xs font-medium ${selectedCategory === cat ? 'text-white' : 'text-gray-400'}`}>{categoryLabels[cat] || cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Difficulty filter (hidden during YouTube search) */}
      {!isYouTubeSearchActive && (
        <View className="flex-row px-5 gap-2 mb-3">
          {difficulties.map(d => (
            <TouchableOpacity key={d} onPress={() => setSelectedDiff(d)}
              className={`px-3 py-1 rounded-lg ${selectedDiff === d ? 'bg-secondary/20 border border-secondary/50' : 'bg-dark-card border border-dark-border'}`}>
              <Text className={`text-xs ${selectedDiff === d ? 'text-secondary font-bold' : 'text-gray-500'}`}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Video Grid */}
      {isYouTubeSearchActive ? (
        <FlatList
          data={searchResults}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="search-outline" size={48} color="#64748b" />
              <Text className="text-gray-500 mt-3">검색 결과가 없습니다</Text>
            </View>
          }
          renderItem={renderYouTubeResult}
        />
      ) : (
        <FlatList
          data={filteredVideos}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="search-outline" size={48} color="#64748b" />
              <Text className="text-gray-500 mt-3">검색 결과가 없습니다</Text>
            </View>
          }
          renderItem={renderMockVideo}
        />
      )}
    </SafeAreaView>
  );
}
