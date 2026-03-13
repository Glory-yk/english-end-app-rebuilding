import api from './api';
import type { Quiz, QuizAttempt, QuizSession } from '../types/quiz';

export async function generate(
  profileId: string,
  videoId: string,
): Promise<Quiz[]> {
  const { data } = await api.post<Quiz[]>('/quiz/generate', {
    profileId,
    videoId,
  });
  return data;
}

export async function submit(
  quizId: string,
  answer: string,
): Promise<QuizAttempt> {
  const { data } = await api.post<QuizAttempt>(`/quiz/${quizId}/submit`, {
    answer,
  });
  return data;
}

export async function getDaily(profileId: string): Promise<Quiz[]> {
  const { data } = await api.get<Quiz[]>('/quiz/daily', {
    params: { profileId },
  });
  return data;
}

export async function getSession(sessionId: string): Promise<QuizSession> {
  const { data } = await api.get<QuizSession>(`/quiz/session/${sessionId}`);
  return data;
}

export async function getRecentSessions(
  profileId: string,
): Promise<QuizSession[]> {
  const { data } = await api.get<QuizSession[]>('/quiz/sessions', {
    params: { profileId, limit: 5 },
  });
  return data;
}
