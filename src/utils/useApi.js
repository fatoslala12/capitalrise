import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

// Simple cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const {
    method = 'GET',
    body = null,
    params = null,
    cacheKey = url,
    enableCache = true,
    dependencies = []
  } = options;

  const fetchData = useCallback(async () => {
    // Check cache first
    if (enableCache && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const config = {
        method,
        signal: abortControllerRef.current.signal,
        ...(body && { data: body }),
        ...(params && { params })
      };

      const response = await api(url, config);
      
      // Cache the response
      if (enableCache) {
        cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }

      setData(response.data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
        console.error(`API Error for ${url}:`, err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, method, body, params, cacheKey, enableCache, ...dependencies]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    if (enableCache) {
      cache.delete(cacheKey);
    }
    fetchData();
  }, [fetchData, enableCache, cacheKey]);

  return { data, loading, error, refetch };
};

// Hook for mutations (POST, PUT, DELETE)
export const useApiMutation = (url, options = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = useCallback(async (body = null) => {
    setLoading(true);
    setError(null);

    try {
      const config = {
        method: options.method || 'POST',
        ...(body && { data: body })
      };

      const response = await api(url, config);
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err);
      console.error(`API Mutation Error for ${url}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, options.method]);

  return { mutate, loading, error, data };
};

// Utility function to clear cache
export const clearApiCache = (key = null) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}; 