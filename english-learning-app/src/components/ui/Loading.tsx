import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingProps {
  message?: string;
}

export default function Loading({ message }: LoadingProps) {
  return (
    <View className="flex-1 items-center justify-center bg-dark-bg">
      <ActivityIndicator size="large" color="#3b82f6" />
      {message && (
        <Text className="text-gray-400 text-sm mt-4">{message}</Text>
      )}
    </View>
  );
}
