import type { LoadListParams } from '../lib/queryKeys';
import type { Load, LoadStatus, Paginated } from '../shared/apiTypes';
import { api } from './axiosClient';

export const fetchLoads = async (params: LoadListParams): Promise<Paginated<Load>> => {
  const { data } = await api.get<Paginated<Load>>('/loads', { params });
  return data;
};

export const fetchLoad = async (id: string): Promise<Load> => {
  const { data } = await api.get<Load>(`/loads/${id}`);
  return data;
};

export const bookLoad = async (id: string, version: number): Promise<Load> => {
  const { data } = await api.post<Load>(`/loads/${id}/book`, { version });
  return data;
};

export const advanceLoadStatus = async (
  id: string,
  status: LoadStatus,
  version: number,
): Promise<Load> => {
  const { data } = await api.post<Load>(`/loads/${id}/status`, { status, version });
  return data;
};
