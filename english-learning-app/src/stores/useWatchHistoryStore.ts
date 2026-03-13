import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WatchHistoryEntry {
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  watchedAt: string;
  watchedSeconds: number;
  totalSeconds: number;
}

export interface DailyWatchTime {
  date: string; // YYYY-MM-DD
  seconds: number;
  videoCount: number;
}

interface WatchHistoryState {
  history: WatchHistoryEntry[];
  dailyWatchTimes: DailyWatchTime[];
  activeVideoId: string | null;
  sessionSeconds: number;

  addToHistory: (entry: Omit<WatchHistoryEntry, 'watchedAt'>) => void;
  updateWatchTime: (youtubeId: string, additionalSeconds: number) => void;
  startSession: (youtubeId: string) => void;
  endSession: () => void;
  tickSession: (seconds: number) => void;
  getHistory: () => WatchHistoryEntry[];
  getTodayWatchTime: () => number;
  getWeeklyWatchTimes: () => DailyWatchTime[];
  getTotalWatchTime: () => number;
  getRecentVideos: (count: number) => WatchHistoryEntry[];
  clearHistory: () => void;
}

const MAX_HISTORY = 200;

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export const useWatchHistoryStore = create<WatchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      dailyWatchTimes: [],
      activeVideoId: null,
      sessionSeconds: 0,

      addToHistory: (entry) => {
        const now = new Date().toISOString();
        set((state) => {
          const existing = state.history.find((h) => h.youtubeId === entry.youtubeId);
          const merged = existing
            ? { ...entry, watchedAt: now, watchedSeconds: existing.watchedSeconds + entry.watchedSeconds }
            : { ...entry, watchedAt: now };
          const filtered = state.history.filter((h) => h.youtubeId !== entry.youtubeId);
          return { history: [merged, ...filtered].slice(0, MAX_HISTORY) };
        });
      },

      updateWatchTime: (youtubeId, additionalSeconds) => {
        if (additionalSeconds <= 0) return;
        const today = getTodayStr();

        set((state) => {
          // Update history entry
          const history = state.history.map((h) =>
            h.youtubeId === youtubeId
              ? { ...h, watchedSeconds: h.watchedSeconds + additionalSeconds, watchedAt: new Date().toISOString() }
              : h,
          );

          // Update daily watch time
          const dailyWatchTimes = [...state.dailyWatchTimes];
          const todayIdx = dailyWatchTimes.findIndex((d) => d.date === today);
          if (todayIdx >= 0) {
            dailyWatchTimes[todayIdx] = {
              ...dailyWatchTimes[todayIdx],
              seconds: dailyWatchTimes[todayIdx].seconds + additionalSeconds,
            };
          } else {
            dailyWatchTimes.push({ date: today, seconds: additionalSeconds, videoCount: 1 });
          }

          // Keep only last 90 days
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 90);
          const cutoffStr = cutoff.toISOString().split('T')[0];

          return {
            history,
            dailyWatchTimes: dailyWatchTimes.filter((d) => d.date >= cutoffStr),
          };
        });
      },

      startSession: (youtubeId) => {
        set({ activeVideoId: youtubeId, sessionSeconds: 0 });
      },

      endSession: () => {
        const { activeVideoId, sessionSeconds } = get();
        if (activeVideoId && sessionSeconds > 0) {
          get().updateWatchTime(activeVideoId, sessionSeconds);
        }
        set({ activeVideoId: null, sessionSeconds: 0 });
      },

      tickSession: (seconds) => {
        set((state) => ({ sessionSeconds: state.sessionSeconds + seconds }));
      },

      getHistory: () => get().history,

      getTodayWatchTime: () => {
        const today = getTodayStr();
        const entry = get().dailyWatchTimes.find((d) => d.date === today);
        return (entry?.seconds || 0) + (get().activeVideoId ? get().sessionSeconds : 0);
      },

      getWeeklyWatchTimes: () => {
        const days = getLast7Days();
        const { dailyWatchTimes } = get();
        return days.map((date) => {
          const entry = dailyWatchTimes.find((d) => d.date === date);
          return entry || { date, seconds: 0, videoCount: 0 };
        });
      },

      getTotalWatchTime: () => {
        return get().dailyWatchTimes.reduce((sum, d) => sum + d.seconds, 0);
      },

      getRecentVideos: (count) => {
        return get().history.slice(0, count);
      },

      clearHistory: () => set({ history: [], dailyWatchTimes: [] }),
    }),
    {
      name: 'watch-history-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        history: state.history,
        dailyWatchTimes: state.dailyWatchTimes,
      }),
    },
  ),
);
