import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedWord {
  word: string;
  phonetic?: string;
  meanings: { partOfSpeech: string; definition: string }[];
  sentences: string[];
  videoId?: string;
  savedAt: string;
  reviewCount: number;
  lastReviewedAt?: string;
  mastered: boolean;
}

export interface QuizResult {
  date: string;
  total: number;
  correct: number;
  type: 'flashcard' | 'fill_blank';
}

interface StudyState {
  savedWords: SavedWord[];
  quizResults: QuizResult[];

  saveWord: (word: Omit<SavedWord, 'savedAt' | 'reviewCount' | 'lastReviewedAt' | 'mastered'>) => void;
  removeWord: (word: string) => void;
  isWordSaved: (word: string) => boolean;
  markReviewed: (word: string, mastered: boolean) => void;
  addQuizResult: (result: Omit<QuizResult, 'date'>) => void;
  getWordsForReview: () => SavedWord[];
  getRecentQuizResults: (count: number) => QuizResult[];
  getTotalWords: () => number;
  getMasteredCount: () => number;
  getLearningCount: () => number;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      savedWords: [],
      quizResults: [],

      saveWord: (wordData) => {
        const existing = get().savedWords.find((w) => w.word === wordData.word);
        if (existing) return;
        set((state) => ({
          savedWords: [
            {
              ...wordData,
              savedAt: new Date().toISOString(),
              reviewCount: 0,
              mastered: false,
            },
            ...state.savedWords,
          ],
        }));
      },

      removeWord: (word) => {
        set((state) => ({
          savedWords: state.savedWords.filter((w) => w.word !== word),
        }));
      },

      isWordSaved: (word) => {
        return get().savedWords.some((w) => w.word === word);
      },

      markReviewed: (word, mastered) => {
        set((state) => ({
          savedWords: state.savedWords.map((w) =>
            w.word === word
              ? {
                  ...w,
                  reviewCount: w.reviewCount + 1,
                  lastReviewedAt: new Date().toISOString(),
                  mastered,
                }
              : w,
          ),
        }));
      },

      addQuizResult: (result) => {
        set((state) => ({
          quizResults: [
            { ...result, date: new Date().toISOString() },
            ...state.quizResults,
          ].slice(0, 100),
        }));
      },

      getWordsForReview: () => {
        return get().savedWords.filter((w) => !w.mastered);
      },

      getRecentQuizResults: (count) => {
        return get().quizResults.slice(0, count);
      },

      getTotalWords: () => get().savedWords.length,
      getMasteredCount: () => get().savedWords.filter((w) => w.mastered).length,
      getLearningCount: () => get().savedWords.filter((w) => !w.mastered).length,
    }),
    {
      name: 'study-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
