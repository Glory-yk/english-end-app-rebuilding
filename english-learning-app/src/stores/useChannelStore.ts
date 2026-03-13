import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultChannels } from '../constants/channels';
import type { Channel } from '../constants/channels';
import api from '../services/api';

export interface ChannelVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelName: string;
  channelId: string;
}

interface ChannelState {
  customChannels: Channel[];
  followedChannelIds: string[];
  channelVideos: Record<string, ChannelVideo[]>;
  channelNextPageTokens: Record<string, string | null>;
  isLoadingVideos: boolean;

  getAllChannels: () => Channel[];
  addCustomChannel: (name: string, description?: string) => Channel;
  removeChannel: (channelId: string) => void;
  followChannel: (channelId: string) => void;
  unfollowChannel: (channelId: string) => void;
  isFollowing: (channelId: string) => boolean;
  getFollowedChannels: () => Channel[];
  fetchChannelVideos: (channel: Channel) => Promise<void>;
  loadMoreVideos: (channel: Channel) => Promise<void>;
  hasMoreVideos: (channelId: string) => boolean;
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set, get) => ({
      customChannels: [],
      followedChannelIds: [],
      channelVideos: {},
      channelNextPageTokens: {},
      isLoadingVideos: false,

      getAllChannels: () => {
        return [...defaultChannels, ...get().customChannels];
      },

      addCustomChannel: (name, description) => {
        const id = `custom-${Date.now()}`;
        const newChannel: Channel = {
          id,
          name: name.trim(),
          youtubeChannelId: '',
          description: description?.trim() || '사용자 추가 채널',
          category: 'general',
          thumbnailUrl: '',
          level: 'all',
        };
        set((state) => ({
          customChannels: [...state.customChannels, newChannel],
          followedChannelIds: [...new Set([...state.followedChannelIds, id])],
        }));
        return newChannel;
      },

      removeChannel: (channelId) => {
        set((state) => ({
          customChannels: state.customChannels.filter((ch) => ch.id !== channelId),
          followedChannelIds: state.followedChannelIds.filter((id) => id !== channelId),
          channelVideos: Object.fromEntries(
            Object.entries(state.channelVideos).filter(([k]) => k !== channelId),
          ),
          channelNextPageTokens: Object.fromEntries(
            Object.entries(state.channelNextPageTokens).filter(([k]) => k !== channelId),
          ),
        }));
      },

      followChannel: (channelId) => {
        set((state) => ({
          followedChannelIds: [...new Set([...state.followedChannelIds, channelId])],
        }));
      },

      unfollowChannel: (channelId) => {
        set((state) => ({
          followedChannelIds: state.followedChannelIds.filter((id) => id !== channelId),
        }));
      },

      isFollowing: (channelId) => {
        return get().followedChannelIds.includes(channelId);
      },

      getFollowedChannels: () => {
        const all = get().getAllChannels();
        const { followedChannelIds } = get();
        return all.filter((ch) => followedChannelIds.includes(ch.id));
      },

      fetchChannelVideos: async (channel) => {
        set({ isLoadingVideos: true });
        try {
          const { data } = await api.get(`/youtube/search`, {
            params: { q: channel.name, maxResults: 12 },
          });
          const videos: ChannelVideo[] = (data.videos || []).map((v: any) => ({
            videoId: v.youtubeId || v.id,
            title: v.title,
            thumbnailUrl: v.thumbnailUrl,
            publishedAt: v.publishedAt,
            channelName: v.channelName || channel.name,
            channelId: channel.id,
          }));
          set((state) => ({
            channelVideos: { ...state.channelVideos, [channel.id]: videos },
            channelNextPageTokens: { ...state.channelNextPageTokens, [channel.id]: data.nextPageToken || null },
          }));
        } catch (e) {
          console.error('Failed to fetch channel videos:', e);
        } finally {
          set({ isLoadingVideos: false });
        }
      },

      loadMoreVideos: async (channel) => {
        const { channelNextPageTokens, isLoadingVideos } = get();
        const pageToken = channelNextPageTokens[channel.id];
        if (!pageToken || isLoadingVideos) return;

        set({ isLoadingVideos: true });
        try {
          const { data } = await api.get(`/youtube/search`, {
            params: { q: channel.name, pageToken },
          });
          const newVideos: ChannelVideo[] = (data.videos || []).map((v: any) => ({
            videoId: v.youtubeId || v.id,
            title: v.title,
            thumbnailUrl: v.thumbnailUrl,
            publishedAt: v.publishedAt,
            channelName: v.channelName || channel.name,
            channelId: channel.id,
          }));
          set((state) => {
            const existing = state.channelVideos[channel.id] || [];
            // Deduplicate
            const existingIds = new Set(existing.map((v) => v.videoId));
            const unique = newVideos.filter((v) => !existingIds.has(v.videoId));
            return {
              channelVideos: { ...state.channelVideos, [channel.id]: [...existing, ...unique] },
              channelNextPageTokens: { ...state.channelNextPageTokens, [channel.id]: data.nextPageToken || null },
            };
          });
        } catch (e) {
          console.error('Failed to load more videos:', e);
        } finally {
          set({ isLoadingVideos: false });
        }
      },

      hasMoreVideos: (channelId) => {
        return !!get().channelNextPageTokens[channelId];
      },
    }),
    {
      name: 'channel-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        customChannels: state.customChannels,
        followedChannelIds: state.followedChannelIds,
      }),
    },
  ),
);
