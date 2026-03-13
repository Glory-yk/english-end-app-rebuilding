import { useState, useRef, useCallback } from 'react';

interface UseAudioResult {
  isPlaying: boolean;
  playWord: (url: string) => Promise<void>;
  stop: () => Promise<void>;
}

export function useAudio(): UseAudioResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<any>(null);

  const stop = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {
      // Ignore errors during cleanup
    }
    setIsPlaying(false);
  }, []);

  const playWord = useCallback(async (url: string) => {
    try {
      await stop();
      // TODO: Implement with expo-av when package is installed
      // For now, log the URL
      console.log('Play audio:', url);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 1000);
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
    }
  }, [stop]);

  return { isPlaying, playWord, stop };
}
