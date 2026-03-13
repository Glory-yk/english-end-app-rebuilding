import { useState, useCallback, useRef } from 'react';

interface Subtitle {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  translation?: string;
  wordsJson?: any[];
}

interface SubtitleSyncResult {
  currentSubtitle: Subtitle | null;
  currentIndex: number;
  updateTime: (timeInSeconds: number) => void;
}

export function useSubtitleSync(subtitles: Subtitle[]): SubtitleSyncResult {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const lastIndexRef = useRef(-1);

  // Binary search for O(log n) subtitle lookup
  const findSubtitleIndex = useCallback((timeMs: number): number => {
    if (subtitles.length === 0) return -1;

    let low = 0;
    let high = subtitles.length - 1;
    let result = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (subtitles[mid].startMs <= timeMs) {
        if (subtitles[mid].endMs >= timeMs) {
          return mid;
        }
        result = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Check if result is still within range
    if (result !== -1 && subtitles[result].endMs >= timeMs) {
      return result;
    }
    return -1;
  }, [subtitles]);

  const updateTime = useCallback((timeInSeconds: number) => {
    const timeMs = timeInSeconds * 1000;
    const index = findSubtitleIndex(timeMs);

    if (index !== lastIndexRef.current) {
      lastIndexRef.current = index;
      setCurrentIndex(index);
    }
  }, [findSubtitleIndex]);

  return {
    currentSubtitle: currentIndex >= 0 ? subtitles[currentIndex] : null,
    currentIndex,
    updateTime,
  };
}
