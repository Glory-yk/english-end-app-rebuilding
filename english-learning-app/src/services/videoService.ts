import api from './api';
import type { Video, Subtitle } from '../types/video';

export async function getRecommended(profileId: string): Promise<Video[]> {
  const { data } = await api.get<Video[]>(`/videos/recommended`, {
    params: { profileId },
  });
  return data;
}

export async function search(
  query: string,
  filters?: { category?: string; difficulty?: string },
): Promise<Video[]> {
  const { data } = await api.get<Video[]>('/videos/search', {
    params: { q: query, ...filters },
  });
  return data;
}

export async function getVideo(id: string): Promise<Video> {
  const { data } = await api.get<Video>(`/videos/${id}`);
  return data;
}

export async function getSubtitles(videoId: string): Promise<Subtitle[]> {
  const { data } = await api.get<Subtitle[]>(`/videos/${videoId}/subtitles`);
  return data;
}

export async function importVideo(youtubeUrl: string): Promise<Video> {
  const { data } = await api.post<Video>('/videos/import', { url: youtubeUrl });
  return data;
}
