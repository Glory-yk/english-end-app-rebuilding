import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Image } from 'expo-image';

interface KidsVideoCardProps {
  title: string;
  thumbnailUrl: string;
  duration: number;
  onPress: () => void;
  isActive?: boolean;
}

export default function KidsVideoCard({ title, thumbnailUrl, duration, onPress, isActive }: KidsVideoCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: isActive ? '#FFE4B5' : 'white',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: isActive ? '#F8B500' : '#eee',
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <Image source={{ uri: thumbnailUrl }} style={{ width: '100%', height: 160 }} contentFit="cover" />
      <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', flex: 1 }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 12, color: '#999' }}>{Math.floor(duration / 60)}분</Text>
      </View>
    </TouchableOpacity>
  );
}
