// Enhanced caching system for VibeShelf
class CacheManager {
  constructor() {
    this.CACHE_CONFIG = {
      books: { ttl: 24 * 60 * 60 * 1000, prefix: 'vibeshelf-books' }, // 24 hours
      search: { ttl: 30 * 60 * 1000, prefix: 'vibeshelf-search' },    // 30 minutes
      popular: { ttl: 6 * 60 * 60 * 1000, prefix: 'vibeshelf-popular' }, // 6 hours
      reviews: { ttl: 30 * 60 * 1000, prefix: 'vibeshelf-reviews' },  // 30 minutes
      bookDetails: { ttl: 2 * 60 * 60 * 1000, prefix: 'vibeshelf-book' }, // 2 hours
      metadata: { ttl: 12 * 60 * 60 * 1000, prefix: 'vibeshelf-meta' } // 12 hours
    };
  }

  // Generate cache key
  generateKey(type, identifier = '', subkey = '') {
    const config = this.CACHE_CONFIG[type];
    if (!config) throw new Error(`Unknown cache type: ${type}`);
    
    const parts = [config.prefix, identifier, subkey].filter(Boolean);
    return parts.join('-');
  }

  // Get cached data with TTL check
  get(type, identifier = '', subkey = '') {
    try {
      const key = this.generateKey(type, identifier, subkey);
      const cached = localStorage.getItem(key);
      
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const config = this.CACHE_CONFIG[type];
      
      // Check if cache is still valid
      if (Date.now() - parsed.timestamp < config.ttl) {
        return parsed.data;
      }
      
      // Remove expired cache
      this.remove(type, identifier, subkey);
      return null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  // Set cached data with metadata
  set(type, identifier = '', subkey = '', data, metadata = {}) {
    try {
      const key = this.generateKey(type, identifier, subkey);
      const cacheObject = {
        data,
        timestamp: Date.now(),
        metadata,
        type,
        identifier,
        subkey
      };
      
      localStorage.setItem(key, JSON.stringify(cacheObject));
      return true;
    } catch (error) {
      console.warn('Cache set error:', error);
      // If storage is full, try to clear old entries
      this.cleanup();
      try {
        localStorage.setItem(key, JSON.stringify(cacheObject));
        return true;
      } catch (retryError) {
        console.error('Failed to cache after cleanup:', retryError);
        return false;
      }
    }
  }

  // Remove specific cache entry
  remove(type, identifier = '', subkey = '') {
    try {
      const key = this.generateKey(type, identifier, subkey);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  // Check if cache exists and is valid
  has(type, identifier = '', subkey = '') {
    return this.get(type, identifier, subkey) !== null;
  }

  // Get cache info (for debugging)
  getInfo(type, identifier = '', subkey = '') {
    try {
      const key = this.generateKey(type, identifier, subkey);
      const cached = localStorage.getItem(key);
      
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const config = this.CACHE_CONFIG[type];
      const age = Date.now() - parsed.timestamp;
      const remaining = Math.max(0, config.ttl - age);
      
      return {
        key,
        age,
        remaining,
        isValid: remaining > 0,
        size: cached.length,
        metadata: parsed.metadata
      };
    } catch (error) {
      console.warn('Cache info error:', error);
      return null;
    }
  }

  // Cleanup expired entries
  cleanup() {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vibeshelf-')) {
          try {
            const cached = localStorage.getItem(key);
            const parsed = JSON.parse(cached);
            
            // Find the type from the key
            const type = Object.keys(this.CACHE_CONFIG).find(t => 
              key.startsWith(this.CACHE_CONFIG[t].prefix)
            );
            
            if (type) {
              const config = this.CACHE_CONFIG[type];
              if (Date.now() - parsed.timestamp >= config.ttl) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // If we can't parse it, it's probably corrupted
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  // Clear all cache for a specific type
  clearType(type) {
    try {
      const config = this.CACHE_CONFIG[type];
      if (!config) return;
      
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(config.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} entries for type: ${type}`);
    } catch (error) {
      console.warn('Cache clear type error:', error);
    }
  }

  // Get cache statistics
  getStats() {
    try {
      const stats = {};
      let totalSize = 0;
      let totalEntries = 0;
      
      Object.keys(this.CACHE_CONFIG).forEach(type => {
        stats[type] = { count: 0, size: 0, valid: 0, expired: 0 };
      });
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vibeshelf-')) {
          const cached = localStorage.getItem(key);
          const size = cached.length;
          totalSize += size;
          totalEntries++;
          
          try {
            const parsed = JSON.parse(cached);
            const type = Object.keys(this.CACHE_CONFIG).find(t => 
              key.startsWith(this.CACHE_CONFIG[t].prefix)
            );
            
            if (type && stats[type]) {
              stats[type].count++;
              stats[type].size += size;
              
              const config = this.CACHE_CONFIG[type];
              if (Date.now() - parsed.timestamp < config.ttl) {
                stats[type].valid++;
              } else {
                stats[type].expired++;
              }
            }
          } catch (error) {
            // Corrupted entry
          }
        }
      }
      
      return {
        totalEntries,
        totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        byType: stats
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return null;
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

export default cacheManager;