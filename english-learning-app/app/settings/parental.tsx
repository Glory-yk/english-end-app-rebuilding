import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';

const PIN_LENGTH = 4;

export default function ParentalControlScreen() {
  const router = useRouter();
  const [isSetup, setIsSetup] = useState(false);
  const [pin, setPin] = useState<string[]>([]);
  const [confirmPin, setConfirmPin] = useState<string[]>([]);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [savedPin, setSavedPin] = useState<string | null>(null);

  const handlePinPress = (digit: string) => {
    if (step === 'enter') {
      if (pin.length < PIN_LENGTH) {
        const newPin = [...pin, digit];
        setPin(newPin);

        if (newPin.length === PIN_LENGTH) {
          if (savedPin) {
            // Verifying existing PIN
            if (newPin.join('') === savedPin) {
              Alert.alert('성공', 'PIN이 확인되었습니다.');
              setPin([]);
            } else {
              Alert.alert('오류', 'PIN이 일치하지 않습니다.');
              setPin([]);
            }
          } else {
            // Setting new PIN - move to confirm
            setStep('confirm');
          }
        }
      }
    } else {
      if (confirmPin.length < PIN_LENGTH) {
        const newConfirm = [...confirmPin, digit];
        setConfirmPin(newConfirm);

        if (newConfirm.length === PIN_LENGTH) {
          if (newConfirm.join('') === pin.join('')) {
            setSavedPin(pin.join(''));
            setIsSetup(true);
            setPin([]);
            setConfirmPin([]);
            setStep('enter');
            Alert.alert('완료', 'PIN이 설정되었습니다.');
          } else {
            Alert.alert('오류', 'PIN이 일치하지 않습니다. 다시 시도해주세요.');
            setPin([]);
            setConfirmPin([]);
            setStep('enter');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleResetPin = () => {
    Alert.alert(
      'PIN 초기화',
      'PIN을 초기화하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '초기화', style: 'destructive', onPress: () => {
          setSavedPin(null);
          setIsSetup(false);
          setPin([]);
          setConfirmPin([]);
          setStep('enter');
        }},
      ],
    );
  };

  const currentPin = step === 'enter' ? pin : confirmPin;

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">부모 잠금</Text>
      </View>

      <View className="flex-1 items-center px-5 pt-8">
        {/* Lock icon */}
        <View className="bg-primary/20 w-16 h-16 rounded-full items-center justify-center mb-6">
          <Ionicons name="lock-closed" size={32} color="#3b82f6" />
        </View>

        {/* Status / Instructions */}
        <Text className="text-white text-lg font-bold mb-2">
          {savedPin ? 'PIN 입력' : step === 'enter' ? 'PIN 설정' : 'PIN 확인'}
        </Text>
        <Text className="text-gray-400 text-sm text-center mb-8">
          {savedPin
            ? '설정한 PIN 4자리를 입력하세요'
            : step === 'enter'
              ? '새 PIN 4자리를 입력하세요'
              : 'PIN을 다시 한번 입력하세요'}
        </Text>

        {/* PIN dots */}
        <View className="flex-row gap-4 mb-10">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              className={`w-4 h-4 rounded-full ${i < currentPin.length ? 'bg-primary' : 'bg-dark-card border border-dark-border'}`}
            />
          ))}
        </View>

        {/* Numpad */}
        <View className="w-full max-w-[280px]">
          <View className="flex-row flex-wrap justify-center">
            {digits.map((digit, i) => {
              if (digit === '') {
                return <View key={i} style={{ width: 72, height: 72, margin: 6 }} />;
              }
              if (digit === 'del') {
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={handleDelete}
                    style={{ width: 72, height: 72, margin: 6 }}
                    className="items-center justify-center rounded-2xl bg-dark-card"
                    activeOpacity={0.6}
                  >
                    <Ionicons name="backspace-outline" size={24} color="#64748b" />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handlePinPress(digit)}
                  style={{ width: 72, height: 72, margin: 6 }}
                  className="items-center justify-center rounded-2xl bg-dark-card border border-dark-border"
                  activeOpacity={0.6}
                >
                  <Text className="text-white text-2xl font-semibold">{digit}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reset button */}
        {savedPin && (
          <TouchableOpacity onPress={handleResetPin} className="mt-6">
            <Text className="text-danger text-sm">PIN 초기화</Text>
          </TouchableOpacity>
        )}

        {/* Current status */}
        <View className="mt-8 w-full">
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Ionicons name="shield-checkmark" size={20} color={isSetup ? '#10b981' : '#64748b'} />
                <View>
                  <Text className="text-white text-sm font-semibold">부모 잠금 상태</Text>
                  <Text className="text-gray-500 text-xs">{isSetup ? '활성화됨' : '비활성화됨'}</Text>
                </View>
              </View>
              <View className={`w-3 h-3 rounded-full ${isSetup ? 'bg-success' : 'bg-gray-600'}`} />
            </View>
          </Card>
        </View>
      </View>
    </SafeAreaView>
  );
}
