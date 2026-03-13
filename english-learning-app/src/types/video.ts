export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  duration: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  subtitleStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface Subtitle {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
}

export interface VideoProgress {
  id: string;
  profileId: string;
  videoId: string;
  watchedSeconds: number;
  totalSeconds: number;
  completedAt?: string;
  lastWatchedAt: string;
}
