import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import YouTubePlayer from '../../src/components/video/YouTubePlayer';

const { width } = Dimensions.get('window');

const mockKidsVideos: Record<string, any[]> = {
  nursery_rhyme: [
    { id: 'k1', youtubeId: 'hq3yfQnllfQ', title: 'ABC Song', thumbnail: 'https://img.youtube.com/vi/hq3yfQnllfQ/mqdefault.jpg', duration: 120 },
    { id: 'k2', youtubeId: '75p-N9YKqNo', title: 'Twinkle Twinkle Little Star', thumbnail: 'https://img.youtube.com/vi/75p-N9YKqNo/mqdefault.jpg', duration: 150 },
    { id: 'k3', youtubeId: 'yCjJyiqpAuU', title: 'Old MacDonald Had a Farm', thumbnail: 'https://img.youtube.com/vi/yCjJyiqpAuU/mqdefault.jpg', duration: 180 },
  ],
  colors_shapes: [
    { id: 'k4', youtubeId: 'wROwJbIefpQ', title: 'Learn Colors with Balloons', thumbnail: 'https://img.youtube.com/vi/wROwJbIefpQ/mqdefault.jpg', duration: 200 },
  ],
  animals: [
    { id: 'k5', youtubeId: 'OwRmivbNgQk', title: 'Animal Sounds for Kids', thumbnail: 'https://img.youtube.com/vi/OwRmivbNgQk/mqdefault.jpg', duration: 240 },
  ],
  cartoon_simple: [
    { id: 'k6', youtubeId: 'r5VrBasu_Bk', title: 'Peppa Pig Best Moments', thumbnail: 'https://img.youtube.com/vi/r5VrBasu_Bk/mqdefault.jpg', duration: 300 },
  ],
  story: [
    { id: 'k7', youtubeId: 'ZhODBFQ2-bQ', title: 'The Three Little Pigs', thumbnail: 'https://img.youtube.com/vi/ZhODBFQ2-bQ/mqdefault.jpg', duration: 420 },
  ],
  science_kids: [
    { id: 'k8', youtubeId: 'Wm2-IGB8w7s', title: 'How Do Volcanoes Work?', thumbnail: 'https://img.youtube.com/vi/Wm2-IGB8w7s/mqdefault.jpg', duration: 360 },
  ],
};

export default function KidsWatchScreen() {
  const { cat } = useLocalSearchParams<{ cat: string }>();
  const router = useRouter();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [watchedMinutes, setWatchedMinutes] = useState(0);
  const [timeLimitReached, setTimeLimitReached] = useState(false);
  const dailyLimit = 20; // minutes

  const videos = mockKidsVideos[cat || 'nursery_rhyme'] || mockKidsVideos.nursery_rhyme;
  const currentVideo = videos[activeVideoIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setWatchedMinutes(prev => {
        const next = prev + 1/60;
        if (next >= dailyLimit) setTimeLimitReached(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVideoEnd = () => {
    if (activeVideoIndex < videos.length - 1) {
      setActiveVideoIndex(prev => prev + 1);
    }
  };

  if (timeLimitReached) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E7', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Text style={{ fontSize: 60, marginBottom: 20 }}>🌙</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#333', textAlign: 'center', marginBottom: 12 }}>
          오늘은 여기까지!
        </Text>
        <Text style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 30 }}>
          내일 또 만나요!
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#FF6B6B', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E7' }}>
      {/* Back button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#999', fontSize: 12 }}>{Math.round(watchedMinutes)}분 / {dailyLimit}분</Text>
      </View>

      {/* Video Player */}
      {currentVideo && (
        <YouTubePlayer
          videoId={currentVideo.youtubeId}
          onStateChange={(state) => { if (state === 'ended') handleVideoEnd(); }}
        />
      )}

      {/* Video Title */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#333' }}>{currentVideo?.title}</Text>
      </View>

      {/* Up Next */}
      <Text style={{ paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 8 }}>다음 영상</Text>
      <FlatList
        data={videos}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => setActiveVideoIndex(index)}
            style={{
              flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 8,
              backgroundColor: index === activeVideoIndex ? '#FFE4B5' : 'white',
              borderRadius: 12, borderWidth: 1, borderColor: index === activeVideoIndex ? '#F8B500' : '#eee',
            }}
          >
            <Image source={{ uri: item.thumbnail }} style={{ width: 80, height: 45, borderRadius: 8 }} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }} numberOfLines={1}>{item.title}</Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{Math.floor(item.duration/60)}분</Text>
            </View>
            {index === activeVideoIndex && <Ionicons name="musical-notes" size={20} color="#F8B500" />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
