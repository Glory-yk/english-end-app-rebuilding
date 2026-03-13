import { create } from 'zustand';
import type { YouTubeVideo } from '../services/youtubeService';
import * as youtubeService from '../services/youtubeService';

interface YouTubeState {
  subscriptionVideos: YouTubeVideo[];
  likedVideos: YouTubeVideo[];
  searchResults: YouTubeVideo[];
  isLoading: boolean;
  error: string | null;

  fetchSubscriptionVideos: () => Promise<void>;
  fetchLikedVideos: () => Promise<void>;
  searchYouTube: (query: string) => Promise<void>;
  clearSearchResults: () => void;
}

export const useYouTubeStore = create<YouTubeState>((set) => ({
  subscriptionVideos: [],
  likedVideos: [],
  searchResults: [],
  isLoading: false,
  error: null,

  fetchSubscriptionVideos: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await youtubeService.getSubscriptionVideos();
      set({ subscriptionVideos: result.videos });
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to fetch subscription videos';
      set({ error: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLikedVideos: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await youtubeService.getLikedVideos();
      set({ likedVideos: result.videos });
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to fetch liked videos';
      set({ error: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    } finally {
      set({ isLoading: false });
    }
  },

  searchYouTube: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const result = await youtubeService.searchYouTube(query);
      set({ searchResults: result.videos });
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to search YouTube';
      set({ error: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),
}));
