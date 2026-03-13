import { create } from 'zustand';

interface VideoState {
  currentVideoId: string | null;
  currentTime: number;
  isPlaying: boolean;
  subtitles: any[];
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  setCurrentVideo: (videoId: string) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setSubtitles: (subtitles: any[]) => void;
  setLoop: (start: number | null, end: number | null) => void;
  toggleLoop: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  currentVideoId: null,
  currentTime: 0,
  isPlaying: false,
  subtitles: [],
  loopStart: null,
  loopEnd: null,
  isLooping: false,
  setCurrentVideo: (videoId) => set({ currentVideoId: videoId }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setSubtitles: (subtitles) => set({ subtitles }),
  setLoop: (start, end) => set({ loopStart: start, loopEnd: end }),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
}));
