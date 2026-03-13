import React, { useCallback, useRef, useState, useEffect, memo, useImperativeHandle, forwardRef } from 'react';

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => Promise<number>;
}

interface YouTubePlayerProps {
  videoId: string;
  onTimeChange?: (currentTime: number) => void;
  onStateChange?: (state: string) => void;
}

const YouTubePlayerComponent = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayerInner({ videoId, onTimeChange, onStateChange }, ref) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onTimeChangeRef = useRef(onTimeChange);
    const onStateChangeRef = useRef(onStateChange);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => { onTimeChangeRef.current = onTimeChange; }, [onTimeChange]);
    useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

    // Load YouTube IFrame API
    useEffect(() => {
      if (typeof window === 'undefined') return;

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        document.head.appendChild(tag);
      }

      const initPlayer = () => {
        if (!containerRef.current) return;
        // Create a div for the player
        const playerDiv = document.createElement('div');
        playerDiv.id = `yt-player-${videoId}`;
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(playerDiv);

        playerRef.current = new (window as any).YT.Player(playerDiv.id, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              setReady(true);
              onStateChangeRef.current?.('ready');
            },
            onStateChange: (event: any) => {
              const stateMap: Record<number, string> = {
                [-1]: 'unstarted',
                0: 'ended',
                1: 'playing',
                2: 'paused',
                3: 'buffering',
                5: 'cued',
              };
              const state = stateMap[event.data] || 'unknown';
              onStateChangeRef.current?.(state);

              if (state === 'playing') {
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                  try {
                    const time = playerRef.current?.getCurrentTime?.();
                    if (time !== undefined && onTimeChangeRef.current) {
                      onTimeChangeRef.current(time);
                    }
                  } catch {}
                }, 200);
              } else if (state === 'paused' || state === 'ended') {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
            },
          },
        });
      };

      if ((window as any).YT && (window as any).YT.Player) {
        initPlayer();
      } else {
        (window as any).onYouTubeIframeAPIReady = initPlayer;
      }

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        try { playerRef.current?.destroy(); } catch {}
      };
    }, [videoId]);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
      },
      play: () => {
        playerRef.current?.playVideo();
      },
      pause: () => {
        playerRef.current?.pauseVideo();
      },
      getCurrentTime: async () => {
        try {
          return playerRef.current?.getCurrentTime() ?? 0;
        } catch {
          return 0;
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#000',
          maxHeight: 400,
        }}
      />
    );
  }
);

export default memo(YouTubePlayerComponent);
