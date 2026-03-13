import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoopControlProps {
  onSetStart: () => void;
  onSetEnd: () => void;
  isLooping: boolean;
  loopCount: number;
  startTime: number | null;
  endTime: number | null;
  onToggleLoop: () => void;
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '--:--';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function LoopControl({
  onSetStart,
  onSetEnd,
  isLooping,
  loopCount,
  startTime,
  endTime,
  onToggleLoop,
}: LoopControlProps) {
  return (
    <View className="bg-dark-card border border-dark-border rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white font-semibold text-sm">
          A-B 구간 반복
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-gray-400 text-xs">반복: {loopCount}회</Text>
          <TouchableOpacity
            onPress={onToggleLoop}
            className={`p-2 rounded-lg ${
              isLooping ? 'bg-primary' : 'bg-dark-bg'
            }`}
          >
            <Ionicons
              name="repeat"
              size={18}
              color={isLooping ? '#ffffff' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        {/* Start marker */}
        <TouchableOpacity
          onPress={onSetStart}
          className="flex-1 bg-dark-bg rounded-lg py-3 items-center border border-dark-border"
        >
          <Text className="text-gray-400 text-[10px] mb-1">시작 (A)</Text>
          <Text className="text-white font-mono text-sm">
            {formatTime(startTime)}
          </Text>
        </TouchableOpacity>

        {/* Arrow */}
        <Ionicons name="arrow-forward" size={16} color="#64748b" />

        {/* End marker */}
        <TouchableOpacity
          onPress={onSetEnd}
          className="flex-1 bg-dark-bg rounded-lg py-3 items-center border border-dark-border"
        >
          <Text className="text-gray-400 text-[10px] mb-1">끝 (B)</Text>
          <Text className="text-white font-mono text-sm">
            {formatTime(endTime)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
