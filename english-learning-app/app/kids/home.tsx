import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore } from '../../src/stores/useProfileStore';
import BigIconButton from '../../src/components/kids/BigIconButton';

const { width } = Dimensions.get('window');

const categories1y = [
  { id: 'nursery', icon: '🎵', label: '동요', color: '#FF6B6B', screen: '/kids/watch?cat=nursery_rhyme' },
  { id: 'colors', icon: '🌈', label: '색깔', color: '#4ECDC4', screen: '/kids/watch?cat=colors_shapes' },
  { id: 'animals', icon: '🐻', label: '동물', color: '#FFD93D', screen: '/kids/watch?cat=animals' },
];

const categories3y = [
  { id: 'nursery', icon: '🎵', label: '동요', color: '#FF6B6B', screen: '/kids/watch?cat=nursery_rhyme' },
  { id: 'cartoon', icon: '📺', label: '만화', color: '#6C5CE7', screen: '/kids/watch?cat=cartoon_simple' },
  { id: 'animals', icon: '🐻', label: '동물', color: '#FFD93D', screen: '/kids/watch?cat=animals' },
  { id: 'singalong', icon: '🎤', label: '따라하기', color: '#A8E6CF', screen: '/kids/sing-along' },
];

const categories6y = [
  { id: 'cartoon', icon: '📺', label: '만화', color: '#6C5CE7', screen: '/kids/watch?cat=cartoon_simple' },
  { id: 'story', icon: '📖', label: '이야기', color: '#FF6B6B', screen: '/kids/watch?cat=story' },
  { id: 'science', icon: '🔬', label: '과학', color: '#4ECDC4', screen: '/kids/watch?cat=science_kids' },
  { id: 'animals', icon: '🐻', label: '동물', color: '#FFD93D', screen: '/kids/watch?cat=animals' },
  { id: 'singalong', icon: '🎤', label: '따라하기', color: '#A8E6CF', screen: '/kids/sing-along' },
  { id: 'stickers', icon: '⭐', label: '스티커북', color: '#F8B500', screen: '/kids/stickers' },
];

export default function KidsHomeScreen() {
  const router = useRouter();
  const activeProfile = useProfileStore(s => s.activeProfile);
  const ageGroup = activeProfile?.ageGroup || '3y';

  const categories = ageGroup === '1y' ? categories1y : ageGroup === '3y' ? categories3y : categories6y;
  const greeting = ageGroup === '1y' ? '안녕!' : ageGroup === '3y' ? '안녕하세요!' : `${activeProfile?.name || '친구'}야, 안녕!`;
  const iconSize = ageGroup === '1y' ? 100 : ageGroup === '3y' ? 80 : 70;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E7' }}>
      {/* Parent Lock Access */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 }}>
        <TouchableOpacity onPress={() => router.push('/settings/parental')} style={{ padding: 8 }}>
          <Ionicons name="settings-outline" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={{ padding: 8 }}>
          <Text style={{ color: '#ccc', fontSize: 12 }}>성인 모드</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 20, paddingBottom: 40 }}>
        {/* Greeting */}
        <Text style={{ fontSize: ageGroup === '1y' ? 32 : 28, fontWeight: '800', color: '#333', marginBottom: 8 }}>
          {greeting}
        </Text>
        <Text style={{ fontSize: 16, color: '#888', marginBottom: 30 }}>
          무엇을 할까요?
        </Text>

        {/* Category Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, paddingHorizontal: 20 }}>
          {categories.map(cat => (
            <BigIconButton
              key={cat.id}
              icon={cat.icon}
              label={ageGroup === '1y' ? '' : cat.label}
              color={cat.color}
              size={iconSize}
              onPress={() => router.push(cat.screen as any)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
