export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
}

export interface YouTubeVideoDetail {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSec: number;
  description: string;
}

export interface CaptionEntry {
  text: string;
  start: number; // seconds
  dur: number; // seconds
}
