import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../src/components/ui/Card';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLearningStore } from '../../src/stores/useLearningStore';

interface SettingsItem {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  showChevron?: boolean;
  rightContent?: React.ReactNode;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { dailyGoal } = useLearningStore();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => {
          logout();
          router.replace('/(auth)/login');
        }},
      ],
    );
  };

  const settingsSections: { title: string; items: SettingsItem[] }[] = [
    {
      title: '계정',
      items: [
        {
          icon: 'person-circle',
          iconColor: '#3b82f6',
          title: '프로필 관리',
          subtitle: '프로필 추가, 수정, 삭제',
          onPress: () => router.push('/settings/profiles'),
          showChevron: true,
        },
        {
          icon: 'lock-closed',
          iconColor: '#8b5cf6',
          title: '부모 잠금',
          subtitle: 'PIN 설정 및 접근 제한',
          onPress: () => router.push('/settings/parental'),
          showChevron: true,
        },
      ],
    },
    {
      title: '학습',
      items: [
        {
          icon: 'notifications',
          iconColor: '#f59e0b',
          title: '알림 설정',
          subtitle: '복습 알림, 학습 리마인더',
          onPress: () => {},
          showChevron: true,
        },
        {
          icon: 'flag',
          iconColor: '#10b981',
          title: '학습 설정',
          subtitle: `일일 목표: ${dailyGoal}분`,
          onPress: () => {},
          showChevron: true,
        },
      ],
    },
    {
      title: '기타',
      items: [
        {
          icon: 'information-circle',
          iconColor: '#64748b',
          title: '앱 정보',
          subtitle: 'v1.0.0',
          onPress: () => {},
          showChevron: true,
        },
        {
          icon: 'log-out',
          iconColor: '#ef4444',
          title: '로그아웃',
          subtitle: '계정에서 로그아웃합니다',
          onPress: handleLogout,
          showChevron: false,
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">설정</Text>
        </View>

        {settingsSections.map((section, si) => (
          <View key={si} className="px-5 mb-5">
            <Text className="text-gray-500 text-xs font-semibold uppercase mb-2 ml-1">{section.title}</Text>
            <Card className="p-0 overflow-hidden">
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                  className={`flex-row items-center p-4 ${ii < section.items.length - 1 ? 'border-b border-dark-border' : ''}`}
                >
                  <View className="w-10 h-10 rounded-xl items-center justify-center bg-dark-bg mr-3">
                    <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-sm font-semibold">{item.title}</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">{item.subtitle}</Text>
                  </View>
                  {item.showChevron && (
                    <Ionicons name="chevron-forward" size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
