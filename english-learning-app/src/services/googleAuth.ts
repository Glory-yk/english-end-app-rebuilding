import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { AuthTokens } from '../types/user';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '636079971392-plvk4ulq0ev4cetm07433d5pifkpf6nc.apps.googleusercontent.com';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface GoogleLoginResult {
  promptAsync: () => Promise<void>;
  isLoading: boolean;
}

export function useGoogleLogin(
  onSuccess: (tokens: AuthTokens) => void,
  onError?: (error: string) => void,
): GoogleLoginResult {
  const [isLoading, setIsLoading] = useState(false);

  const promptAsync = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build the redirect URI for the app
      const origin = window.location.origin.replace(/\/$/, '');
      const appRedirectUri = Platform.OS === 'web'
        ? `${origin}/auth-callback`
        : Linking.createURL('auth-callback');
      console.log('[GoogleAuth] appRedirectUri:', appRedirectUri);

      // Open backend OAuth endpoint which handles the full Google OAuth flow
      const authUrl = `${API_URL}/auth/google?redirect=${encodeURIComponent(appRedirectUri)}`;
      console.log('[GoogleAuth] authUrl:', authUrl);

      if (Platform.OS === 'web') {
        // On web, redirect the current window directly
        window.location.href = authUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, appRedirectUri);
      console.log('[GoogleAuth] result:', JSON.stringify(result));

      if (result.type === 'success' && result.url) {
        // Parse tokens from the redirect URL
        const url = new URL(result.url);
        // Try hash params first (fragment), then search params
        const params = url.hash
          ? new URLSearchParams(url.hash.substring(1))
          : url.searchParams;

        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');
        const userId = params.get('userId');
        const email = params.get('email');
        const name = params.get('name');
        const hasYouTubeAccess = params.get('hasYouTubeAccess') === 'true';
        const error = params.get('error');

        if (error) {
          onError?.(decodeURIComponent(error));
          return;
        }

        if (accessToken && refreshToken) {
          onSuccess({
            accessToken,
            refreshToken,
            user: {
              id: userId || '',
              email: email || '',
              name: name || undefined,
              provider: 'google',
              hasYouTubeAccess,
            },
          });
        } else {
          onError?.('Google 로그인에서 토큰을 받지 못했습니다');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User cancelled
      } else {
        onError?.('Google 로그인이 취소되었습니다');
      }
    } catch (e: any) {
      console.error('[GoogleAuth] error:', e);
      onError?.(e?.message || 'Google 로그인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  return { promptAsync, isLoading };
}
