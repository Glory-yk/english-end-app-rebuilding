import { create } from 'zustand';

interface LearningState {
  dailyGoal: number; // minutes
  todayMinutes: number;
  streak: number;
  sessionsToday: number;
  sessionStartTime: number | null;
  wordsLearnedToday: number;
  weeklyData: number[]; // minutes per day, last 7 days

  startSession: () => void;
  endSession: () => void;
  updateProgress: (data: Partial<Pick<LearningState, 'dailyGoal' | 'todayMinutes' | 'streak' | 'wordsLearnedToday' | 'weeklyData'>>) => void;
  addWordLearned: () => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  dailyGoal: 30,
  todayMinutes: 0,
  streak: 0,
  sessionsToday: 0,
  sessionStartTime: null,
  wordsLearnedToday: 0,
  weeklyData: [0, 0, 0, 0, 0, 0, 0],

  startSession: () => {
    set({
      sessionStartTime: Date.now(),
      sessionsToday: get().sessionsToday + 1,
    });
  },

  endSession: () => {
    const { sessionStartTime, todayMinutes } = get();
    if (sessionStartTime) {
      const elapsed = (Date.now() - sessionStartTime) / 60000; // to minutes
      set({
        todayMinutes: todayMinutes + elapsed,
        sessionStartTime: null,
      });
    }
  },

  updateProgress: (data) => {
    set(data);
  },

  addWordLearned: () => {
    set((state) => ({
      wordsLearnedToday: state.wordsLearnedToday + 1,
    }));
  },
}));
