import api from './api';

export interface YouTubeVideo {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  description: string;
  publishedAt: string;
  duration?: number;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
}

/**
 * Fetch latest videos from user's YouTube subscriptions
 */
export async function getSubscriptionVideos(
  pageToken?: string,
): Promise<YouTubeSearchResult> {
  const { data } = await api.get<YouTubeSearchResult>(
    '/youtube/subscriptions',
    { params: { pageToken } },
  );
  return data;
}

/**
 * Fetch user's liked videos on YouTube
 */
export async function getLikedVideos(
  pageToken?: string,
): Promise<YouTubeSearchResult> {
  const { data } = await api.get<YouTubeSearchResult>(
    '/youtube/liked',
    { params: { pageToken } },
  );
  return data;
}

/**
 * Search YouTube videos by query
 */
export async function searchYouTube(
  query: string,
  pageToken?: string,
): Promise<YouTubeSearchResult> {
  const { data } = await api.get<YouTubeSearchResult>(
    '/youtube/search',
    { params: { q: query, pageToken } },
  );
  return data;
}

export interface Caption {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface CaptionsResponse {
  videoId: string;
  lang: string;
  captions: Caption[];
}

/**
 * Fetch captions/subtitles for a YouTube video
 */
export async function getVideoCaptions(
  videoId: string,
  lang = 'en',
): Promise<CaptionsResponse> {
  const { data } = await api.get<CaptionsResponse>(
    `/youtube/captions/${videoId}`,
    { params: { lang } },
  );
  return data;
}
