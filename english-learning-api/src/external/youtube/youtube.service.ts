import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { execSync } from 'child_process';
import {
  YouTubeSearchResult,
  YouTubeVideoDetail,
  CaptionEntry,
} from './youtube.types';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  private readonly searchCache = new Map<string, CacheEntry<YouTubeSearchResult[]>>();
  private readonly detailCache = new Map<string, CacheEntry<YouTubeVideoDetail>>();
  private readonly captionCache = new Map<string, CacheEntry<CaptionEntry[]>>();

  private static readonly SEARCH_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
  private static readonly DETAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CAPTION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY', '');
  }

  async searchVideos(
    query: string,
    maxResults = 10,
    pageToken?: string,
  ): Promise<{ results: YouTubeSearchResult[]; nextPageToken: string | null }> {
    const cacheKey = `${query}:${maxResults}:${pageToken || ''}`;
    const cached = this.getFromCache(this.searchCache, cacheKey);
    if (cached) {
      return cached as any;
    }

    try {
      const params: any = {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults,
        videoCaption: 'closedCaption',
        key: this.apiKey,
      };
      if (pageToken) params.pageToken = pageToken;

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/search`, { params }),
      );

      const results: YouTubeSearchResult[] = response.data.items.map(
        (item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails?.medium?.url || '',
          publishedAt: item.snippet.publishedAt,
        }),
      );

      const nextPageToken = response.data.nextPageToken || null;
      const data = { results, nextPageToken };

      this.setCache(
        this.searchCache,
        cacheKey,
        data as any,
        YouTubeService.SEARCH_TTL_MS,
      );

      return data;
    } catch (error) {
      this.logger.error(`YouTube search failed: ${error.message}`);
      throw error;
    }
  }

  async getVideoDetail(videoId: string): Promise<YouTubeVideoDetail> {
    const cached = this.getFromCache(this.detailCache, videoId);
    if (cached) {
      return cached;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/videos`, {
          params: {
            part: 'snippet,contentDetails',
            id: videoId,
            key: this.apiKey,
          },
        }),
      );

      const item = response.data.items?.[0];
      if (!item) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const detail: YouTubeVideoDetail = {
        videoId,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || '',
        durationSec: this.parseIsoDuration(item.contentDetails.duration),
        description: item.snippet.description || '',
      };

      this.setCache(
        this.detailCache,
        videoId,
        detail,
        YouTubeService.DETAIL_TTL_MS,
      );

      return detail;
    } catch (error) {
      this.logger.error(`YouTube video detail failed: ${error.message}`);
      throw error;
    }
  }

  async getCaptions(videoId: string, lang = 'en'): Promise<CaptionEntry[]> {
    const cacheKey = `${videoId}:${lang}`;
    const cached = this.getFromCache(this.captionCache, cacheKey);
    if (cached) {
      this.logger.log(`Caption cache hit for ${videoId}`);
      return cached;
    }

    try {
      const rawEntries = await this.fetchRawCaptions(videoId, lang);
      if (rawEntries.length === 0) return [];

      // Check if captions already have punctuation
      const allText = rawEntries.map(e => e.text).join(' ');
      const punctCount = (allText.match(/[.!?]/g) || []).length;
      const hasPunctuation = punctCount >= rawEntries.length * 0.15;

      if (hasPunctuation) {
        this.logger.log(`Captions already have punctuation (${punctCount} marks), skipping restoration`);
        this.setCache(this.captionCache, cacheKey, rawEntries, YouTubeService.CAPTION_TTL_MS);
        return rawEntries;
      }

      // Try to restore punctuation using AI model
      try {
        const punctuated = await this.restorePunctuation(allText);
        if (punctuated && punctuated.length > allText.length * 0.5) {
          const sentences = this.splitIntoSentences(punctuated, rawEntries);
          this.logger.log(`Punctuation restored: ${rawEntries.length} raw -> ${sentences.length} sentences`);
          this.setCache(this.captionCache, cacheKey, sentences, YouTubeService.CAPTION_TTL_MS);
          return sentences;
        }
      } catch (e) {
        this.logger.warn(`Punctuation restoration failed, returning raw captions: ${e.message}`);
      }

      this.setCache(this.captionCache, cacheKey, rawEntries, YouTubeService.CAPTION_TTL_MS);
      return rawEntries;
    } catch (error) {
      this.logger.error(`Caption fetch failed for ${videoId}: ${error?.message}`);
      return [];
    }
  }

  /**
   * Fetch raw captions from YouTube via yt-dlp.
   * Strategy:
   * 1. Try exact lang (e.g. "en")
   * 2. If not found, try wildcard "en.*" to catch auto-generated variants
   * 3. Pick the best file from downloaded results
   */
  private async fetchRawCaptions(videoId: string, lang: string): Promise<CaptionEntry[]> {
    const fs = require('fs');
    const prefix = `yt-${videoId}-${Date.now()}`;

    // Helper to clean up temp files
    const cleanup = () => {
      try {
        const tmpFiles = fs.readdirSync('/tmp').filter((f: string) => f.startsWith(prefix));
        for (const f of tmpFiles) { try { fs.unlinkSync(`/tmp/${f}`); } catch {} }
      } catch {}
    };

    // Attempt 1: exact language match
    const entries = await this.tryFetchCaptions(videoId, lang, prefix, fs);
    if (entries.length > 0) {
      cleanup();
      return entries;
    }

    // Attempt 2: wildcard language match (e.g. en.* catches en-nP7-2PuUl7o)
    this.logger.log(`No exact ${lang} captions for ${videoId}, trying wildcard ${lang}.*`);
    const entriesWild = await this.tryFetchCaptions(videoId, `${lang}.*`, `${prefix}-w`, fs);
    if (entriesWild.length > 0) {
      // Clean up all temp files
      try {
        const tmpFiles = fs.readdirSync('/tmp').filter((f: string) => f.startsWith(prefix));
        for (const f of tmpFiles) { try { fs.unlinkSync(`/tmp/${f}`); } catch {} }
      } catch {}
      return entriesWild;
    }

    cleanup();
    return [];
  }

  /**
   * Try to fetch captions with a specific sub-lang pattern.
   * Returns the first valid caption entries found.
   */
  private async tryFetchCaptions(
    videoId: string,
    subLang: string,
    prefix: string,
    fs: any,
  ): Promise<CaptionEntry[]> {
    const cmd = `yt-dlp --js-runtimes node --remote-components ejs:github --write-sub --write-auto-sub --sub-lang "${subLang}" --sub-format json3 --skip-download --no-warnings -o "/tmp/${prefix}" "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`;

    try {
      execSync(cmd, { timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      this.logger.warn(`yt-dlp command failed for ${videoId} (lang=${subLang}): ${e.message?.substring(0, 100)}`);
    }

    // Find all downloaded json3 files for this prefix
    let json3Files: string[] = [];
    try {
      json3Files = fs.readdirSync('/tmp')
        .filter((f: string) => f.startsWith(prefix) && f.endsWith('.json3'))
        .sort((a: string, b: string) => {
          // Prefer shorter filenames (more likely to be direct lang match)
          return a.length - b.length;
        });
    } catch {}

    // Try each file, return first valid one
    for (const fname of json3Files) {
      const filePath = `/tmp/${fname}`;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.trim().length === 0) continue;
        const json3 = JSON.parse(content);
        const entries = this.parseJson3Captions(json3);
        if (entries.length > 0) {
          this.logger.log(`yt-dlp: Got ${entries.length} captions for ${videoId} from ${fname}`);
          return entries;
        }
      } catch {}
    }

    return [];
  }

  /**
   * Restore punctuation using deepmultilingualpunctuation Python model
   */
  private async restorePunctuation(text: string): Promise<string> {
    const fs = require('fs');
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Write text to temp file to avoid shell escaping issues
    const tmpFile = `/tmp/punct-input-${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, cleanText, 'utf8');

    try {
      const result = execSync(
        `python3 /app/scripts/punctuate.py "${tmpFile}"`,
        { timeout: 300000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      return result.trim();
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  /**
   * Split punctuated text into sentence-level CaptionEntries,
   * mapping each sentence back to original timestamps using word-position interpolation.
   */
  private splitIntoSentences(punctuatedText: string, rawEntries: CaptionEntry[]): CaptionEntry[] {
    const sentences = punctuatedText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return rawEntries;

    // Build word list with interpolated per-word timestamps
    // Each word's time is estimated by its position within the raw caption
    const wordTimings: { word: string; timeSec: number }[] = [];
    for (const entry of rawEntries) {
      const words = entry.text.replace(/\n/g, ' ').trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;
      for (let i = 0; i < words.length; i++) {
        const t = entry.start + (i / words.length) * entry.dur;
        wordTimings.push({ word: words[i].toLowerCase(), timeSec: t });
      }
    }

    // Map each sentence to timestamps
    const result: CaptionEntry[] = [];
    let wordIdx = 0;
    let lastEndSec = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.replace(/[.!?,;:'"()-]/g, '').toLowerCase().split(/\s+/).filter(Boolean);
      if (sentenceWords.length === 0) continue;

      const startWordIdx = wordIdx;

      for (let i = 0; i < sentenceWords.length && wordIdx < wordTimings.length; i++) {
        const target = sentenceWords[i];
        let found = false;
        for (let scan = wordIdx; scan < Math.min(wordIdx + 4, wordTimings.length); scan++) {
          const candidate = wordTimings[scan].word;
          if (candidate === target ||
              (target.length > 3 && candidate.startsWith(target.slice(0, 3))) ||
              (candidate.length > 3 && target.startsWith(candidate.slice(0, 3)))) {
            wordIdx = scan + 1;
            found = true;
            break;
          }
        }
        if (!found) wordIdx++;
      }

      const startSec = startWordIdx < wordTimings.length
        ? Math.max(wordTimings[startWordIdx].timeSec, lastEndSec)
        : lastEndSec;
      const endIdx = Math.min(wordIdx - 1, wordTimings.length - 1);
      const endSec = endIdx >= 0 ? wordTimings[endIdx].timeSec + 1.0 : startSec + 2;

      lastEndSec = endSec;

      result.push({
        text: sentence,
        start: startSec,
        dur: Math.max(endSec - startSec, 0.5),
      });
    }

    return result;
  }

  private parseJson3Captions(json3: any): CaptionEntry[] {
    const events = json3?.events || [];
    const entries: CaptionEntry[] = [];
    for (const event of events) {
      if (!event.segs || event.tStartMs === undefined) continue;
      const text = event.segs.map((s: any) => s.utf8 || '').join('').trim();
      if (!text || text === '\n') continue;
      const start = event.tStartMs / 1000;
      const dur = (event.dDurationMs || 0) / 1000;
      entries.push({ text, start, dur });
    }
    return entries;
  }

  /**
   * Fetch videos from user's YouTube subscriptions using their OAuth token.
   */
  async getSubscriptionVideos(
    accessToken: string,
    pageToken?: string,
    refreshTokenFn?: () => Promise<string | null>,
  ) {
    try {
      return await this.fetchUserVideos(
        accessToken,
        'subscriptions',
        pageToken,
      );
    } catch (error: any) {
      // If 401, try refreshing the token
      if (error?.response?.status === 401 && refreshTokenFn) {
        const newToken = await refreshTokenFn();
        if (newToken) {
          return this.fetchUserVideos(newToken, 'subscriptions', pageToken);
        }
      }
      this.logger.error(`Subscription videos fetch failed: ${error.message}`);
      return { videos: [], nextPageToken: null };
    }
  }

  /**
   * Fetch user's liked videos using their OAuth token.
   */
  async getLikedVideos(
    accessToken: string,
    pageToken?: string,
    refreshTokenFn?: () => Promise<string | null>,
  ) {
    try {
      return await this.fetchUserVideos(accessToken, 'liked', pageToken);
    } catch (error: any) {
      if (error?.response?.status === 401 && refreshTokenFn) {
        const newToken = await refreshTokenFn();
        if (newToken) {
          return this.fetchUserVideos(newToken, 'liked', pageToken);
        }
      }
      this.logger.error(`Liked videos fetch failed: ${error.message}`);
      return { videos: [], nextPageToken: null };
    }
  }

  private async fetchUserVideos(
    accessToken: string,
    type: 'subscriptions' | 'liked',
    pageToken?: string,
  ) {
    if (type === 'subscriptions') {
      // Step 1: Get subscription channel IDs
      const subsResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/subscriptions`, {
          params: {
            part: 'snippet',
            mine: true,
            maxResults: 20,
            ...(pageToken && { pageToken }),
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      const channelIds = subsResponse.data.items?.map(
        (item: any) => item.snippet.resourceId.channelId,
      ) || [];

      if (channelIds.length === 0) {
        return { videos: [], nextPageToken: subsResponse.data.nextPageToken || null };
      }

      // Use channels API to get each channel's "uploads" playlist (1 unit per call)
      // Then use playlistItems API (1 unit per call) — much cheaper than search (100 units)
      const allVideos: any[] = [];
      for (const channelId of channelIds.slice(0, 10)) {
        try {
          // Get the "uploads" playlist ID for this channel
          const chResponse = await firstValueFrom(
            this.httpService.get(`${this.baseUrl}/channels`, {
              params: {
                part: 'contentDetails',
                id: channelId,
                key: this.apiKey,
              },
            }),
          );
          const uploadsPlaylistId =
            chResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
          if (!uploadsPlaylistId) continue;

          // Get recent videos from uploads playlist (1 quota unit)
          const plResponse = await firstValueFrom(
            this.httpService.get(`${this.baseUrl}/playlistItems`, {
              params: {
                part: 'snippet',
                playlistId: uploadsPlaylistId,
                maxResults: 5,
                key: this.apiKey,
              },
            }),
          );
          allVideos.push(...(plResponse.data.items || []));
        } catch (e) {
          this.logger.warn(`Failed to fetch videos for channel ${channelId}`);
        }
      }

      // Sort by publish date, newest first
      allVideos.sort((a, b) =>
        new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime(),
      );

      return {
        videos: allVideos.slice(0, 20).map((item: any) => ({
          id: item.snippet.resourceId?.videoId || item.id,
          youtubeId: item.snippet.resourceId?.videoId || item.id,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle || item.snippet.videoOwnerChannelTitle,
          thumbnailUrl: item.snippet.thumbnails?.medium?.url || '',
          description: item.snippet.description || '',
          publishedAt: item.snippet.publishedAt,
        })),
        nextPageToken: subsResponse.data.nextPageToken || null,
      };
    } else {
      // Liked videos - use the "liked" playlist (playlistItems API, 1 unit per call)
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/videos`, {
          params: {
            part: 'snippet,contentDetails',
            myRating: 'like',
            maxResults: 20,
            ...(pageToken && { pageToken }),
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      return {
        videos: (response.data.items || []).map((item: any) => ({
          id: item.id,
          youtubeId: item.id,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails?.medium?.url || '',
          description: item.snippet.description || '',
          publishedAt: item.snippet.publishedAt,
          duration: item.contentDetails
            ? this.parseIsoDuration(item.contentDetails.duration)
            : undefined,
        })),
        nextPageToken: response.data.nextPageToken || null,
      };
    }
  }

  /**
   * Parse ISO 8601 duration (e.g., "PT1H2M30S") to seconds.
   */
  private parseIsoDuration(isoDuration: string): number {
    const match = isoDuration.match(
      /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/,
    );
    if (!match) {
      return 0;
    }
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private getFromCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    data: T,
    ttlMs: number,
  ): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }
}
