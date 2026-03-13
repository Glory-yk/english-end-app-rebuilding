import { create } from 'zustand';

interface KidsState {
  dailyLimitMin: number;
  todayWatchedMin: number;
  lockAfterTime: string;
  isTimeLimitReached: boolean;
  allowedCategories: string[];
  earnedStickers: number;
  totalStickers: string[];
  pin: string;

  addWatchTime: (minutes: number) => void;
  checkTimeLimit: () => boolean;
  earnSticker: () => void;
  setPin: (pin: string) => void;
  setDailyLimit: (minutes: number) => void;
  setAllowedCategories: (categories: string[]) => void;
  resetDailyWatch: () => void;
}

export const useKidsStore = create<KidsState>((set, get) => ({
  dailyLimitMin: 20,
  todayWatchedMin: 0,
  lockAfterTime: '21:00',
  isTimeLimitReached: false,
  allowedCategories: ['nursery_rhyme', 'colors_shapes', 'animals', 'cartoon_simple'],
  earnedStickers: 0,
  totalStickers: [],
  pin: '1234',

  addWatchTime: (minutes) => set(state => {
    const newTotal = state.todayWatchedMin + minutes;
    return { todayWatchedMin: newTotal, isTimeLimitReached: newTotal >= state.dailyLimitMin };
  }),
  checkTimeLimit: () => get().todayWatchedMin >= get().dailyLimitMin,
  earnSticker: () => set(state => ({ earnedStickers: state.earnedStickers + 1 })),
  setPin: (pin) => set({ pin }),
  setDailyLimit: (minutes) => set({ dailyLimitMin: minutes }),
  setAllowedCategories: (categories) => set({ allowedCategories: categories }),
  resetDailyWatch: () => set({ todayWatchedMin: 0, isTimeLimitReached: false }),
}));
