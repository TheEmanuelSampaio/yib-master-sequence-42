import { useState, useCallback, useRef, useEffect } from 'react';

interface UseDataFetchingOptions<T> {
  initialValue?: T;
  cacheDuration?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  loadingDelay?: number;
  debounceTime?: number;
}

export function useDataFetching<T, P extends unknown[]>(
  fetchFn: (...args: P) => Promise<T>,
  options: UseDataFetchingOptions<T> = {}
) {
  const {
    initialValue,
    cacheDuration = 30000, // Default cache duration: 30 seconds
    onSuccess,
    onError,
    loadingDelay = 300, // Delay showing loading state to prevent flicker
    debounceTime = 500, // Debounce time for fetch calls
  } = options;

  const [data, setData] = useState<T | undefined>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const cache = useRef<{
    data: T | undefined;
    timestamp: number;
    key?: string;
  }>({
    data: initialValue,
    timestamp: 0,
  });
  
  const loadingTimerRef = useRef<number | null>(null);
  const fetchInProgressRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const lastFetchArgsRef = useRef<P | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const generateCacheKey = useCallback((args: P): string => {
    return JSON.stringify(args);
  }, []);

  const fetchData = useCallback(
    async (...args: P): Promise<T | undefined> => {
      // Keep track of args for retries
      lastFetchArgsRef.current = args;
      
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Return a promise that resolves when the data is fetched
      return new Promise((resolve, reject) => {
        debounceTimerRef.current = window.setTimeout(async () => {
          // Don't start another request if one is in progress
          if (fetchInProgressRef.current) {
            console.log('[useDataFetching] Request already in progress, skipping');
            resolve(data);
            return;
          }
          
          // Check cache
          const cacheKey = generateCacheKey(args);
          const now = Date.now();
          if (
            cache.current.data !== undefined && 
            cache.current.key === cacheKey &&
            now - cache.current.timestamp < cacheDuration
          ) {
            console.log('[useDataFetching] Returning cached data');
            resolve(cache.current.data);
            return;
          }
          
          try {
            fetchInProgressRef.current = true;
            
            // Delay showing loading state to prevent flicker for quick responses
            loadingTimerRef.current = window.setTimeout(() => {
              if (fetchInProgressRef.current) {
                setIsLoading(true);
              }
            }, loadingDelay);
            
            console.log('[useDataFetching] Fetching data...');
            const result = await fetchFn(...args);
            
            // Clear loading timer
            if (loadingTimerRef.current) {
              clearTimeout(loadingTimerRef.current);
              loadingTimerRef.current = null;
            }
            
            // Update cache
            cache.current = {
              data: result,
              timestamp: Date.now(),
              key: cacheKey,
            };
            
            setData(result);
            setIsLoading(false);
            setError(null);
            
            if (onSuccess) {
              onSuccess(result);
            }
            
            resolve(result);
          } catch (err) {
            // Clear loading timer
            if (loadingTimerRef.current) {
              clearTimeout(loadingTimerRef.current);
              loadingTimerRef.current = null;
            }
            
            const error = err instanceof Error ? err : new Error('Unknown error');
            console.error('[useDataFetching] Error fetching data:', error);
            
            setIsLoading(false);
            setError(error);
            
            if (onError) {
              onError(error);
            }
            
            reject(error);
          } finally {
            fetchInProgressRef.current = false;
          }
        }, debounceTime);
      });
    },
    [fetchFn, cacheDuration, onSuccess, onError, loadingDelay, debounceTime, data, generateCacheKey]
  );

  const retry = useCallback(async (): Promise<T | undefined> => {
    if (lastFetchArgsRef.current) {
      return fetchData(...lastFetchArgsRef.current);
    }
    return undefined;
  }, [fetchData]);

  const clearCache = useCallback(() => {
    cache.current = {
      data: undefined,
      timestamp: 0,
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchData,
    retry,
    clearCache,
  };
}
