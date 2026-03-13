import { api } from './api';
import type { Vocabulary, SrsGrade } from '../types/vocabulary';

export async function getReviewList(profileId: string): Promise<Vocabulary[]> {
  const { data } = await api.get<Vocabulary[]>(
    `/profiles/${profileId}/vocabulary/review`,
    { params: { limit: 50 } },
  );
  return data;
}

export async function saveWord(
  profileId: string,
  vocabularyId: string,
  sourceVideoId?: string,
): Promise<Vocabulary> {
  const { data } = await api.post<Vocabulary>(
    `/profiles/${profileId}/vocabulary`,
    { vocabularyId, sourceVideoId },
  );
  return data;
}

export async function submitReview(
  userVocabId: string,
  quality: SrsGrade,
): Promise<void> {
  await api.post(`/vocabulary/${userVocabId}/review`, { quality });
}

export async function getStats(
  profileId: string,
): Promise<{
  total: number;
  mastered: number;
  learning: number;
  newWords: number;
}> {
  const { data } = await api.get(`/profiles/${profileId}/vocabulary/stats`);
  return data;
}

export async function getUserWords(
  profileId: string,
  page: number = 1,
  status?: string,
): Promise<Vocabulary[]> {
  const params: Record<string, unknown> = { page, limit: 50 };
  if (status) params.status = status;
  const { data } = await api.get<Vocabulary[]>(
    `/profiles/${profileId}/vocabulary`,
    { params },
  );
  return data;
}
