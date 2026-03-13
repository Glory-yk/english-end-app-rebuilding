export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  type: 'child' | 'adult';
  ageGroup: '1y' | '3y' | '6y' | 'adult';
  level: 'beginner' | 'intermediate' | 'advanced';
  avatarUrl?: string;
  dailyGoalMin: number;
  streakDays: number;
  totalStudyMin: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    provider: string;
    hasYouTubeAccess?: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}
