// Memoization utilities for performance optimization

// Simple memoization function
export const memoize = (fn) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Memoization with cache size limit
export const memoizeWithLimit = (fn, limit = 100) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    
    const result = fn(...args);
    
    // Remove oldest entry if cache is full
    if (cache.size >= limit) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  };
};

// Memoization with expiration time
export const memoizeWithExpiration = (fn, expirationMs = 5 * 60 * 1000) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    const now = Date.now();
    
    if (cache.has(key)) {
      const cached = cache.get(key);
      if (now - cached.timestamp < expirationMs) {
        return cached.value;
      } else {
        cache.delete(key);
      }
    }
    
    const result = fn(...args);
    cache.set(key, {
      value: result,
      timestamp: now
    });
    
    return result;
  };
};

// Debounced memoization for expensive operations
export const debouncedMemoize = (fn, delay = 300) => {
  const cache = new Map();
  const timeouts = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    // Clear existing timeout
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key));
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        const result = fn(...args);
        cache.set(key, result);
        timeouts.delete(key);
        resolve(result);
      }, delay);
      
      timeouts.set(key, timeout);
    });
  };
};

// React hook for memoization
export const useMemoizedValue = (computeValue, dependencies, options = {}) => {
  const { expirationMs, cacheLimit } = options;
  
  const memoizedCompute = React.useMemo(() => {
    if (expirationMs) {
      return memoizeWithExpiration(computeValue, expirationMs);
    } else if (cacheLimit) {
      return memoizeWithLimit(computeValue, cacheLimit);
    } else {
      return memoize(computeValue);
    }
  }, [computeValue, expirationMs, cacheLimit]);
  
  return React.useMemo(() => {
    return memoizedCompute(...dependencies);
  }, dependencies);
};

// Cache for API responses
export class ApiCache {
  constructor(expirationMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.expirationMs = expirationMs;
  }
  
  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.expirationMs) {
      return cached.value;
    }
    return null;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  clear() {
    this.cache.clear();
  }
  
  clearExpired() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.expirationMs) {
        this.cache.delete(key);
      }
    }
  }
}

// Global API cache instance
export const apiCache = new ApiCache();