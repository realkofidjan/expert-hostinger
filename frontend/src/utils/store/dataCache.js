// Simple in-memory cache for faster data loading
class DataCache {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  get(key) {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  delete(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
const dataCache = new DataCache();

// Cache keys
export const CACHE_KEYS = {
  HOME_PRODUCTS: "home_products",
  HOME_BLOGS: "home_blogs",
  ALL_BLOGS: "all_blogs",
  PRODUCT: (id) => `product_${id}`,
  PRODUCT_DISCOUNT: (id) => `product_discount_${id}`,
  BLOG_POST: (id) => `blog_post_${id}`,
};

export default dataCache;
