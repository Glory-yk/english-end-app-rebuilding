import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

interface ParentalLockScreenProps {
  onUnlock: () => void;
  onCancel: () => void;
}

const PIN = '1234'; // Default PIN

export default function ParentalLockScreen({ onUnlock, onCancel }: ParentalLockScreenProps) {
  const [entered, setEntered] = useState('');

  const handlePress = (digit: string) => {
    const newPin = entered + digit;
    setEntered(newPin);
    if (newPin.length === 4) {
      if (newPin === PIN) {
        onUnlock();
      } else {
        Alert.alert('잘못된 PIN', '다시 시도해주세요');
        setEntered('');
      }
    }
  };

  const handleDelete = () => {
    setEntered(prev => prev.slice(0, -1));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8E7', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8 }}>부모 인증</Text>
      <Text style={{ fontSize: 14, color: '#888', marginBottom: 30 }}>PIN 4자리를 입력하세요</Text>

      {/* PIN dots */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 40 }}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{
            width: 20, height: 20, borderRadius: 10,
            backgroundColor: i < entered.length ? '#333' : '#ddd',
          }} />
        ))}
      </View>

      {/* Number pad */}
      <View style={{ gap: 12 }}>
        {[[1,2,3],[4,5,6],[7,8,9],['',0,'⌫']].map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 12 }}>
            {row.map((num, ci) => (
              <TouchableOpacity
                key={ci}
                onPress={() => {
                  if (num === '⌫') handleDelete();
                  else if (num !== '') handlePress(String(num));
                }}
                disabled={num === ''}
                style={{
                  width: 72, height: 72, borderRadius: 36,
                  backgroundColor: num === '' ? 'transparent' : '#fff',
                  borderWidth: num === '' ? 0 : 1, borderColor: '#ddd',
                  justifyContent: 'center', alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: num === '⌫' ? 22 : 28, fontWeight: '600', color: '#333' }}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onCancel} style={{ marginTop: 24 }}>
        <Text style={{ color: '#999', fontSize: 14 }}>취소</Text>
      </TouchableOpacity>
    </View>
  );
}
