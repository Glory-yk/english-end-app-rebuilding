import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import { useStudyStore } from '../../stores/useStudyStore';
import type { ExtractedWord } from '../../utils/extractVocabulary';

interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definition: string;
  }[];
}

async function fetchDefinition(word: string): Promise<WordDefinition | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[0];
    return {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
      meanings: (entry.meanings || []).slice(0, 2).map((m: any) => ({
        partOfSpeech: m.partOfSpeech,
        definition: m.definitions?.[0]?.definition || '',
      })),
    };
  } catch {
    return null;
  }
}

interface VocabularyPanelProps {
  words: ExtractedWord[];
  visible: boolean;
  onClose: () => void;
  videoId?: string;
}

export default function VocabularyPanel({ words, visible, onClose, videoId }: VocabularyPanelProps) {
  const [selectedWord, setSelectedWord] = useState<ExtractedWord | null>(null);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [defLoading, setDefLoading] = useState(false);
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());

  const { saveWord, removeWord, isWordSaved } = useStudyStore();

  // Initialize learned state from study store
  useEffect(() => {
    const saved = new Set<string>();
    for (const w of words) {
      if (isWordSaved(w.word)) saved.add(w.word);
    }
    setLearnedWords(saved);
  }, [words]);

  useEffect(() => {
    if (!selectedWord) {
      setDefinition(null);
      return;
    }
    setDefLoading(true);
    fetchDefinition(selectedWord.word).then((def) => {
      setDefinition(def);
      setDefLoading(false);
    });
  }, [selectedWord?.word]);

  if (!visible) return null;

  const toggleLearned = async (word: string, item: ExtractedWord) => {
    const wasLearned = learnedWords.has(word);
    setLearnedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });

    if (wasLearned) {
      removeWord(word);
    } else {
      // Save to study store with definition
      const def = word === selectedWord?.word ? definition : await fetchDefinition(word);
      saveWord({
        word,
        phonetic: def?.phonetic,
        meanings: def?.meanings || [],
        sentences: item.sentences,
        videoId,
      });
    }
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-border">
        <View className="flex-row items-center gap-2">
          <Ionicons name="book" size={20} color="#3b82f6" />
          <Text className="text-white font-bold text-base">영상 단어 학습</Text>
          <View className="bg-primary/20 px-2 py-0.5 rounded-full">
            <Text className="text-primary text-xs font-bold">{words.length}개</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View className="px-4 py-2 flex-row items-center gap-2">
        <View className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
          <View
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${words.length > 0 ? (learnedWords.size / words.length) * 100 : 0}%` }}
          />
        </View>
        <Text className="text-gray-400 text-xs">{learnedWords.size}/{words.length}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Selected word detail */}
        {selectedWord && (
          <View className="px-4 py-3">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="text-white text-xl font-bold">{selectedWord.word}</Text>
                  {definition?.phonetic && (
                    <Text className="text-gray-400 text-sm">{definition.phonetic}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => toggleLearned(selectedWord.word, selectedWord)}
                  className={`px-3 py-1.5 rounded-lg ${learnedWords.has(selectedWord.word) ? 'bg-green-500/20' : 'bg-dark-card'}`}
                >
                  <Text className={`text-xs font-bold ${learnedWords.has(selectedWord.word) ? 'text-green-400' : 'text-gray-400'}`}>
                    {learnedWords.has(selectedWord.word) ? '저장됨' : '단어 저장'}
                  </Text>
                </TouchableOpacity>
              </View>

              {defLoading ? (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 8 }} />
              ) : definition ? (
                <View>
                  {definition.meanings.map((m, i) => (
                    <View key={i} className="mt-2">
                      <Text className="text-purple-400 text-xs font-bold">{m.partOfSpeech}</Text>
                      <Text className="text-gray-300 text-sm mt-0.5">{m.definition}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-gray-500 text-sm mt-1">사전 정보를 불러올 수 없습니다</Text>
              )}

              {/* Example sentences from captions */}
              {selectedWord.sentences.length > 0 && (
                <View className="mt-3 pt-3 border-t border-dark-border">
                  <Text className="text-gray-500 text-xs font-bold mb-1">영상 속 예문</Text>
                  {selectedWord.sentences.map((s, i) => (
                    <Text key={i} className="text-gray-400 text-xs mt-1 italic">"{s}"</Text>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={() => setSelectedWord(null)}
                className="mt-3 items-center"
              >
                <Text className="text-gray-500 text-xs">닫기</Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Word list */}
        <View className="px-4">
          {words.map((item, index) => {
            const isLearned = learnedWords.has(item.word);
            const isSelected = selectedWord?.word === item.word;

            return (
              <TouchableOpacity
                key={item.word}
                onPress={() => setSelectedWord(isSelected ? null : item)}
                activeOpacity={0.7}
                className={`flex-row items-center py-3 border-b border-dark-border ${isSelected ? 'bg-primary/5' : ''}`}
              >
                <Text className="text-gray-600 text-xs w-6">{index + 1}</Text>
                <View className="flex-1">
                  <Text className={`text-sm font-medium ${isLearned ? 'text-green-400 line-through' : 'text-white'}`}>
                    {item.word}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  {item.count > 1 && (
                    <View className="bg-dark-card px-1.5 py-0.5 rounded">
                      <Text className="text-gray-500 text-[10px]">x{item.count}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => toggleLearned(item.word, item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isLearned ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color={isLearned ? '#3b82f6' : '#64748b'}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
