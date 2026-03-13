import React from 'react';
import { View, Text } from 'react-native';

interface StreakBadgeProps {
  days: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { container: 'px-2 py-1 rounded-lg', fire: 'text-sm', text: 'text-xs' },
  md: { container: 'px-3 py-1.5 rounded-xl', fire: 'text-base', text: 'text-sm' },
  lg: { container: 'px-4 py-2 rounded-xl', fire: 'text-xl', text: 'text-base' },
};

export default function StreakBadge({ days, size = 'md' }: StreakBadgeProps) {
  const config = sizeConfig[size];
  const bgColor = days > 0 ? 'bg-warning/20' : 'bg-dark-bg';
  const textColor = days > 0 ? 'text-warning' : 'text-gray-500';

  return (
    <View className={`flex-row items-center gap-1 ${bgColor} ${config.container}`}>
      <Text className={config.fire}>{days > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}</Text>
      <Text className={`${textColor} ${config.text} font-bold`}>
        {days}일 연속
      </Text>
    </View>
  );
}
