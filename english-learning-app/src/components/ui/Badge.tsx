import React from 'react';
import { View, Text } from 'react-native';

type BadgeColor = 'primary' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  color?: BadgeColor;
  size?: BadgeSize;
}

const colorStyles: Record<BadgeColor, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/20', text: 'text-primary' },
  success: { bg: 'bg-success/20', text: 'text-success' },
  warning: { bg: 'bg-warning/20', text: 'text-warning' },
  danger: { bg: 'bg-danger/20', text: 'text-danger' },
};

const sizeStyles: Record<BadgeSize, { container: string; text: string }> = {
  sm: { container: 'px-2 py-0.5 rounded-md', text: 'text-[10px]' },
  md: { container: 'px-3 py-1 rounded-lg', text: 'text-xs' },
};

export default function Badge({ label, color = 'primary', size = 'md' }: BadgeProps) {
  const colors = colorStyles[color];
  const sizes = sizeStyles[size];

  return (
    <View className={`${colors.bg} ${sizes.container} self-start`}>
      <Text className={`${colors.text} ${sizes.text} font-semibold`}>{label}</Text>
    </View>
  );
}
