import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Card from '../../src/components/ui/Card';
import { useWatchHistoryStore } from '../../src/stores/useWatchHistoryStore';
import { useStudyStore } from '../../src/stores/useStudyStore';
import type { SavedWord } from '../../src/stores/useStudyStore';
import { getVideoCaptions } from '../../src/services/youtubeService';
import { extractVocabulary } from '../../src/utils/extractVocabulary';
import type { ExtractedWord } from '../../src/utils/extractVocabulary';

type StudyTab = 'overview' | 'flashcard' | 'quiz' | 'words';

function formatWatchTime(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}시간 ${rm}분` : `${h}시간`;
}

// Extract YouTube video ID from URL or plain ID
function parseVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Plain video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // YouTube URL patterns
  const urlMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (urlMatch) return urlMatch[1];
  return trimmed; // fallback: try as-is
}

// Generate fill-in-the-blank questions from caption sentences
interface BlankQuiz {
  sentence: string;
  blank: string;
  options: string[];
}

function generateBlankQuizzes(words: ExtractedWord[], allWords: ExtractedWord[]): BlankQuiz[] {
  const quizzes: BlankQuiz[] = [];

  for (const w of words) {
    if (w.sentences.length === 0) continue;
    const sentence = w.sentences[0];
    const regex = new RegExp(`\\b${w.word}\\b`, 'i');
    if (!regex.test(sentence)) continue;

    const blanked = sentence.replace(regex, '______');
    const others = allWords
      .filter((o) => o.word !== w.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((o) => o.word);

    if (others.length < 3) continue;

    const options = [w.word, ...others].sort(() => Math.random() - 0.5);
    quizzes.push({ sentence: blanked, blank: w.word, options });
  }

  return quizzes.sort(() => Math.random() - 0.5).slice(0, 10);
}

export default function StudyScreen() {
  const router = useRouter();
  const history = useWatchHistoryStore((s) => s.history);
  const {
    savedWords,
    saveWord,
    removeWord,
    isWordSaved,
    markReviewed,
    addQuizResult,
    getWordsForReview,
    getRecentQuizResults,
    getTotalWords,
    getMasteredCount,
    getLearningCount,
  } = useStudyStore();

  const [activeTab, setActiveTab] = useState<StudyTab>('overview');

  // Flashcard state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardScore, setFlashcardScore] = useState({ correct: 0, total: 0 });
  const reviewWords = getWordsForReview();

  // Quiz state
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<BlankQuiz[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizError, setQuizError] = useState('');

  // Video vocab loading
  const [vocabLoading, setVocabLoading] = useState(false);
  const [vocabError, setVocabError] = useState('');
  const [videoVocab, setVideoVocab] = useState<{ videoId: string; words: ExtractedWord[] } | null>(null);

  // Manual video input
  const [videoInput, setVideoInput] = useState('');

  const recentVideos = history.slice(0, 10);
  const recentResults = getRecentQuizResults(5);

  // Start flashcard review
  const startFlashcard = () => {
    setFlashcardIndex(0);
    setShowAnswer(false);
    setFlashcardScore({ correct: 0, total: 0 });
    setActiveTab('flashcard');
  };

  // Handle flashcard answer
  const handleFlashcardAnswer = (knew: boolean) => {
    const word = reviewWords[flashcardIndex];
    if (word) {
      markReviewed(word.word, knew);
      setFlashcardScore((prev) => ({
        correct: prev.correct + (knew ? 1 : 0),
        total: prev.total + 1,
      }));
    }
    setShowAnswer(false);
    if (flashcardIndex < reviewWords.length - 1) {
      setFlashcardIndex(flashcardIndex + 1);
    } else {
      addQuizResult({
        total: flashcardScore.total + 1,
        correct: flashcardScore.correct + (knew ? 1 : 0),
        type: 'flashcard',
      });
      setActiveTab('overview');
    }
  };

  // Load quiz from a video
  const loadQuizFromVideo = async (videoId: string) => {
    setQuizLoading(true);
    setQuizError('');
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizSelected(null);
    setQuizScore({ correct: 0, total: 0 });
    setQuizFinished(false);
    try {
      const res = await getVideoCaptions(videoId, 'en');
      if (!res.captions || res.captions.length === 0) {
        setQuizError('이 영상에는 자막이 없습니다');
        setQuizLoading(false);
        return;
      }
      const texts = res.captions.map((c) => c.text);
      const words = extractVocabulary(texts, 4, 30);
      if (words.length < 4) {
        setQuizError('퀴즈를 만들 단어가 부족합니다');
        setQuizLoading(false);
        return;
      }
      const quizzes = generateBlankQuizzes(words, words);
      if (quizzes.length === 0) {
        setQuizError('퀴즈를 생성할 수 없습니다');
        setQuizLoading(false);
        return;
      }
      setQuizQuestions(quizzes);
      setActiveTab('quiz');
    } catch (e: any) {
      console.error('[Quiz] Error:', e);
      setQuizError('자막을 불러오는 중 오류가 발생했습니다');
    }
    setQuizLoading(false);
  };

  // Handle quiz answer
  const handleQuizAnswer = (answer: string) => {
    if (quizSelected) return;
    setQuizSelected(answer);
    const current = quizQuestions[quizIndex];
    const isCorrect = answer === current.blank;
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleQuizNext = () => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(quizIndex + 1);
      setQuizSelected(null);
    } else {
      setQuizFinished(true);
      addQuizResult({
        total: quizScore.total,
        correct: quizScore.correct,
        type: 'fill_blank',
      });
    }
  };

  // Load vocabulary for a specific video
  const loadVideoVocab = async (videoId: string) => {
    setVocabLoading(true);
    setVocabError('');
    try {
      console.log('[Study] Loading captions for:', videoId);
      const res = await getVideoCaptions(videoId, 'en');
      console.log('[Study] Got captions:', res.captions?.length);
      if (!res.captions || res.captions.length === 0) {
        setVocabError('이 영상에는 자막이 없습니다');
        setVocabLoading(false);
        return;
      }
      const texts = res.captions.map((c) => c.text);
      const words = extractVocabulary(texts, 4, 50);
      console.log('[Study] Extracted words:', words.length);
      if (words.length === 0) {
        setVocabError('추출할 수 있는 단어가 없습니다');
        setVocabLoading(false);
        return;
      }
      setVideoVocab({ videoId, words });
      setActiveTab('words');
    } catch (e: any) {
      console.error('[Study] Error loading vocab:', e);
      setVocabError('자막을 불러오는 중 오류가 발생했습니다. 시간이 오래 걸릴 수 있으니 잠시 후 다시 시도해주세요.');
    }
    setVocabLoading(false);
  };

  // Handle manual video input
  const handleManualExtract = () => {
    const vid = parseVideoId(videoInput);
    if (!vid) {
      if (Platform.OS === 'web') window.alert('YouTube 영상 ID 또는 URL을 입력해주세요.');
      return;
    }
    loadVideoVocab(vid);
  };

  // Save word from video vocab
  const handleSaveVideoWord = async (item: ExtractedWord) => {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${item.word}`);
      if (res.ok) {
        const data = await res.json();
        const entry = data[0];
        saveWord({
          word: item.word,
          phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
          meanings: (entry.meanings || []).slice(0, 2).map((m: any) => ({
            partOfSpeech: m.partOfSpeech,
            definition: m.definitions?.[0]?.definition || '',
          })),
          sentences: item.sentences,
          videoId: videoVocab?.videoId,
        });
      } else {
        saveWord({
          word: item.word,
          meanings: [],
          sentences: item.sentences,
          videoId: videoVocab?.videoId,
        });
      }
    } catch {
      saveWord({
        word: item.word,
        meanings: [],
        sentences: item.sentences,
        videoId: videoVocab?.videoId,
      });
    }
  };

  // ─── Flashcard Mode ───
  if (activeTab === 'flashcard') {
    if (reviewWords.length === 0) {
      return (
        <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
          <View className="flex-row items-center px-5 pt-4 pb-3">
            <TouchableOpacity onPress={() => setActiveTab('overview')} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold">단어 복습</Text>
          </View>
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text className="text-white font-bold text-lg mt-4 text-center">복습할 단어가 없습니다</Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              영상에서 단어를 저장하면 여기서 복습할 수 있어요
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    const currentWord = reviewWords[flashcardIndex];
    return (
      <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
          <TouchableOpacity onPress={() => setActiveTab('overview')}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-white font-semibold">
            {flashcardIndex + 1} / {reviewWords.length}
          </Text>
          <Text className="text-green-400 font-bold">{flashcardScore.correct}점</Text>
        </View>

        <View className="px-5 mb-4">
          <View className="h-1.5 bg-dark-card rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${((flashcardIndex + 1) / reviewWords.length) * 100}%` }}
            />
          </View>
        </View>

        <View className="flex-1 px-5 justify-center">
          <TouchableOpacity onPress={() => setShowAnswer(true)} activeOpacity={0.8}>
            <Card className="p-8 items-center min-h-[280px] justify-center">
              <Text className="text-white text-3xl font-bold mb-2">{currentWord.word}</Text>
              {currentWord.phonetic && (
                <Text className="text-gray-500 text-base mb-4">{currentWord.phonetic}</Text>
              )}

              {showAnswer ? (
                <View className="items-center mt-4">
                  {currentWord.meanings.map((m, i) => (
                    <View key={i} className="mb-2 items-center">
                      <Text className="text-purple-400 text-xs font-bold">{m.partOfSpeech}</Text>
                      <Text className="text-gray-300 text-base text-center mt-1">{m.definition}</Text>
                    </View>
                  ))}
                  {currentWord.meanings.length === 0 && (
                    <Text className="text-gray-500 text-sm">사전 정보 없음</Text>
                  )}
                  {currentWord.sentences.length > 0 && (
                    <View className="mt-4 pt-4 border-t border-dark-border w-full">
                      <Text className="text-gray-500 text-xs font-bold mb-1 text-center">예문</Text>
                      <Text className="text-gray-400 text-sm text-center italic">
                        "{currentWord.sentences[0]}"
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="items-center mt-4">
                  <Ionicons name="eye-outline" size={32} color="#64748b" />
                  <Text className="text-gray-600 text-sm mt-2">탭하여 뜻 보기</Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>

          {showAnswer && (
            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => handleFlashcardAnswer(false)}
                className="flex-1 bg-red-500/20 border border-red-500/30 rounded-xl py-4 items-center"
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
                <Text className="text-red-400 font-bold text-sm mt-1">모르겠어요</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleFlashcardAnswer(true)}
                className="flex-1 bg-green-500/20 border border-green-500/30 rounded-xl py-4 items-center"
              >
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                <Text className="text-green-400 font-bold text-sm mt-1">알고 있어요</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Quiz Mode ───
  if (activeTab === 'quiz') {
    if (quizLoading) {
      return (
        <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center" edges={['top']}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-500 mt-3">퀴즈를 생성하는 중...</Text>
          <Text className="text-gray-600 text-xs mt-1">자막 처리에 시간이 걸릴 수 있습니다</Text>
        </SafeAreaView>
      );
    }

    if (quizQuestions.length === 0) {
      return (
        <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
          <View className="flex-row items-center px-5 pt-4 pb-3">
            <TouchableOpacity onPress={() => setActiveTab('overview')} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold">빈칸 채우기</Text>
          </View>
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="alert-circle-outline" size={48} color="#64748b" />
            <Text className="text-gray-500 mt-3 text-center">퀴즈를 생성할 수 없습니다</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (quizFinished) {
      const pct = quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 0;
      return (
        <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
          <View className="flex-1 items-center justify-center px-10">
            <View className="bg-primary/20 rounded-full p-6 mb-4">
              <Ionicons name="trophy" size={48} color="#3b82f6" />
            </View>
            <Text className="text-white text-2xl font-bold">퀴즈 완료!</Text>
            <Text className="text-gray-400 text-lg mt-2">
              {quizScore.total}문제 중 {quizScore.correct}개 정답
            </Text>
            <Text className="text-primary text-3xl font-bold mt-2">{pct}%</Text>
            <TouchableOpacity
              onPress={() => setActiveTab('overview')}
              className="bg-primary rounded-xl px-8 py-3 mt-8"
            >
              <Text className="text-white font-bold">돌아가기</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    const currentQ = quizQuestions[quizIndex];
    return (
      <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
        <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
          <TouchableOpacity onPress={() => setActiveTab('overview')}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-white font-semibold">
            {quizIndex + 1} / {quizQuestions.length}
          </Text>
          <Text className="text-green-400 font-bold">{quizScore.correct}점</Text>
        </View>

        <View className="px-5 mb-4">
          <View className="h-1.5 bg-dark-card rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }}
            />
          </View>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          <Card className="p-6 mb-6">
            <Text className="text-gray-500 text-xs font-bold mb-3">빈칸에 알맞은 단어를 고르세요</Text>
            <Text className="text-white text-lg leading-7">{currentQ.sentence}</Text>
          </Card>

          <View className="gap-3">
            {currentQ.options.map((opt) => {
              let bg = 'bg-dark-card border-dark-border';
              if (quizSelected) {
                if (opt === currentQ.blank) bg = 'bg-green-500/20 border-green-500';
                else if (opt === quizSelected) bg = 'bg-red-500/20 border-red-500';
              }

              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => handleQuizAnswer(opt)}
                  disabled={!!quizSelected}
                  className={`border rounded-xl py-4 px-5 ${bg}`}
                >
                  <Text className="text-white text-base font-medium">{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {quizSelected && (
            <TouchableOpacity
              onPress={handleQuizNext}
              className="bg-primary rounded-xl py-4 items-center mt-6"
            >
              <Text className="text-white font-bold">
                {quizIndex < quizQuestions.length - 1 ? '다음 문제' : '결과 보기'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Words from Video Mode ───
  if (activeTab === 'words' && videoVocab) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <TouchableOpacity onPress={() => { setActiveTab('overview'); setVideoVocab(null); }} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold flex-1">영상 단어</Text>
          <View className="bg-primary/20 px-2.5 py-1 rounded-full">
            <Text className="text-primary text-xs font-bold">{videoVocab.words.length}개</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }}>
          {videoVocab.words.map((item, index) => {
            const saved = isWordSaved(item.word);
            return (
              <View
                key={item.word}
                className="flex-row items-center py-3 border-b border-dark-border"
              >
                <Text className="text-gray-600 text-xs w-7">{index + 1}</Text>
                <View className="flex-1">
                  <Text className={`text-sm font-medium ${saved ? 'text-green-400' : 'text-white'}`}>
                    {item.word}
                  </Text>
                  {item.sentences.length > 0 && (
                    <Text className="text-gray-600 text-xs mt-0.5" numberOfLines={1}>
                      "{item.sentences[0]}"
                    </Text>
                  )}
                </View>
                {item.count > 1 && (
                  <View className="bg-dark-card px-1.5 py-0.5 rounded mr-2">
                    <Text className="text-gray-500 text-[10px]">x{item.count}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => saved ? removeWord(item.word) : handleSaveVideoWord(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={saved ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={saved ? '#3b82f6' : '#64748b'}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Overview Mode ───
  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-white text-2xl font-bold">학습</Text>
          <Text className="text-gray-500 text-sm mt-1">단어 복습과 퀴즈로 실력을 키워보세요</Text>
        </View>

        {/* Stats cards */}
        <View className="flex-row px-5 mt-3 gap-3">
          <Card className="flex-1 p-4 items-center">
            <View className="bg-blue-500/20 rounded-full p-2 mb-2">
              <Ionicons name="book" size={20} color="#3b82f6" />
            </View>
            <Text className="text-white text-xl font-bold">{getTotalWords()}</Text>
            <Text className="text-gray-500 text-xs">저장된 단어</Text>
          </Card>
          <Card className="flex-1 p-4 items-center">
            <View className="bg-yellow-500/20 rounded-full p-2 mb-2">
              <Ionicons name="refresh" size={20} color="#eab308" />
            </View>
            <Text className="text-white text-xl font-bold">{getLearningCount()}</Text>
            <Text className="text-gray-500 text-xs">학습 중</Text>
          </Card>
          <Card className="flex-1 p-4 items-center">
            <View className="bg-green-500/20 rounded-full p-2 mb-2">
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
            <Text className="text-white text-xl font-bold">{getMasteredCount()}</Text>
            <Text className="text-gray-500 text-xs">마스터</Text>
          </Card>
        </View>

        {/* Manual video input for vocabulary extraction */}
        <View className="px-5 mt-5">
          <Text className="text-white font-bold text-base mb-3">영상 단어 추출</Text>
          <Card className="p-4">
            <Text className="text-gray-400 text-xs mb-2">
              YouTube 영상 URL 또는 ID를 입력하면 자막에서 단어를 추출합니다
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-white text-sm"
                placeholder="YouTube URL 또는 영상 ID"
                placeholderTextColor="#64748b"
                value={videoInput}
                onChangeText={setVideoInput}
                onSubmitEditing={handleManualExtract}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={handleManualExtract}
                disabled={vocabLoading}
                className="bg-primary rounded-xl px-4 items-center justify-center"
              >
                {vocabLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {vocabLoading && (
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-gray-500 text-xs">
                  자막을 불러오는 중... (첫 로딩 시 1~2분 소요)
                </Text>
              </View>
            )}
            {vocabError !== '' && !vocabLoading && (
              <Text className="text-red-400 text-xs mt-2">{vocabError}</Text>
            )}
          </Card>
        </View>

        {/* Flashcard Review Button */}
        <View className="px-5 mt-5">
          <TouchableOpacity
            onPress={startFlashcard}
            className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-4 flex-row items-center"
          >
            <View className="bg-purple-600 rounded-full p-2.5 mr-3">
              <Ionicons name="albums" size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">단어 복습</Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                {reviewWords.length > 0
                  ? `${reviewWords.length}개 단어 복습 대기 중`
                  : '저장된 단어를 플래시카드로 복습'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#a78bfa" />
          </TouchableOpacity>
        </View>

        {/* Saved Words List */}
        {savedWords.length > 0 && (
          <View className="px-5 mt-5">
            <Text className="text-white font-bold text-base mb-3">저장된 단어</Text>
            {savedWords.slice(0, 10).map((w) => (
              <Card key={w.word} className="mb-2 p-3">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white font-bold text-sm">{w.word}</Text>
                      {w.phonetic && (
                        <Text className="text-gray-500 text-xs">{w.phonetic}</Text>
                      )}
                      {w.mastered && (
                        <View className="bg-green-500/20 px-1.5 py-0.5 rounded">
                          <Text className="text-green-400 text-[10px] font-bold">마스터</Text>
                        </View>
                      )}
                    </View>
                    {w.meanings.length > 0 && (
                      <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                        {w.meanings[0].definition}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeWord(w.word)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
            {savedWords.length > 10 && (
              <Text className="text-gray-500 text-xs text-center mt-1">
                외 {savedWords.length - 10}개 단어
              </Text>
            )}
          </View>
        )}

        {/* Quiz from Videos */}
        {recentVideos.length > 0 && (
          <View className="px-5 mt-5">
            <Text className="text-white font-bold text-base mb-3">시청한 영상으로 학습</Text>
            {recentVideos.map((video) => (
              <Card key={video.youtubeId} className="mb-2 p-0 overflow-hidden">
                <View className="flex-row">
                  <Image
                    source={{ uri: video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg` }}
                    style={{ width: 120, height: 68 }}
                    contentFit="cover"
                  />
                  <View className="flex-1 p-2.5 justify-center">
                    <Text className="text-white text-xs font-medium" numberOfLines={2}>
                      {video.title}
                    </Text>
                    <Text className="text-gray-600 text-[10px] mt-0.5">
                      {formatWatchTime(video.watchedSeconds)} 시청
                    </Text>
                  </View>
                  <View className="flex-row items-center pr-2 gap-1">
                    <TouchableOpacity
                      onPress={() => loadVideoVocab(video.youtubeId)}
                      className="bg-blue-500/20 rounded-lg p-2"
                      disabled={vocabLoading}
                    >
                      <Ionicons name="book-outline" size={14} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => loadQuizFromVideo(video.youtubeId)}
                      className="bg-green-500/20 rounded-lg p-2"
                      disabled={quizLoading}
                    >
                      <Ionicons name="help-circle-outline" size={14} color="#22c55e" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}

            {/* Error messages */}
            {quizError !== '' && !quizLoading && (
              <Text className="text-red-400 text-xs mt-1">{quizError}</Text>
            )}
          </View>
        )}

        {/* Recent Quiz Results */}
        {recentResults.length > 0 && (
          <View className="px-5 mt-5">
            <Text className="text-white font-bold text-base mb-3">최근 퀴즈 결과</Text>
            {recentResults.map((result, i) => {
              const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
              const dateStr = new Date(result.date).toLocaleDateString('ko-KR');
              return (
                <Card key={i} className="mb-2 p-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-dark-bg w-9 h-9 rounded-xl items-center justify-center">
                        <Ionicons
                          name={result.type === 'flashcard' ? 'albums' : 'help-circle'}
                          size={16}
                          color="#3b82f6"
                        />
                      </View>
                      <View>
                        <Text className="text-white text-sm font-semibold">
                          {result.type === 'flashcard' ? '플래시카드' : '빈칸 채우기'}
                        </Text>
                        <Text className="text-gray-600 text-xs">
                          {dateStr} · {result.total}문제 중 {result.correct}정답
                        </Text>
                      </View>
                    </View>
                    <Text className={`font-bold text-lg ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {pct}%
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Global loading indicators */}
        {(vocabLoading || quizLoading) && (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text className="text-gray-500 text-xs mt-2">
              {vocabLoading ? '단어를 추출하는 중... (1~2분 소요)' : '퀴즈를 생성하는 중...'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
