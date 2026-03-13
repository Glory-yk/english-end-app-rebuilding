export interface Channel {
  id: string;
  name: string;
  youtubeChannelId: string;
  description: string;
  category: 'conversation' | 'grammar' | 'pronunciation' | 'business' | 'test' | 'kids' | 'general';
  thumbnailUrl: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
}

export const defaultChannels: Channel[] = [];

export const channelCategories = [
  { id: 'all', label: '전체' },
  { id: 'conversation', label: '회화' },
  { id: 'grammar', label: '문법' },
  { id: 'pronunciation', label: '발음' },
  { id: 'business', label: '비즈니스' },
  { id: 'test', label: '시험대비' },
  { id: 'kids', label: '키즈' },
  { id: 'general', label: '종합' },
];

export const levelLabels: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
  all: '전체 레벨',
};
