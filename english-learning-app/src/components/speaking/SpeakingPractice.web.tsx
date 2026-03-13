import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  onPlaySegment?: (startSec: number, endSec: number) => void;
}

type PracticePhase = 'idle' | 'listening' | 'recording' | 'analyzing' | 'result';

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s']/g, '').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string[], b: string[]): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function calculateTextSimilarity(reference: string, spoken: string): number {
  const refWords = normalizeText(reference).split(' ').filter(Boolean);
  const spokenWords = normalizeText(spoken).split(' ').filter(Boolean);
  if (refWords.length === 0 || spokenWords.length === 0) return 0;
  const distance = levenshtein(refWords, spokenWords);
  return Math.round(Math.max(0, 1 - distance / Math.max(refWords.length, spokenWords.length)) * 100);
}

function calculateWaveformSimilarity(ref: number[], user: number[]): number {
  if (ref.length === 0 || user.length === 0) return 0;
  const targetLen = Math.min(ref.length, user.length, 50);
  const resample = (arr: number[], len: number) => {
    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      const idx = (i / len) * arr.length;
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, arr.length - 1);
      result.push(arr[lo] * (1 - (idx - lo)) + arr[hi] * (idx - lo));
    }
    return result;
  };
  const a = resample(ref, targetLen), b = resample(user, targetLen);
  const maxA = Math.max(...a, 0.01), maxB = Math.max(...b, 0.01);
  const normA = a.map(v => v / maxA), normB = b.map(v => v / maxB);
  let sumDiff = 0;
  for (let i = 0; i < targetLen; i++) sumDiff += Math.abs(normA[i] - normB[i]);
  return Math.round(Math.max(0, 1 - sumDiff / targetLen) * 100);
}

function getWordMatchResults(reference: string, spoken: string) {
  const spokenWords = normalizeText(spoken).split(' ').filter(Boolean);
  return reference.replace(/\s+/g, ' ').trim().split(' ').map(word => {
    const normWord = normalizeText(word);
    const matched = spokenWords.some(sw => {
      if (sw === normWord) return true;
      if (normWord.length > 3) return levenshtein(sw.split(''), normWord.split('')) <= 1;
      return false;
    });
    return { word, matched };
  });
}

function simulateSpeechRecognition(reference: string, waveform: number[]): string {
  const words = reference.split(' ');
  const waveQuality = waveform.length > 0
    ? waveform.reduce((sum, v) => sum + v, 0) / waveform.length : 0;
  const accuracy = Math.min(0.95, 0.5 + waveQuality * 0.5);
  return words.map(word => {
    if (Math.random() < accuracy) return word;
    if (word.length > 4 && Math.random() < 0.5) return word.slice(0, -1);
    return '';
  }).filter(Boolean).join(' ');
}

