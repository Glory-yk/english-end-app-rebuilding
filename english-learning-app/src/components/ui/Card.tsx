import React from 'react';
import { View, TouchableOpacity, ViewProps } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export default function Card({ children, className = '', onPress }: CardProps) {
  const baseStyle = `bg-dark-card border border-dark-border rounded-2xl p-4 ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} className={baseStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View className={baseStyle}>{children}</View>;
}
