/**
 * URL State Synchronization Hook
 * Syncs component state with URL query parameters for deep linking
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UseRouteStateOptions<T> {
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  replace?: boolean;
}

/**
 * Sync state with URL query parameters
 *
 * @example
 * const [filter, setFilter] = useRouteState('filter', {
 *   defaultValue: 'all',
 * });
 *
 * @example
 * const [filters, setFilters] = useRouteState('filters', {
 *   defaultValue: {},
 *   serialize: (val) => JSON.stringify(val),
 *   deserialize: (val) => JSON.parse(val),
 * });
 */
export function useRouteState<T extends string | number | boolean | object>(
  key: string,
  options: UseRouteStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  

  const {
    defaultValue,
    serialize = (val) => String(val),
    deserialize = (val) => {
      // Auto-detect type and deserialize
      if (typeof defaultValue === 'boolean') {
        return (val === 'true') as T;
      }
      if (typeof defaultValue === 'number') {
        return Number(val) as T;
      }
      if (typeof defaultValue === 'object') {
        try {
          return JSON.parse(val) as T;
        } catch {
          return defaultValue;
        }
      }
      return val as T;
    },
    replace = false,
  } = options;

  // Get current value from URL or use default
  const value = useMemo(() => {
    const paramValue = searchParams.get(key);
    if (paramValue === null) {
      return defaultValue;
    }
    return deserialize(paramValue);
  }, [searchParams, key, defaultValue, deserialize]);

  // Update URL with new value
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const nextValue = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(value)
        : newValue;

      const newSearchParams = new URLSearchParams(searchParams);

      if (nextValue === defaultValue || nextValue === null || nextValue === undefined) {
        // Remove param if it's the default value
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, serialize(nextValue));
      }

      setSearchParams(newSearchParams, { replace });
    },
    [searchParams, setSearchParams, key, value, defaultValue, serialize, replace]
  );

  return [value, setValue];
}

/**
 * Manage multiple URL state parameters
 *
 * @example
 * const [state, setState] = useRouteStateMultiple({
 *   page: { defaultValue: 1 },
 *   filter: { defaultValue: 'all' },
 *   sort: { defaultValue: 'date' },
 * });
 */
export function useRouteStateMultiple<T extends Record<string, any>>(
  config: { [K in keyof T]: UseRouteStateOptions<T[K]> }
): [T, (updates: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const result = {} as T;

    Object.entries(config).forEach(([key, options]) => {
      const paramValue = searchParams.get(key);
      const { defaultValue, deserialize } = options as UseRouteStateOptions<any>;

      if (paramValue === null) {
        result[key as keyof T] = defaultValue;
      } else {
        const deserializeFn = deserialize || ((val: string) => {
          if (typeof defaultValue === 'boolean') return val === 'true';
          if (typeof defaultValue === 'number') return Number(val);
          if (typeof defaultValue === 'object') {
            try {
              return JSON.parse(val);
            } catch {
              return defaultValue;
            }
          }
          return val;
        });
        result[key as keyof T] = deserializeFn(paramValue);
      }
    });

    return result;
  }, [searchParams, config]);

  const setState = useCallback(
    (updates: Partial<T>) => {
      const newSearchParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        const options = config[key as keyof T] as UseRouteStateOptions<any>;
        const { defaultValue, serialize } = options;

        if (value === defaultValue || value === null || value === undefined) {
          newSearchParams.delete(key);
        } else {
          const serializeFn = serialize || ((val: any) => String(val));
          newSearchParams.set(key, serializeFn(value));
        }
      });

      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams, config]
  );

  return [state, setState];
}

/**
 * Get and update a single query parameter
 *
 * @example
 * const [search, setSearch] = useQueryParam('q');
 */
export function useQueryParam(
  key: string
): [string | null, (value: string | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key);

  const setValue = useCallback(
    (newValue: string | null) => {
      const newSearchParams = new URLSearchParams(searchParams);

      if (newValue === null || newValue === '') {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, newValue);
      }

      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams, key]
  );

  return [value, setValue];
}

/**
 * Parse all query parameters as an object
 *
 * @example
 * const params = useQueryParams();
 * // { page: '1', filter: 'active', sort: 'date' }
 */
export function useQueryParams(): Record<string, string> {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);
}