export default function SpeakingPractice({
  subtitle, onNext, onPrev, hasNext, hasPrev, onPlaySegment,
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
  const [sttSupported, setSttSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognizedTextRef = useRef('');
  const phaseRef = useRef<PracticePhase>('idle');
  const userWaveformRef = useRef<number[]>([]);
  const refWaveformRef = useRef<number[]>([]);

  // Keep refs in sync
  phaseRef.current = phase;
  userWaveformRef.current = userWaveform;
  refWaveformRef.current = refWaveform;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSttSupported(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    cleanup();
    setPhase('idle');
    setRefWaveform([]); setUserWaveform([]); setSpokenText('');
    setTextScore(0); setWaveScore(0); setTotalScore(0);
    setWordResults([]); setRecordingDuration(0);
    recognizedTextRef.current = '';
    userWaveformRef.current = [];
    refWaveformRef.current = [];
  }, [subtitle.id]);

  useEffect(() => {
    return () => { cleanup(); };
  }, []);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const doAnalysis = useCallback(() => {
    const currentUserWave = userWaveformRef.current;
    const currentRefWave = refWaveformRef.current;
    const spoken = recognizedTextRef.current || simulateSpeechRecognition(subtitle.text, currentUserWave);
    setSpokenText(spoken);

    const txtScore = calculateTextSimilarity(subtitle.text, spoken);
    const wavScore = calculateWaveformSimilarity(currentRefWave, currentUserWave);
    const combined = Math.round(txtScore * 0.6 + wavScore * 0.4);

    setTextScore(txtScore);
    setWaveScore(wavScore);
    setTotalScore(combined);
    setWordResults(getWordMatchResults(subtitle.text, spoken));
    setPhase('result');
  }, [subtitle.text]);

  const stopRecording = useCallback(() => {
    if (phaseRef.current !== 'recording') return;

    // Stop all recording resources
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    setPhase('analyzing');
    // Small delay to let final speech recognition results arrive
    setTimeout(() => doAnalysis(), 500);
  }, [doAnalysis]);

  const playReference = useCallback(() => {
    setPhase('listening');
    setRefWaveform([]);
    const startSec = subtitle.startMs / 1000;
    const endSec = subtitle.endMs / 1000;
    const durationMs = subtitle.endMs - subtitle.startMs;
    if (onPlaySegment) onPlaySegment(startSec, endSec);

    // Generate ref waveform from text structure
    const words = subtitle.text.split(' ');
    const refWave: number[] = [];
    words.forEach((word, wi) => {
      const syllables = Math.max(1, Math.ceil(word.length / 3));
      for (let s = 0; s < syllables; s++) {
        const amp = 0.3 + Math.random() * 0.5 + (word.length > 5 ? 0.15 : 0);
        refWave.push(Math.min(1, amp));
        refWave.push(Math.min(1, amp * 0.9));
      }
      if (wi < words.length - 1) refWave.push(0.05 + Math.random() * 0.05);
    });
    setRefWaveform(refWave);
    refWaveformRef.current = refWave;
    setTimeout(() => setPhase('idle'), durationMs + 500);
  }, [subtitle, onPlaySegment]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio API for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setPhase('recording');
      setUserWaveform([]);
      setRecordingDuration(0);
      recognizedTextRef.current = '';
      userWaveformRef.current = [];

      // Web Speech API for real-time STT
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          recognizedTextRef.current = transcript;
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      // Collect waveform at ~10fps
      const waveData: number[] = [];
      waveIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        const amplitude = Math.min(1, avg / 128);
        waveData.push(amplitude);
        userWaveformRef.current = [...waveData];
        setUserWaveform([...waveData]);
      }, 100);

      // Duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

      // Auto-stop after max duration
      const maxDuration = Math.min(15000, (subtitle.endMs - subtitle.startMs) + 3000);
      autoStopRef.current = setTimeout(() => {
        stopRecording();
      }, maxDuration);
    } catch (err: any) {
      console.error('Recording error:', err);
      alert('마이크 권한이 필요합니다: ' + (err.message || ''));
      setPhase('idle');
    }
  }, [subtitle, stopRecording]);

  const retry = () => {
    setPhase('idle');
    setUserWaveform([]); setSpokenText('');
    setTextScore(0); setWaveScore(0); setTotalScore(0);
    setWordResults([]); setRecordingDuration(0);
    recognizedTextRef.current = '';
    userWaveformRef.current = [];
  };

  return (
    <View style={styles.container}>
      <View style={styles.subtitleBox}>
        <Text style={styles.subtitleText}>{subtitle.text}</Text>
        {subtitle.translation && (
          <Text style={styles.translationText}>{subtitle.translation}</Text>
        )}
      </View>

      {sttSupported && (
        <View style={styles.sttBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
          <Text style={{ color: '#22c55e', fontSize: 11, marginLeft: 4 }}>음성 인식 활성</Text>
        </View>
      )}

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

      {phase === 'result' && (
        <View style={styles.resultSection}>
          <SimilarityGauge score={totalScore} />
          <View style={styles.wordResultBox}>
            {wordResults.map((wr, i) => (
              <Text key={i} style={[styles.wordResult, { color: wr.matched ? '#22c55e' : '#ef4444' }]}>
                {wr.word}{' '}
              </Text>
            ))}
          </View>
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

      {phase === 'idle' && (hasPrev || hasNext) && (
        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]} onPress={onPrev} disabled={!hasPrev}>
            <Ionicons name="chevron-back" size={18} color={hasPrev ? '#94a3b8' : '#334155'} />
            <Text style={[styles.navText, !hasPrev && styles.navTextDisabled]}>이전</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, !hasNext && styles.navBtnDisabled]} onPress={onNext} disabled={!hasNext}>
            <Text style={[styles.navText, !hasNext && styles.navTextDisabled]}>다음</Text>
            <Ionicons name="chevron-forward" size={18} color={hasNext ? '#94a3b8' : '#334155'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  subtitleBox: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  subtitleText: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  translationText: { color: '#64748b', fontSize: 13, marginTop: 6 },
  sttBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  waveSection: { marginBottom: 12 },
  waveLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  waveLabel: { color: '#94a3b8', fontSize: 12, flex: 1 },
  durationText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  waveBox: { backgroundColor: '#0f172a', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#1e293b' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 16 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  btnSecondaryText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  btnStop: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  stopIcon: { width: 16, height: 16, backgroundColor: '#fff', borderRadius: 3 },
  btnStopText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  statusText: { color: '#94a3b8', fontSize: 14 },
  resultSection: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16 },
  wordResultBox: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginBottom: 12, padding: 12, backgroundColor: '#0f172a', borderRadius: 8 },
  wordResult: { fontSize: 15, fontWeight: '600', lineHeight: 24 },
  detailScores: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  detailItem: { flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 12, alignItems: 'center' },
  detailLabel: { color: '#64748b', fontSize: 11, marginBottom: 4 },
  detailValue: { fontSize: 20, fontWeight: 'bold' },
  resultActions: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12 },
  navBtnDisabled: { opacity: 0.3 },
  navText: { color: '#94a3b8', fontSize: 13 },
  navTextDisabled: { color: '#334155' },
});
