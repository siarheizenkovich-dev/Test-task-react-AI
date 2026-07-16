import type { AuthResponse, User } from '../shared/apiTypes';
import { api } from './axiosClient';

export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
  return data;
};

export const fetchMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/auth/me');
  return data;
};
