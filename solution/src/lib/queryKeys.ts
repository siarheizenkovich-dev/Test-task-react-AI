/**
 * Hierarchical query keys. Invalidation targets a prefix:
 *   loadKeys.all          → everything load-related (after mutations)
 *   loadKeys.lists()      → every list variant, any filter combination
 *   loadKeys.detail(id)   → one load
 */

export interface LoadListParams {
  page: number;
  limit: number;
  status?: string;
  originState?: string;
  equipment?: string;
  q?: string;
  assigned?: 'me';
}

export const loadKeys = {
  all: ['loads'] as const,
  lists: () => [...loadKeys.all, 'list'] as const,
  list: (params: LoadListParams) => [...loadKeys.lists(), params] as const,
  details: () => [...loadKeys.all, 'detail'] as const,
  detail: (id: string) => [...loadKeys.details(), id] as const,
};

export const authKeys = {
  me: ['auth', 'me'] as const,
};
