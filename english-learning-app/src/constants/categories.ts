export interface VideoCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const videoCategories: VideoCategory[] = [
  { id: 'animation', label: '애니메이션', emoji: '🎬', description: '디즈니, 픽사 등 애니메이션 클립' },
  { id: 'news', label: '뉴스', emoji: '📰', description: 'CNN, BBC 등 영어 뉴스' },
  { id: 'ted', label: 'TED', emoji: '🎤', description: 'TED 강연 및 교육 영상' },
  { id: 'music', label: '음악', emoji: '🎵', description: '팝송 가사 학습' },
  { id: 'drama', label: '드라마/영화', emoji: '🎭', description: '미드, 영화 클립' },
  { id: 'kids', label: '어린이', emoji: '👶', description: '동요, 교육 만화' },
  { id: 'conversation', label: '일상회화', emoji: '💬', description: '실생활 영어 대화' },
  { id: 'business', label: '비즈니스', emoji: '💼', description: '비즈니스 영어' },
];

export const kidCategories: VideoCategory[] = [
  { id: 'nursery_rhyme', label: '동요', emoji: '🎶', description: '영어 동요 따라부르기' },
  { id: 'color_shape', label: '색상/모양', emoji: '🌈', description: '색상과 모양 배우기' },
  { id: 'animal', label: '동물', emoji: '🐻', description: '동물 이름과 소리' },
  { id: 'cartoon', label: '만화', emoji: '📺', description: '짧은 교육 만화' },
];
