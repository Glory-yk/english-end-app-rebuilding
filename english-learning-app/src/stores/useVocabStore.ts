import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Vocabulary, SrsGrade } from '../types/vocabulary';
import * as vocabService from '../services/vocabService';
import { calculateSM2, QualityButton, QUALITY_MAP } from '../utils/srs';

interface PendingReview {
  vocabId: string;
  grade: SrsGrade;
  timestamp: number;
}

interface VocabStats {
  total: number;
  mastered: number;
  learning: number;
  review: number;
  todayReviewed: number;
}

interface VocabState {
  words: Vocabulary[];
  reviewQueue: Vocabulary[];
  currentReviewIndex: number;
  pendingReviews: PendingReview[];
  loading: boolean;
  error: string | null;
  stats: VocabStats;

  fetchWords: (profileId: string, page?: number, status?: string) => Promise<void>;
  fetchReviewQueue: (profileId: string) => Promise<void>;
  addWord: (profileId: string, vocabId: string, videoId?: string) => Promise<void>;
  removeWord: (vocabId: string) => void;
  submitReview: (
    vocabId: string,
    qualityButton: QualityButton,
    isOnline?: boolean,
  ) => Promise<void>;
  nextCard: () => void;
  syncPending: (profileId: string) => Promise<void>;
  fetchStats: (profileId: string) => Promise<void>;
}

const PENDING_REVIEWS_KEY = 'pendingReviews';

export const useVocabStore = create<VocabState>((set, get) => ({
  words: [],
  reviewQueue: [],
  currentReviewIndex: 0,
  pendingReviews: [],
  loading: false,
  error: null,
  stats: { total: 0, mastered: 0, learning: 0, review: 0, todayReviewed: 0 },

  fetchWords: async (profileId, page = 1, status?) => {
    set({ loading: true, error: null });
    try {
      const data = await vocabService.getUserWords(profileId, page, status);
      set({ words: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchReviewQueue: async (profileId) => {
    if (!profileId) return;
    set({ loading: true, error: null });
    try {
      const data = await vocabService.getReviewList(profileId);
      set({ reviewQueue: data, currentReviewIndex: 0, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addWord: async (profileId, vocabId, videoId) => {
    try {
      const saved = await vocabService.saveWord(profileId, vocabId, videoId);
      set((state) => ({ words: [saved, ...state.words] }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  removeWord: (vocabId) => {
    set((state) => ({
      words: state.words.filter((w) => w.id !== vocabId),
    }));
  },

  submitReview: async (vocabId, qualityButton, isOnline = true) => {
    const quality = QUALITY_MAP[qualityButton] as SrsGrade;
    const word = get().reviewQueue.find((w) => w.id === vocabId);
    if (!word) return;

    // Add to pending for offline sync
    const pending: PendingReview = {
      vocabId,
      grade: quality,
      timestamp: Date.now(),
    };

    if (isOnline) {
      try {
        await vocabService.submitReview(vocabId, quality);
      } catch {
        // Offline fallback: store in pending
        const updatedPending = [...get().pendingReviews, pending];
        set({ pendingReviews: updatedPending });
        await AsyncStorage.setItem(
          PENDING_REVIEWS_KEY,
          JSON.stringify(updatedPending),
        );
      }
    } else {
      const updatedPending = [...get().pendingReviews, pending];
      set({ pendingReviews: updatedPending });
      await AsyncStorage.setItem(
        PENDING_REVIEWS_KEY,
        JSON.stringify(updatedPending),
      );
    }

    // Update local state with client-side SM-2 calculation (mirrors backend)
    const srsCard = word as any; // SRS fields may be on the word object
    const result = calculateSM2({
      quality,
      easeFactor: srsCard.easeFactor ?? 2.5,
      interval: srsCard.interval ?? 0,
      repetitions: srsCard.repetitions ?? 0,
    });

    set((state) => ({
      reviewQueue: state.reviewQueue.map((w) =>
        w.id === vocabId
          ? {
              ...w,
              easeFactor: result.easeFactor,
              interval: result.interval,
              repetitions: result.repetitions,
              nextReviewAt: result.nextReview.toISOString(),
              lastReviewedAt: new Date().toISOString(),
              status: result.status,
            } as any
          : w,
      ),
    }));
  },

  nextCard: () => {
    set((state) => ({
      currentReviewIndex: state.currentReviewIndex + 1,
    }));
  },

  syncPending: async (profileId) => {
    const pendingStr = await AsyncStorage.getItem(PENDING_REVIEWS_KEY);
    const storedPending: PendingReview[] = pendingStr
      ? JSON.parse(pendingStr)
      : [];
    const allPending = [...get().pendingReviews, ...storedPending];

    if (allPending.length === 0) return;

    // Deduplicate by vocabId + timestamp
    const seen = new Set<string>();
    const unique = allPending.filter((r) => {
      const key = r.vocabId + r.timestamp;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const successful: string[] = [];
    for (const review of unique) {
      try {
        await vocabService.submitReview(review.vocabId, review.grade);
        successful.push(review.vocabId + review.timestamp);
      } catch {
        // Keep in pending for next sync attempt
      }
    }

    const remaining = unique.filter(
      (r) => !successful.includes(r.vocabId + r.timestamp),
    );

    set({ pendingReviews: remaining });
    if (remaining.length > 0) {
      await AsyncStorage.setItem(PENDING_REVIEWS_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(PENDING_REVIEWS_KEY);
    }
  },

  fetchStats: async (profileId) => {
    try {
      const data = await vocabService.getStats(profileId);
      set({
        stats: {
          total: data.total ?? 0,
          mastered: data.mastered ?? 0,
          learning: data.learning ?? 0,
          review: (data as any).review ?? 0,
          todayReviewed: (data as any).todayReviewed ?? 0,
        },
      });
    } catch {
      // Stats fetch failed silently
    }
  },
}));
