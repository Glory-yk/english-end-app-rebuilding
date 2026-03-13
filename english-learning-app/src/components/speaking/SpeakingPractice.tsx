import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import WaveformView from './WaveformView';
import SimilarityGauge from './SimilarityGauge';

interface Subtitle {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  translation?: string;
}

interface SpeakingPracticeProps {
  subtitle: Subtitle;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  /** Play original video segment (startSec, endSec) */
  onPlaySegment?: (startSec: number, endSec: number) => void;
}

type PracticePhase = 'idle' | 'listening' | 'recording' | 'analyzing' | 'result';

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance for word-level comparison
function levenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Calculate similarity score between reference and spoken text
function calculateTextSimilarity(reference: string, spoken: string): number {
  const refWords = normalizeText(reference).split(' ').filter(Boolean);
  const spokenWords = normalizeText(spoken).split(' ').filter(Boolean);

  if (refWords.length === 0) return 0;
  if (spokenWords.length === 0) return 0;

  const distance = levenshtein(refWords, spokenWords);
  const maxLen = Math.max(refWords.length, spokenWords.length);
  const similarity = Math.max(0, 1 - distance / maxLen);

  return Math.round(similarity * 100);
}

// Calculate waveform similarity (amplitude pattern matching)
function calculateWaveformSimilarity(ref: number[], user: number[]): number {
  if (ref.length === 0 || user.length === 0) return 0;

  // Normalize lengths by resampling to same size
  const targetLen = Math.min(ref.length, user.length, 50);
  const resample = (arr: number[], len: number): number[] => {
    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      const idx = (i / len) * arr.length;
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, arr.length - 1);
      const frac = idx - lo;
      result.push(arr[lo] * (1 - frac) + arr[hi] * frac);
    }
    return result;
  };

  const a = resample(ref, targetLen);
  const b = resample(user, targetLen);

  // Normalize amplitude ranges
  const maxA = Math.max(...a, 0.01);
  const maxB = Math.max(...b, 0.01);
  const normA = a.map(v => v / maxA);
  const normB = b.map(v => v / maxB);

  // Calculate correlation
  let sumDiff = 0;
  for (let i = 0; i < targetLen; i++) {
    sumDiff += Math.abs(normA[i] - normB[i]);
  }
  const avgDiff = sumDiff / targetLen;
  const similarity = Math.max(0, 1 - avgDiff);

  return Math.round(similarity * 100);
}

// Highlight matched/unmatched words
function getWordMatchResults(reference: string, spoken: string) {
  const refWords = normalizeText(reference).split(' ').filter(Boolean);
  const spokenWords = normalizeText(spoken).split(' ').filter(Boolean);
  const origWords = reference.replace(/\s+/g, ' ').trim().split(' ');

  return origWords.map((word, i) => {
    const normWord = normalizeText(word);
    const matched = spokenWords.some(sw => {
      if (sw === normWord) return true;
      // Fuzzy match: allow 1 char difference for words > 3 chars
      if (normWord.length > 3) {
        const charDist = levenshtein(sw.split(''), normWord.split(''));
        return charDist <= 1;
      }
      return false;
    });
    return { word, matched };
  });
}

