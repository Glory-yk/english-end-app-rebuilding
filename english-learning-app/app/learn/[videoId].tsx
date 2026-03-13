import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import YouTubePlayer from '../../src/components/video/YouTubePlayer';
import type { YouTubePlayerHandle } from '../../src/components/video/YouTubePlayer';
import SubtitleOverlay from '../../src/components/video/SubtitleOverlay';
import WordPopup from '../../src/components/video/WordPopup';
import LoopControl from '../../src/components/video/LoopControl';
import SpeakingPractice from '../../src/components/speaking/SpeakingPractice';
import VocabularyPanel from '../../src/components/learning/VocabularyPanel';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import { useSubtitleSync } from '../../src/hooks/useSubtitleSync';
import { extractVocabulary } from '../../src/utils/extractVocabulary';
import type { ExtractedWord } from '../../src/utils/extractVocabulary';
import { useVideoStore } from '../../src/stores/useVideoStore';
import { useWatchHistoryStore } from '../../src/stores/useWatchHistoryStore';
import { getVideoCaptions } from '../../src/services/youtubeService';
import type { Caption } from '../../src/services/youtubeService';

interface SubtitleEntry {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  translation?: string;
  words?: any[];
}

export default function LearnScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const router = useRouter();
  const ytPlayerRef = useRef<YouTubePlayerHandle>(null);
  const segmentEndRef = useRef<number | null>(null);
  const segmentCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showKorean, setShowKorean] = useState(true);
  const [speakingMode, setSpeakingMode] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [showWordPopup, setShowWordPopup] = useState(false);
  const [vocabMode, setVocabMode] = useState(false);
  const [extractedWords, setExtractedWords] = useState<ExtractedWord[]>([]);

  // Real subtitles from API
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [captionsLoading, setCaptionsLoading] = useState(true);
  const [captionsError, setCaptionsError] = useState('');

  const { setCurrentTime, loopStart, loopEnd, isLooping, setLoop, toggleLoop } = useVideoStore();
  const { addToHistory, startSession, endSession, tickSession } = useWatchHistoryStore();
  const { currentSubtitle, updateTime } = useSubtitleSync(subtitles);

  const updateTimeRef = useRef(updateTime);
  const setCurrentTimeRef = useRef(setCurrentTime);
  const watchTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  updateTimeRef.current = updateTime;
  setCurrentTimeRef.current = setCurrentTime;

  // Watch time tracking
  useEffect(() => {
    if (!videoId) return;
    addToHistory({
      youtubeId: videoId,
      title: videoId, // Will be updated when we have more info
      channelName: '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      watchedSeconds: 0,
      totalSeconds: 0,
    });
    startSession(videoId);
    return () => {
      endSession();
      if (watchTickRef.current) clearInterval(watchTickRef.current);
    };
  }, [videoId]);

  // Fetch real captions when video loads
  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;
    setCaptionsLoading(true);
    setCaptionsError('');

    getVideoCaptions(videoId, 'en')
      .then((res) => {
        if (cancelled) return;
        if (!res.captions || res.captions.length === 0) {
          setCaptionsError('이 영상에는 영어 자막이 없습니다. 영어 자막이 있는 영상을 선택해주세요.');
          setSubtitles([]);
        } else {
          // Group short captions into sentence-level chunks for better speaking practice
          const grouped = groupCaptions(res.captions);
          setSubtitles(grouped);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Caption fetch error:', err);
        setCaptionsError('자막을 불러올 수 없습니다');
        setSubtitles([]);
      })
      .finally(() => {
        if (!cancelled) setCaptionsLoading(false);
      });

    return () => { cancelled = true; };
  }, [videoId]);

  // Extract vocabulary when subtitles are loaded
  useEffect(() => {
    if (subtitles.length > 0) {
      const texts = subtitles.map((s) => s.text);
      console.log('[Vocab] Extracting from', texts.length, 'subtitles. Sample:', texts[0]);
      const words = extractVocabulary(texts);
      console.log('[Vocab] Extracted', words.length, 'words:', words.slice(0, 5).map(w => w.word));
      setExtractedWords(words);
    }
  }, [subtitles]);

  const handleTimeChange = useCallback((time: number) => {
    updateTimeRef.current(time);
    setCurrentTimeRef.current(time);

    // Auto-pause when segment end is reached (for speaking practice)
    if (segmentEndRef.current !== null && time >= segmentEndRef.current) {
      ytPlayerRef.current?.pause();
      segmentEndRef.current = null;
      if (segmentCheckRef.current) {
        clearInterval(segmentCheckRef.current);
        segmentCheckRef.current = null;
      }
    }
  }, []);

  const handleWordTap = useCallback((word: any) => {
    setSelectedWord(word);
    setShowWordPopup(true);
  }, []);

  const handleSaveWord = useCallback(() => {
    setShowWordPopup(false);
  }, []);

  // Play a specific segment of the YouTube video
  const handlePlaySegment = useCallback((startSec: number, endSec: number) => {
    if (!ytPlayerRef.current) return;

    if (segmentCheckRef.current) {
      clearInterval(segmentCheckRef.current);
    }

    segmentEndRef.current = endSec;
    ytPlayerRef.current.seekTo(startSec);
    ytPlayerRef.current.play();

    segmentCheckRef.current = setInterval(async () => {
      if (!ytPlayerRef.current || segmentEndRef.current === null) {
        if (segmentCheckRef.current) clearInterval(segmentCheckRef.current);
        return;
      }
      try {
        const currentTime = await ytPlayerRef.current.getCurrentTime();
        if (currentTime >= segmentEndRef.current) {
          ytPlayerRef.current.pause();
          segmentEndRef.current = null;
          if (segmentCheckRef.current) {
            clearInterval(segmentCheckRef.current);
            segmentCheckRef.current = null;
          }
        }
      } catch {}
    }, 200);
  }, []);

  // Tap a subtitle to seek to that time
  const handleSubtitleTap = useCallback((sub: SubtitleEntry) => {
    const startSec = sub.startMs / 1000;
    ytPlayerRef.current?.seekTo(startSec);
    ytPlayerRef.current?.play();
  }, []);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-base font-semibold flex-1" numberOfLines={1}>
          {vocabMode ? '단어 학습' : speakingMode ? '스피킹 연습' : '영상 학습'}
        </Text>
        {subtitles.length > 0 && !vocabMode && (
          <TouchableOpacity
            onPress={() => { setSpeakingMode(!speakingMode); setSpeakingIndex(0); }}
            className={`px-3 py-1.5 rounded-lg border mr-2 ${speakingMode ? 'bg-purple-600 border-purple-500' : 'bg-dark-card border-dark-border'}`}
          >
            <View className="flex-row items-center gap-1">
              <Ionicons name="mic" size={14} color={speakingMode ? '#fff' : '#94a3b8'} />
              <Text className={`text-xs ${speakingMode ? 'text-white font-bold' : 'text-gray-300'}`}>스피킹</Text>
            </View>
          </TouchableOpacity>
        )}
        {extractedWords.length > 0 && !speakingMode && (
          <TouchableOpacity
            onPress={() => setVocabMode(!vocabMode)}
            className={`px-3 py-1.5 rounded-lg border mr-2 ${vocabMode ? 'bg-blue-600 border-blue-500' : 'bg-dark-card border-dark-border'}`}
          >
            <View className="flex-row items-center gap-1">
              <Ionicons name="book" size={14} color={vocabMode ? '#fff' : '#94a3b8'} />
              <Text className={`text-xs ${vocabMode ? 'text-white font-bold' : 'text-gray-300'}`}>단어</Text>
            </View>
          </TouchableOpacity>
        )}
        {!speakingMode && !vocabMode && (
          <TouchableOpacity onPress={() => setShowKorean(!showKorean)} className="bg-dark-card px-3 py-1.5 rounded-lg border border-dark-border">
            <Text className="text-xs text-gray-300">{showKorean ? '한/영' : '영어만'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* YouTube Player */}
      <YouTubePlayer
        ref={ytPlayerRef}
        videoId={videoId || 'dQw4w9WgXcQ'}
        onTimeChange={handleTimeChange}
        onStateChange={(state: string) => {
          if (state === 'playing') {
            isPlayingRef.current = true;
            if (!watchTickRef.current) {
              watchTickRef.current = setInterval(() => {
                if (isPlayingRef.current) tickSession(1);
              }, 1000);
            }
          } else {
            isPlayingRef.current = false;
          }
        }}
      />

      {vocabMode && extractedWords.length > 0 ? (
        /* Vocabulary Learning Mode */
        <VocabularyPanel
          words={extractedWords}
          visible={true}
          onClose={() => setVocabMode(false)}
          videoId={videoId}
        />
      ) : speakingMode && subtitles.length > 0 ? (
        /* Speaking Practice Mode */
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Progress indicator */}
          <View className="flex-row px-4 pt-3 pb-1 gap-1">
            {subtitles.map((_, i) => (
              <View
                key={i}
                className={`h-1 rounded-full ${i === speakingIndex ? 'bg-purple-500' : i < speakingIndex ? 'bg-purple-800' : 'bg-dark-border'}`}
                style={{ flex: 1, maxWidth: 280 / Math.min(subtitles.length, 30) }}
              />
            ))}
          </View>
          <Text className="text-gray-500 text-xs text-center mt-1 mb-2">
            {speakingIndex + 1} / {subtitles.length} 문장
          </Text>

          <SpeakingPractice
            subtitle={subtitles[speakingIndex]}
            onNext={() => setSpeakingIndex(Math.min(speakingIndex + 1, subtitles.length - 1))}
            onPrev={() => setSpeakingIndex(Math.max(speakingIndex - 1, 0))}
            hasNext={speakingIndex < subtitles.length - 1}
            hasPrev={speakingIndex > 0}
            onPlaySegment={handlePlaySegment}
          />
        </ScrollView>
      ) : (
        /* Normal Learning Mode */
        <>
          {/* Subtitle Area */}
          <View className="min-h-[80px] px-4 py-3 border-b border-dark-border">
            {currentSubtitle ? (
              <SubtitleOverlay subtitle={currentSubtitle} showKorean={showKorean} onWordTap={handleWordTap} />
            ) : (
              <View className="items-center justify-center py-3">
                <Text className="text-gray-600 text-sm">
                  {captionsLoading ? '자막 로딩 중...' : '영상을 재생하면 자막이 표시됩니다'}
                </Text>
              </View>
            )}
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Loop Control */}
            <View className="px-4 py-3">
              <LoopControl
                startTime={loopStart}
                endTime={loopEnd}
                isLooping={isLooping}
                loopCount={0}
                onSetStart={() => setLoop(0, loopEnd)}
                onSetEnd={() => setLoop(loopStart, 10)}
                onToggleLoop={toggleLoop}
              />
            </View>

            {/* Speaking Practice Entry */}
            {subtitles.length > 0 && (
              <View className="px-4 mb-2">
                <TouchableOpacity
                  onPress={() => { setSpeakingMode(true); setSpeakingIndex(0); }}
                  className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-4 flex-row items-center"
                >
                  <View className="bg-purple-600 rounded-full p-2 mr-3">
                    <Ionicons name="mic" size={20} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">스피킹 연습</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      {subtitles.length}개 문장으로 발음을 연습해보세요
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#a78bfa" />
                </TouchableOpacity>
              </View>
            )}

            {/* Vocabulary Learning Entry */}
            {extractedWords.length > 0 && (
              <View className="px-4 mb-2">
                <TouchableOpacity
                  onPress={() => setVocabMode(true)}
                  className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 flex-row items-center"
                >
                  <View className="bg-blue-600 rounded-full p-2 mr-3">
                    <Ionicons name="book" size={20} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">단어 학습</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      영상에서 추출된 {extractedWords.length}개 단어를 학습하세요
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#60a5fa" />
                </TouchableOpacity>
              </View>
            )}

            {/* All Subtitles */}
            <View className="px-4 mt-2">
              <Text className="text-white font-bold text-base mb-3">
                전체 자막 {subtitles.length > 0 ? `(${subtitles.length})` : ''}
              </Text>

              {captionsLoading && (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-gray-500 mt-3 text-sm">자막을 불러오는 중...</Text>
                </View>
              )}

              {captionsError && !captionsLoading && (
                <View className="items-center py-8">
                  <Ionicons name="alert-circle-outline" size={40} color="#64748b" />
                  <Text className="text-gray-500 mt-3 text-sm">{captionsError}</Text>
                </View>
              )}

              {subtitles.map((sub) => (
                <TouchableOpacity key={sub.id} onPress={() => handleSubtitleTap(sub)} activeOpacity={0.7}>
                  <Card className="mb-2 p-3">
                    <Text className="text-gray-600 text-[10px] mb-1">{formatTime(sub.startMs)}</Text>
                    <Text className="text-white text-sm leading-5">{sub.text}</Text>
                    {showKorean && sub.translation && (
                      <Text className="text-gray-400 text-xs mt-1">{sub.translation}</Text>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quiz Button */}
            {subtitles.length > 0 && (
              <View className="px-4 mt-4">
                <Button title="퀴즈 풀기" onPress={() => router.push('/(tabs)/quiz')} variant="primary" />
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Word Popup */}
      <WordPopup
        word={selectedWord}
        visible={showWordPopup}
        onClose={() => setShowWordPopup(false)}
        onSave={handleSaveWord}
      />
    </SafeAreaView>
  );
}

/**
 * Group captions into sentence-level chunks for speaking practice.
 *
 * If the backend already restored punctuation (sentences end with . ! ?),
 * we simply merge consecutive captions into full sentences.
 * Otherwise, fall back to duration-based grouping.
 */
function groupCaptions(captions: Caption[]): SubtitleEntry[] {
  if (captions.length === 0) return [];

  const allText = captions.map(c => c.text).join(' ');
  const punctCount = (allText.match(/[.!?]/g) || []).length;
  const hasPunctuation = punctCount >= 3;

  if (hasPunctuation) {
    return groupByPunctuation(captions);
  } else {
    return groupByDuration(captions);
  }
}

/** For captions WITH punctuation — each caption is already a sentence from backend */
function groupByPunctuation(captions: Caption[]): SubtitleEntry[] {
  const MAX_DURATION_MS = 15000;
  const result: SubtitleEntry[] = [];
  let currentText = '';
  let startMs = 0;
  let endMs = 0;

  const abbrevPattern = /(?:Mr|Mrs|Ms|Dr|Jr|Sr|St|vs|etc|e\.g|i\.e)\.\s*$/i;

  for (let i = 0; i < captions.length; i++) {
    const cap = captions[i];
    if (!currentText) startMs = cap.startMs;
    currentText += (currentText ? ' ' : '') + cap.text.replace(/\n/g, ' ');
    endMs = cap.endMs;

    const trimmed = currentText.trim();
    const isSentenceEnd = /[.!?]$/.test(trimmed) && !abbrevPattern.test(trimmed);
    const durationExceeded = (endMs - startMs) >= MAX_DURATION_MS;
    const isLast = i === captions.length - 1;

    if ((isSentenceEnd || durationExceeded || isLast) && trimmed.length > 0) {
      result.push({ id: String(result.length + 1), startMs, endMs, text: trimmed });
      currentText = '';
    }
  }
  return result;
}

/** Fallback: group by duration when no punctuation is available */
function groupByDuration(captions: Caption[]): SubtitleEntry[] {
  const TARGET_MS = 8000;
  const result: SubtitleEntry[] = [];
  let currentText = '';
  let startMs = 0;
  let endMs = 0;

  for (let i = 0; i < captions.length; i++) {
    const cap = captions[i];
    if (!currentText) startMs = cap.startMs;
    currentText += (currentText ? ' ' : '') + cap.text.replace(/\n/g, ' ');
    endMs = cap.endMs;

    const isLast = i === captions.length - 1;
    if ((endMs - startMs) >= TARGET_MS || isLast) {
      const trimmed = currentText.trim();
      if (trimmed.length > 0) {
        result.push({ id: String(result.length + 1), startMs, endMs, text: trimmed });
      }
      currentText = '';
    }
  }
  return result;
}
