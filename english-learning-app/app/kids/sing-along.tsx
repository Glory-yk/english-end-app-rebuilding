import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const songs = [
  {
    id: '1',
    title: 'Twinkle Twinkle Little Star',
    lines: [
      { text: 'Twinkle, twinkle, little star', startMs: 0, endMs: 4000 },
      { text: 'How I wonder what you are', startMs: 4000, endMs: 8000 },
      { text: 'Up above the world so high', startMs: 8000, endMs: 12000 },
      { text: 'Like a diamond in the sky', startMs: 12000, endMs: 16000 },
      { text: 'Twinkle, twinkle, little star', startMs: 16000, endMs: 20000 },
      { text: 'How I wonder what you are', startMs: 20000, endMs: 24000 },
    ],
  },
  {
    id: '2',
    title: 'ABC Song',
    lines: [
      { text: 'A B C D E F G', startMs: 0, endMs: 4000 },
      { text: 'H I J K L M N O P', startMs: 4000, endMs: 8000 },
      { text: 'Q R S T U V', startMs: 8000, endMs: 11000 },
      { text: 'W X Y and Z', startMs: 11000, endMs: 14000 },
      { text: 'Now I know my ABCs', startMs: 14000, endMs: 18000 },
      { text: 'Next time won\'t you sing with me', startMs: 18000, endMs: 22000 },
    ],
  },
];

export default function SingAlongScreen() {
  const router = useRouter();
  const [songIndex, setSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [earnedStickers, setEarnedStickers] = useState(0);

  const song = songs[songIndex];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeMs(prev => {
          const maxTime = song.lines[song.lines.length - 1].endMs;
          if (prev >= maxTime) {
            setIsPlaying(false);
            setEarnedStickers(s => s + 2);
            return 0;
          }
          return prev + 100;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, song]);

  const currentLineIndex = song.lines.findIndex(l => currentTimeMs >= l.startMs && currentTimeMs < l.endMs);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E7' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#333', textAlign: 'center' }}>따라 부르기 🎤</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 16 }}>⭐</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#F8B500' }}>{earnedStickers}</Text>
        </View>
      </View>

      {/* Song Title */}
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#6C5CE7', textAlign: 'center', marginVertical: 16 }}>
        {song.title}
      </Text>

      {/* Lyrics */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }}>
        {song.lines.map((line, i) => (
          <Text
            key={i}
            style={{
              fontSize: i === currentLineIndex ? 28 : 22,
              fontWeight: i === currentLineIndex ? '800' : '500',
              color: i === currentLineIndex ? '#FF6B6B' : i < currentLineIndex ? '#ccc' : '#666',
              textAlign: 'center',
              marginVertical: 8,
              transform: [{ scale: i === currentLineIndex ? 1.05 : 1 }],
            }}
          >
            {line.text}
          </Text>
        ))}
      </ScrollView>

      {/* Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 30, paddingHorizontal: 20 }}>
        <TouchableOpacity
          onPress={() => { setCurrentTimeMs(0); setIsPlaying(false); }}
          style={{ backgroundColor: '#FFD93D', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="refresh" size={28} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsPlaying(!isPlaying)}
          style={{ backgroundColor: '#FF6B6B', width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSongIndex((songIndex + 1) % songs.length)}
          style={{ backgroundColor: '#4ECDC4', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="play-skip-forward" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
