import axios from 'axios';
import type { ApiErrorBody, Load } from '../shared/apiTypes';

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
};

/** On 409 VERSION_CONFLICT the server ships the current load in the body. */
export const getConflictLoad = (error: unknown): Load | null => {
  if (axios.isAxiosError<ApiErrorBody>(error) && error.response?.status === 409) {
    return error.response.data?.load ?? null;
  }
  return null;
};
