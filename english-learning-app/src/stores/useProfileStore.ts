import { create } from 'zustand';

interface Profile {
  id: string;
  name: string;
  type: 'child' | 'adult';
  ageGroup: '1y' | '3y' | '6y' | 'adult';
  level: 'beginner' | 'intermediate' | 'advanced';
  avatarUrl?: string;
  dailyGoalMin: number;
}

interface ProfileState {
  profiles: Profile[];
  activeProfile: Profile | null;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profile: Profile) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeProfile: null,
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (profile) => set({ activeProfile: profile }),
}));
