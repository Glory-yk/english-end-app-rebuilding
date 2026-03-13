import React, { useCallback, useRef, useState, useEffect, memo, useImperativeHandle, forwardRef } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

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

const SCREEN_WIDTH = Dimensions.get('window').width;
const PLAYER_HEIGHT = Math.round(SCREEN_WIDTH * 9 / 16);

const YouTubePlayerComponent = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayerInner({ videoId, onTimeChange, onStateChange }, ref) {
    const playerRef = useRef<any>(null);
    const [playing, setPlaying] = useState(false);
    const [status, setStatus] = useState('loading');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onTimeChangeRef = useRef(onTimeChange);
    const onStateChangeRef = useRef(onStateChange);

    useEffect(() => { onTimeChangeRef.current = onTimeChange; }, [onTimeChange]);
    useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

    useEffect(() => {
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, []);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
      },
      play: () => {
        setPlaying(true);
      },
      pause: () => {
        setPlaying(false);
      },
      getCurrentTime: async () => {
        try {
          return (await playerRef.current?.getCurrentTime()) ?? 0;
        } catch {
          return 0;
        }
      },
    }));

    const onStateChangeHandler = useCallback((state: string) => {
      setStatus('state: ' + state);
      if (state === 'playing') {
        setPlaying(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(async () => {
          try {
            const time = await playerRef.current?.getCurrentTime();
            if (time !== undefined && onTimeChangeRef.current) {
              onTimeChangeRef.current(time);
            }
          } catch {}
        }, 500);
      } else if (state === 'paused' || state === 'ended' || state === 'unstarted') {
        setPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      onStateChangeRef.current?.(state);
    }, []);

    const onReady = useCallback(() => {
      setStatus('ready');
    }, []);

    const onPlayerError = useCallback((err: string) => {
      setStatus('error: ' + err);
    }, []);

    return (
      <View style={styles.outer}>
        <View style={styles.container}>
          <YoutubePlayer
            ref={playerRef}
            height={PLAYER_HEIGHT}
            width={SCREEN_WIDTH}
            videoId={videoId}
            play={playing}
            onChangeState={onStateChangeHandler}
            onReady={onReady}
            onError={onPlayerError}
            forceAndroidAutoplay={true}
            initialPlayerParams={{
              preventFullScreen: false,
              modestbranding: true,
              rel: false,
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
              javaScriptEnabled: true,
              domStorageEnabled: true,
              setSupportMultipleWindows: false,
              mixedContentMode: 'always',
              originWhitelist: ['*'],
              thirdPartyCookiesEnabled: true,
              onError: (syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                setStatus('webview error: ' + JSON.stringify(nativeEvent));
              },
              onHttpError: (syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                setStatus('http error: ' + nativeEvent.statusCode);
              },
            }}
            webViewStyle={styles.webView}
          />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#000',
  },
  container: {
    width: SCREEN_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundColor: '#000',
  },
  webView: {
    opacity: 0.99,
  },
});

export default memo(YouTubePlayerComponent);