export default function SpeakingPractice({
  subtitle,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onPlaySegment,
}: SpeakingPracticeProps) {
  const [phase, setPhase] = useState<PracticePhase>('idle');
  const [refWaveform, setRefWaveform] = useState<number[]>([]);
  const [userWaveform, setUserWaveform] = useState<number[]>([]);
  const [spokenText, setSpokenText] = useState('');
  const [textScore, setTextScore] = useState(0);
  const [waveScore, setWaveScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [wordResults, setWordResults] = useState<{ word: string; matched: boolean }[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when subtitle changes
  useEffect(() => {
    setPhase('idle');
    setRefWaveform([]);
    setUserWaveform([]);
    setSpokenText('');
    setTextScore(0);
    setWaveScore(0);
    setTotalScore(0);
    setWordResults([]);
    setRecordingDuration(0);
  }, [subtitle.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meteringIntervalRef.current) clearInterval(meteringIntervalRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      stopRecording();
    };
  }, []);

  // Step 1: Play reference audio from original video
  const playReference = useCallback(() => {
    setPhase('listening');
    setRefWaveform([]);

    const startSec = subtitle.startMs / 1000;
    const endSec = subtitle.endMs / 1000;
    const durationMs = subtitle.endMs - subtitle.startMs;

    // Play the original video segment
    if (onPlaySegment) {
      onPlaySegment(startSec, endSec);
    }

    // Generate reference waveform from text characteristics
    const words = subtitle.text.split(' ');
    const refWave: number[] = [];
    words.forEach((word, wi) => {
      const syllables = Math.max(1, Math.ceil(word.length / 3));
      for (let s = 0; s < syllables; s++) {
        const amp = 0.3 + Math.random() * 0.5 + (word.length > 5 ? 0.15 : 0);
        refWave.push(Math.min(1, amp));
        refWave.push(Math.min(1, amp * 0.9));
      }
      if (wi < words.length - 1) {
        refWave.push(0.05 + Math.random() * 0.05);
      }
    });
    setRefWaveform(refWave);

    // Return to idle after segment finishes
    setTimeout(() => {
      setPhase('idle');
    }, durationMs + 500);
  }, [subtitle, onPlaySegment]);

  // Step 2: Start recording user speech
  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('권한 필요', '마이크 권한이 필요합니다.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        },
      );

      recordingRef.current = recording;
      setPhase('recording');
      setUserWaveform([]);
      setRecordingDuration(0);

      // Collect metering data for waveform
      const waveData: number[] = [];
      meteringIntervalRef.current = setInterval(async () => {
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Convert dB (-160 to 0) to 0-1 amplitude
            const db = status.metering;
            const amplitude = Math.max(0, Math.min(1, (db + 60) / 60));
            waveData.push(amplitude);
            setUserWaveform([...waveData]);
          }
        } catch {}
      }, 100);

      // Track duration
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

      // Auto-stop after subtitle duration + buffer (max 15s)
      const maxDuration = Math.min(15000, (subtitle.endMs - subtitle.startMs) + 3000);
      setTimeout(() => {
        stopRecording();
      }, maxDuration);
    } catch (err: any) {
      console.error('Recording error:', err);
      Alert.alert('녹음 오류', err.message || '녹음을 시작할 수 없습니다.');
      setPhase('idle');
    }
  }, [subtitle]);

  // Step 3: Stop recording and analyze
  const stopRecording = useCallback(async () => {
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;

    setPhase('analyzing');

    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      }
    } catch {}

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    // Analyze results
    analyzeResults();
  }, []);

  const analyzeResults = useCallback(() => {
    // For now, use simulated speech recognition
    // In production, send audio to Google Speech-to-Text API
    const simulatedSpoken = simulateSpeechRecognition(subtitle.text);
    setSpokenText(simulatedSpoken);

    // Calculate scores
    const txtScore = calculateTextSimilarity(subtitle.text, simulatedSpoken);
    const wavScore = calculateWaveformSimilarity(refWaveform, userWaveform);

    // Combined score (text accuracy weighted more)
    const combined = Math.round(txtScore * 0.6 + wavScore * 0.4);

    setTextScore(txtScore);
    setWaveScore(wavScore);
    setTotalScore(combined);
    setWordResults(getWordMatchResults(subtitle.text, simulatedSpoken));
    setPhase('result');
  }, [subtitle.text, refWaveform, userWaveform]);

  // Simulate speech recognition (replace with real STT in production)
  const simulateSpeechRecognition = (reference: string): string => {
    const words = reference.split(' ');
    // Based on actual recording data quality, simulate recognition
    const waveQuality = userWaveform.length > 0
      ? userWaveform.reduce((sum, v) => sum + v, 0) / userWaveform.length
      : 0;

    // Better waveform quality = better "recognition"
    const accuracy = Math.min(0.95, 0.5 + waveQuality * 0.5);

    return words
      .map(word => {
        if (Math.random() < accuracy) return word;
        // Simulate common mispronunciations
        if (word.length > 4 && Math.random() < 0.5) {
          return word.slice(0, -1); // Drop last char
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  };

  const retry = () => {
    setPhase('idle');
    setUserWaveform([]);
    setSpokenText('');
    setTextScore(0);
    setWaveScore(0);
    setTotalScore(0);
    setWordResults([]);
    setRecordingDuration(0);
  };

  return (
    <View style={styles.container}>
      {/* Subtitle text */}
      <View style={styles.subtitleBox}>
        <Text style={styles.subtitleText}>{subtitle.text}</Text>
        {subtitle.translation && (
          <Text style={styles.translationText}>{subtitle.translation}</Text>
        )}
      </View>

      {/* Reference waveform */}
      {refWaveform.length > 0 && (
        <View style={styles.waveSection}>
          <View style={styles.waveLabelRow}>
            <Ionicons name="volume-high" size={14} color="#3b82f6" />
            <Text style={styles.waveLabel}>원본 발음</Text>
          </View>
          <View style={styles.waveBox}>
            <WaveformView data={refWaveform} color="#3b82f6" height={50} />
          </View>
        </View>
      )}

      {/* User waveform (during/after recording) */}
      {(phase === 'recording' || phase === 'result' || phase === 'analyzing') && userWaveform.length > 0 && (
        <View style={styles.waveSection}>
          <View style={styles.waveLabelRow}>
            <Ionicons name="mic" size={14} color="#8b5cf6" />
            <Text style={styles.waveLabel}>내 발음</Text>
            {phase === 'recording' && (
              <Text style={styles.durationText}>{recordingDuration}s</Text>
            )}
          </View>
          <View style={styles.waveBox}>
            <WaveformView data={userWaveform} color="#8b5cf6" height={50} />
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {phase === 'idle' && (
          <>
            <TouchableOpacity style={styles.btnSecondary} onPress={playReference}>
              <Ionicons name="volume-high" size={20} color="#3b82f6" />
              <Text style={styles.btnSecondaryText}>원본 듣기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={startRecording}>
              <Ionicons name="mic" size={22} color="#fff" />
              <Text style={styles.btnPrimaryText}>녹음 시작</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'listening' && (
          <View style={styles.statusBox}>
            <Ionicons name="volume-high" size={24} color="#3b82f6" />
            <Text style={styles.statusText}>원본 재생 중...</Text>
          </View>
        )}

        {phase === 'recording' && (
          <TouchableOpacity style={styles.btnStop} onPress={stopRecording}>
            <View style={styles.stopIcon} />
            <Text style={styles.btnStopText}>녹음 중지</Text>
          </TouchableOpacity>
        )}

        {phase === 'analyzing' && (
          <View style={styles.statusBox}>
            <Ionicons name="analytics" size={24} color="#eab308" />
            <Text style={styles.statusText}>분석 중...</Text>
          </View>
        )}
      </View>

      {/* Results */}
      {phase === 'result' && (
        <View style={styles.resultSection}>
          <SimilarityGauge score={totalScore} />

          {/* Word-level results */}
          <View style={styles.wordResultBox}>
            {wordResults.map((wr, i) => (
              <Text
                key={i}
                style={[
                  styles.wordResult,
                  { color: wr.matched ? '#22c55e' : '#ef4444' },
                ]}
              >
                {wr.word}{' '}
              </Text>
            ))}
          </View>

          {/* Detail scores */}
          <View style={styles.detailScores}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>발음 정확도</Text>
              <Text style={[styles.detailValue, { color: '#3b82f6' }]}>{textScore}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>억양 유사도</Text>
              <Text style={[styles.detailValue, { color: '#8b5cf6' }]}>{waveScore}%</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={retry}>
              <Ionicons name="refresh" size={18} color="#3b82f6" />
              <Text style={styles.btnSecondaryText}>다시 하기</Text>
            </TouchableOpacity>
            {hasNext && (
              <TouchableOpacity style={styles.btnPrimary} onPress={onNext}>
                <Text style={styles.btnPrimaryText}>다음 문장</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Navigation */}
      {phase === 'idle' && (hasPrev || hasNext) && (
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]}
            onPress={onPrev}
            disabled={!hasPrev}
          >
            <Ionicons name="chevron-back" size={18} color={hasPrev ? '#94a3b8' : '#334155'} />
            <Text style={[styles.navText, !hasPrev && styles.navTextDisabled]}>이전</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
            onPress={onNext}
            disabled={!hasNext}
          >
            <Text style={[styles.navText, !hasNext && styles.navTextDisabled]}>다음</Text>
            <Ionicons name="chevron-forward" size={18} color={hasNext ? '#94a3b8' : '#334155'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  subtitleBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  translationText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 6,
  },
  waveSection: {
    marginBottom: 12,
  },
  waveLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  waveLabel: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
  durationText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  waveBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  btnStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  stopIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  btnStopText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  resultSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  wordResultBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  wordResult: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
  },
  detailScores: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  navTextDisabled: {
    color: '#334155',
  },
});
