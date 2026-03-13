import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withDelay, runOnJS } from 'react-native-reanimated';

interface StickerRewardProps {
  visible: boolean;
  sticker: string;
  onClose: () => void;
}

export default function StickerReward({ visible, sticker, onClose }: StickerRewardProps) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 4, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 150 }),
      );
      rotation.value = withSequence(
        withSpring(-10),
        withSpring(10),
        withSpring(0),
      );
    } else {
      scale.value = 0;
      rotation.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 40, alignItems: 'center', marginHorizontal: 40 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#888', marginBottom: 16 }}>스티커 획득! 🎉</Text>
          <Animated.View style={animatedStyle}>
            <Text style={{ fontSize: 80 }}>{sticker}</Text>
          </Animated.View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#333', marginTop: 16, marginBottom: 24 }}>잘했어요!</Text>
          <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#F8B500', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 20 }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>좋아요!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
