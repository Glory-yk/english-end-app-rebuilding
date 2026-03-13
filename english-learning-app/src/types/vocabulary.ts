export interface Vocabulary {
  id: string;
  profileId: string;
  word: string;
  meaning: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  sourceVideoId?: string;
  sourceTimestamp?: number;
  createdAt: string;
}

export interface SrsCard {
  id: string;
  vocabularyId: string;
  profileId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
}

export type SrsGrade = 0 | 1 | 2 | 3 | 4 | 5;
