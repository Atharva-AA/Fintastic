import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const CACHE_TIMEOUT = 60000; // 1 minute

const cache = new Map();

/**
 * Get market data for a symbol
 * Uses cache to avoid excessive API calls
 */
export async function getMarketData(symbol) {
  const cacheKey = symbol.toUpperCase();
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
    console.log(`📊 Using cached market data for ${cacheKey}`);
    return cached.data;
  }

  try {
    console.log(`📊 Fetching market data for ${cacheKey} from AI service`);
    const response = await axios.post(`${AI_SERVICE_URL}/market-data`, {
      symbol: cacheKey,
    });

    const data = response.data;
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error(`❌ Error fetching market data for ${cacheKey}:`, error.message);
    throw error;
  }
}

/**
 * Clear cache for a symbol or all cache
 */
export function clearCache(symbol = null) {
  if (symbol) {
    cache.delete(symbol.toUpperCase());
  } else {
    cache.clear();
  }
}

