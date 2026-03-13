import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

interface BigIconButtonProps {
  icon: string;
  label?: string;
  color: string;
  size: number;
  onPress: () => void;
}

export default function BigIconButton({ icon, label, color, size, onPress }: BigIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        width: size + 20,
        alignItems: 'center',
      }}
    >
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '30',
        borderWidth: 3,
        borderColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: color,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
      }}>
        <Text style={{ fontSize: size * 0.45 }}>{icon}</Text>
      </View>
      {label ? (
        <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' }}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
