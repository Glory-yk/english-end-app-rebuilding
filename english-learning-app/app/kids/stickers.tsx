import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const STICKER_SIZE = (width - 80) / 4;

const allStickers = [
  '🌟', '🦁', '🐸', '🦋', '🌈', '🎵', '🐻', '🌻',
  '🦄', '🐬', '🎨', '🍎', '🚀', '🌙', '🐱', '🎪',
  '🦊', '🐧', '🌺', '🎭', '🐝', '🌸', '🎈', '🐠',
  '🦜', '🍓', '🌊', '🎂', '🐰', '🌷',
];

export default function StickersScreen() {
  const router = useRouter();
  const [earnedCount] = useState(12); // Mock: 12 stickers earned

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E7' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: '#333', textAlign: 'center' }}>내 스티커북 ⭐</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginVertical: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#F8B500' }}>{earnedCount}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>모은 스티커</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#ccc' }}>{allStickers.length - earnedCount}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>남은 스티커</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
        <View style={{ height: 12, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden' }}>
          <View style={{ height: 12, backgroundColor: '#F8B500', borderRadius: 6, width: `${(earnedCount / allStickers.length) * 100}%` }} />
        </View>
        <Text style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: '#888' }}>{earnedCount}/{allStickers.length}</Text>
      </View>

      {/* Sticker Grid */}
      <FlatList
        data={allStickers}
        numColumns={4}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        renderItem={({ item, index }) => {
          const earned = index < earnedCount;
          return (
            <View style={{
              width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: 16,
              backgroundColor: earned ? '#FFF' : '#F0EDE5',
              borderWidth: 2, borderColor: earned ? '#F8B500' : '#ddd',
              justifyContent: 'center', alignItems: 'center',
              shadowColor: earned ? '#F8B500' : 'transparent', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
            }}>
              <Text style={{ fontSize: earned ? 36 : 28, opacity: earned ? 1 : 0.2 }}>{item}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
