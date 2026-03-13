import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface WordInfo {
  word: string;
  meaning?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  exampleEn?: string;
  exampleKo?: string;
}

interface SubtitleData {
  text: string;
  translation?: string;
  words?: WordInfo[];
}

interface SubtitleOverlayProps {
  subtitle: SubtitleData | null;
  showKorean: boolean;
  onWordTap?: (word: WordInfo) => void;
}

export default function SubtitleOverlay({
  subtitle,
  showKorean,
  onWordTap,
}: SubtitleOverlayProps) {
  if (!subtitle) {
    return (
      <View className="min-h-[80px] justify-center items-center px-4 py-3">
        <Text className="text-gray-600 text-sm">...</Text>
      </View>
    );
  }

  // Split text into words and match with word info
  const textWords = subtitle.text.split(/\s+/);

  const findWordInfo = (w: string): WordInfo | undefined => {
    if (!subtitle.words) return undefined;
    const cleaned = w.replace(/[.,!?;:'"()]/g, '').toLowerCase();
    return subtitle.words.find(
      (wi) => wi.word.toLowerCase() === cleaned,
    );
  };

  return (
    <View className="bg-dark-card/90 border border-dark-border rounded-xl mx-4 px-4 py-3 min-h-[80px] justify-center">
      {/* English text with tappable words */}
      <View className="flex-row flex-wrap justify-center gap-1">
        {textWords.map((w, index) => {
          const wordInfo = findWordInfo(w);
          const hasMeaning = !!wordInfo;

          return (
            <TouchableOpacity
              key={`${w}-${index}`}
              onPress={() => {
                if (wordInfo && onWordTap) {
                  onWordTap(wordInfo);
                }
              }}
              disabled={!hasMeaning}
              activeOpacity={0.6}
            >
              <Text
                className={`text-base ${
                  hasMeaning
                    ? 'text-primary font-semibold underline'
                    : 'text-white'
                }`}
              >
                {w}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Korean translation */}
      {showKorean && subtitle.translation && (
        <Text className="text-gray-400 text-sm text-center mt-2">
          {subtitle.translation}
        </Text>
      )}
    </View>
  );
}
