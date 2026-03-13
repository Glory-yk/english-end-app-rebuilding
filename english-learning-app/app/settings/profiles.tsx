import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../src/components/ui/Card';
import Badge from '../../src/components/ui/Badge';
import Button from '../../src/components/ui/Button';

interface Profile {
  id: string;
  name: string;
  type: 'child' | 'adult';
  ageGroup: '1y' | '3y' | '6y' | 'adult';
  level: 'beginner' | 'intermediate' | 'advanced';
  isActive: boolean;
}

const ageGroupLabel: Record<string, string> = {
  '1y': '1세',
  '3y': '3세',
  '6y': '6세',
  'adult': '성인',
};

const levelBadge: Record<string, { label: string; color: 'success' | 'warning' | 'danger' }> = {
  beginner: { label: '초급', color: 'success' },
  intermediate: { label: '중급', color: 'warning' },
  advanced: { label: '고급', color: 'danger' },
};

const mockProfiles: Profile[] = [
  { id: '1', name: '아빠', type: 'adult', ageGroup: 'adult', level: 'intermediate', isActive: true },
  { id: '2', name: '엄마', type: 'adult', ageGroup: 'adult', level: 'beginner', isActive: false },
  { id: '3', name: '민준이', type: 'child', ageGroup: '6y', level: 'beginner', isActive: false },
  { id: '4', name: '서연이', type: 'child', ageGroup: '3y', level: 'beginner', isActive: false },
];

export default function ProfilesScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState(mockProfiles);

  const handleDeleteProfile = (id: string) => {
    Alert.alert(
      '프로필 삭제',
      '이 프로필을 삭제하시겠습니까? 학습 데이터가 모두 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => {
          setProfiles(prev => prev.filter(p => p.id !== id));
        }},
      ],
    );
  };

  const handleSelectProfile = (id: string) => {
    setProfiles(prev => prev.map(p => ({ ...p, isActive: p.id === id })));
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">프로필 관리</Text>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <Text className="text-gray-500 text-sm mb-3">최대 5개의 프로필을 추가할 수 있습니다</Text>
        }
        renderItem={({ item }) => {
          const lb = levelBadge[item.level];
          return (
            <Card className="p-4">
              <View className="flex-row items-center">
                {/* Avatar */}
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${item.type === 'child' ? 'bg-warning/20' : 'bg-primary/20'}`}>
                  <Ionicons
                    name={item.type === 'child' ? 'happy' : 'person'}
                    size={24}
                    color={item.type === 'child' ? '#f59e0b' : '#3b82f6'}
                  />
                </View>

                {/* Info */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white text-base font-bold">{item.name}</Text>
                    {item.isActive && (
                      <Badge label="활성" color="success" size="sm" />
                    )}
                  </View>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-gray-500 text-xs">{ageGroupLabel[item.ageGroup]}</Text>
                    <Badge label={lb.label} color={lb.color} size="sm" />
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2">
                  {!item.isActive && (
                    <TouchableOpacity
                      onPress={() => handleSelectProfile(item.id)}
                      className="bg-primary/20 p-2 rounded-lg"
                    >
                      <Ionicons name="checkmark" size={18} color="#3b82f6" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteProfile(item.id)}
                    className="bg-danger/20 p-2 rounded-lg"
                  >
                    <Ionicons name="trash" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          profiles.length < 5 ? (
            <TouchableOpacity
              onPress={() => {/* TODO: navigate to add profile */}}
              activeOpacity={0.7}
              className="mt-4 border-2 border-dashed border-dark-border rounded-2xl py-6 items-center"
            >
              <Ionicons name="add-circle-outline" size={32} color="#64748b" />
              <Text className="text-gray-500 text-sm mt-2">프로필 추가</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
