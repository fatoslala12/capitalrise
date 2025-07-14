const pool = require('../db');

// Simple in-memory cache
const queryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Optimized query executor with caching
const executeQuery = async (query, params = [], cacheKey = null, enableCache = true) => {
  // Check cache first
  if (enableCache && cacheKey && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    const client = await pool.connect();
    const result = await client.query(query, params);
    client.release();

    // Cache the result
    if (enableCache && cacheKey) {
      queryCache.set(cacheKey, {
        data: result.rows,
        timestamp: Date.now()
      });
    }

    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Batch query executor for multiple queries
const executeBatchQueries = async (queries) => {
  const client = await pool.connect();
  const results = [];

  try {
    await client.query('BEGIN');
    
    for (const { query, params } of queries) {
      const result = await client.query(query, params);
      results.push(result.rows);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Clear cache utility
const clearCache = (key = null) => {
  if (key) {
    queryCache.delete(key);
  } else {
    queryCache.clear();
  }
};

// Get cache statistics
const getCacheStats = () => {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys())
  };
};

module.exports = {
  executeQuery,
  executeBatchQueries,
  clearCache,
  getCacheStats
}; 