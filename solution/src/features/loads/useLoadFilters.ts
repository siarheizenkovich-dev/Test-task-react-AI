import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * The URL is the single source of truth for the board view: filters, search
 * and page live in search params, so reload / share / back-forward all
 * restore the exact view.
 */

export interface BoardFilters {
  status: string;
  originState: string;
  equipment: string;
  q: string;
  page: number;
}

const readFilters = (params: URLSearchParams): BoardFilters => ({
  status: params.get('status') ?? '',
  originState: params.get('originState') ?? '',
  equipment: params.get('equipment') ?? '',
  q: params.get('q') ?? '',
  page: Math.max(1, Number(params.get('page') ?? '1') || 1),
});

export const useLoadFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  /**
   * Applies partial changes. Any filter change resets the page (a new result
   * set starts from page 1) unless `page` itself is part of the change.
   * Typing in the search box uses `replace` to avoid flooding history.
   */
  const patchFilters = useCallback(
    (changes: Partial<BoardFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const apply = (key: string, value: string | number | undefined) => {
            if (value === undefined) return;
            const str = String(value);
            if (str === '' || (key === 'page' && str === '1')) next.delete(key);
            else next.set(key, str);
          };
          apply('status', changes.status);
          apply('originState', changes.originState);
          apply('equipment', changes.equipment);
          apply('q', changes.q);
          if ('page' in changes) apply('page', changes.page);
          else next.delete('page');
          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  return { filters, patchFilters };
};
