import api from './api';
import type { AuthTokens, LoginRequest, RegisterRequest, User } from '../types/user';

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/auth/login', { email, password });
  return data;
}

export async function register(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/auth/register', { email, password });
  return data;
}

export async function socialLogin(
  provider: 'google' | 'kakao' | 'apple',
  token: string,
  serverAuthCode?: string,
): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/auth/social', {
    provider,
    providerToken: token,
    serverAuthCode,
  });
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}
