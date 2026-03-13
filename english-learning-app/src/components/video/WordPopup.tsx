import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface WordAnalysis {
  word: string;
  pronunciation?: string;
  meaning?: string;
  partOfSpeech?: string;
  exampleEn?: string;
  exampleKo?: string;
}

interface WordPopupProps {
  word: WordAnalysis | null;
  visible: boolean;
  onClose: () => void;
  onSave?: (word: WordAnalysis) => void;
  onPlayAudio?: (word: string) => void;
}

export default function WordPopup({
  word,
  visible,
  onClose,
  onSave,
  onPlayAudio,
}: WordPopupProps) {
  if (!word) return null;

  return (
    <Modal visible={visible} onClose={onClose} title="단어 상세">
      {/* Word and pronunciation */}
      <View className="items-center mb-4">
        <View className="flex-row items-center gap-3">
          <Text className="text-3xl font-bold text-white">{word.word}</Text>
          <TouchableOpacity
            onPress={() => onPlayAudio?.(word.word)}
            className="bg-primary/20 p-2 rounded-full"
          >
            <Ionicons name="volume-high" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        {word.pronunciation && (
          <Text className="text-gray-400 text-base mt-1">
            [{word.pronunciation}]
          </Text>
        )}
      </View>

      {/* Part of speech */}
      {word.partOfSpeech && (
        <View className="items-center mb-3">
          <Badge label={word.partOfSpeech} color="primary" size="sm" />
        </View>
      )}

      {/* Korean meaning */}
      {word.meaning && (
        <View className="bg-dark-bg rounded-xl p-4 mb-4">
          <Text className="text-gray-400 text-xs mb-1">뜻</Text>
          <Text className="text-white text-lg font-semibold">{word.meaning}</Text>
        </View>
      )}

      {/* Example sentence */}
      {word.exampleEn && (
        <View className="bg-dark-bg rounded-xl p-4 mb-6">
          <Text className="text-gray-400 text-xs mb-2">예문</Text>
          <Text className="text-white text-sm leading-5 mb-1">
            {word.exampleEn}
          </Text>
          {word.exampleKo && (
            <Text className="text-gray-400 text-sm leading-5">
              {word.exampleKo}
            </Text>
          )}
        </View>
      )}

      {/* Save button */}
      <Button
        title="단어장에 저장"
        onPress={() => onSave?.(word)}
        variant="primary"
        className="mb-2"
      />
    </Modal>
  );
}
