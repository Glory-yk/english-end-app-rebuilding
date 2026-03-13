import api from './api';

interface SessionData {
  videoId?: string;
  durationMin: number;
  wordsLearned: number;
  quizzesCompleted: number;
}

interface Dashboard {
  totalWords: number;
  masteredWords: number;
  streakDays: number;
  totalStudyMin: number;
  todayMin: number;
  dailyGoalMin: number;
  weeklyData: number[];
  wordBreakdown: {
    newWords: number;
    learning: number;
    review: number;
    mastered: number;
  };
  weeklyActivity: boolean[]; // 7 booleans for each day
}

interface FamilyProgress {
  profiles: Array<{
    id: string;
    name: string;
    todayMin: number;
    streak: number;
    totalWords: number;
  }>;
}

export async function createSession(
  profileId: string,
  data: SessionData,
): Promise<void> {
  await api.post('/progress/session', { profileId, ...data });
}

export async function getDashboard(profileId: string): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>(`/progress/dashboard`, {
    params: { profileId },
  });
  return data;
}

export async function getFamilyProgress(): Promise<FamilyProgress> {
  const { data } = await api.get<FamilyProgress>('/progress/family');
  return data;
}
