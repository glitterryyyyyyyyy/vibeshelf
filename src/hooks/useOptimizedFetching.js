import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import cacheManager from '../utils/CacheManager';
import { bookRequestBatcher, apiRateLimiter } from '../utils/RequestBatcher';

const BACKEND_URL = 'http://localhost:8080';

// Hook for intelligent preloading of next pages
export const useIntelligentPreloading = (currentPage, totalPages, fetchFunction) => {
  const [preloadStatus, setPreloadStatus] = useState({});
  const preloadingRef = useRef(new Set());
  const timeoutRef = useRef(null);

  const preloadPage = useCallback(async (pageNumber, priority = 'low') => {
    if (preloadingRef.current.has(pageNumber) || pageNumber > totalPages || pageNumber < 1) {
      return;
    }

    // Check if already cached
    if (cacheManager.has('books', `page-${pageNumber}`)) {
      return;
    }

    preloadingRef.current.add(pageNumber);
    setPreloadStatus(prev => ({ ...prev, [pageNumber]: 'loading' }));

    try {
      await fetchFunction(pageNumber, { priority, preload: true });
      setPreloadStatus(prev => ({ ...prev, [pageNumber]: 'success' }));
    } catch (error) {
      console.warn(`Failed to preload page ${pageNumber}:`, error);
      setPreloadStatus(prev => ({ ...prev, [pageNumber]: 'error' }));
    } finally {
      preloadingRef.current.delete(pageNumber);
    }
  }, [totalPages, fetchFunction]);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Preload strategy: next page immediately, previous page with delay
    const preloadStrategy = () => {
      const pagesToPreload = [];
      
      // Next page (high priority)
      if (currentPage < totalPages) {
        pagesToPreload.push({ page: currentPage + 1, priority: 'normal', delay: 1000 });
      }
      
      // Previous page (lower priority)
      if (currentPage > 1) {
        pagesToPreload.push({ page: currentPage - 1, priority: 'low', delay: 3000 });
      }
      
      // Next 2 pages (background)
      if (currentPage + 2 <= totalPages) {
        pagesToPreload.push({ page: currentPage + 2, priority: 'low', delay: 5000 });
      }

      // Execute preloading with delays
      pagesToPreload.forEach(({ page, priority, delay }) => {
        timeoutRef.current = setTimeout(() => {
          preloadPage(page, priority);
        }, delay);
      });
    };

    // Start preloading after a short delay to not interfere with current page
    timeoutRef.current = setTimeout(preloadStrategy, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentPage, totalPages, preloadPage]);

  return { preloadStatus, preloadPage };
};

// Hook for background data synchronization
export const useBackgroundSync = (dataKey, fetchFunction, syncInterval = 5 * 60 * 1000) => {
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const intervalRef = useRef(null);

  const syncData = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const freshData = await fetchFunction();
      
      // Compare with cached data
      const cachedData = cacheManager.get('books', dataKey);
      if (cachedData && JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
        // Data has changed, update cache
        cacheManager.set('books', dataKey, '', freshData, { 
          backgroundSync: true,
          lastModified: Date.now()
        });
      }
      
      setLastSync(Date.now());
      setSyncStatus('success');
    } catch (error) {
      console.warn('Background sync failed:', error);
      setSyncStatus('error');
    }
  }, [dataKey, fetchFunction]);

  useEffect(() => {
    // Start background sync
    intervalRef.current = setInterval(syncData, syncInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncData, syncInterval]);

  return { lastSync, syncStatus, syncData };
};

// Hook for smart data fetching with fallbacks
export const useSmartFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('server'); // 'server', 'cache', 'fallback'
  
  const {
    cacheKey,
    cacheType = 'books',
    enableFallback = true,
    fallbackData = null,
    dependencies = []
  } = options;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First try cache
      if (cacheKey) {
        const cachedData = cacheManager.get(cacheType, cacheKey);
        if (cachedData) {
          setData(cachedData);
          setSource('cache');
          setLoading(false);
          
          // Optionally refresh in background
          if (options.backgroundRefresh) {
            setTimeout(() => fetchFromServer(), 100);
          }
          return;
        }
      }

      // Fetch from server
      await fetchFromServer();
      
    } catch (fetchError) {
      setError(fetchError);
      
      // Try fallback strategies
      if (enableFallback) {
        if (fallbackData) {
          setData(fallbackData);
          setSource('fallback');
        } else if (cacheKey) {
          // Try expired cache as last resort
          const expiredCache = localStorage.getItem(
            cacheManager.generateKey(cacheType, cacheKey)
          );
          if (expiredCache) {
            try {
              const parsed = JSON.parse(expiredCache);
              setData(parsed.data);
              setSource('expired-cache');
            } catch (parseError) {
              console.warn('Failed to parse expired cache:', parseError);
            }
          }
        }
      }
      
      setLoading(false);
    }
  }, [url, cacheKey, cacheType, enableFallback, fallbackData, ...dependencies]);

  const fetchFromServer = async () => {
    await apiRateLimiter.throttle();
    
    const response = await bookRequestBatcher.addRequest(
      () => axios.get(url),
      { priority: options.priority || 'normal' }
    );
    
    const responseData = response.data;
    setData(responseData);
    setSource('server');
    
    // Cache the response
    if (cacheKey) {
      cacheManager.set(cacheType, cacheKey, '', responseData, {
        url,
        fetchedAt: Date.now()
      });
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    if (cacheKey) {
      cacheManager.remove(cacheType, cacheKey);
    }
    fetchData();
  }, [fetchData, cacheKey, cacheType]);

  return { data, loading, error, source, refresh };
};

// Hook for intersection observer (lazy loading)
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef(null);
  const observerRef = useRef(null);

  const {
    threshold = 0.1,
    rootMargin = '50px',
    once = true
  } = options;

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        if (isVisible && !hasIntersected) {
          setHasIntersected(true);
          
          if (once && observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, once, hasIntersected]);

  return { targetRef, isIntersecting, hasIntersected };
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({});
  
  const startTiming = useCallback((key) => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        [key]: {
          duration,
          timestamp: Date.now()
        }
      }));
      
      return duration;
    };
  }, []);

  const recordMetric = useCallback((key, value, metadata = {}) => {
    setMetrics(prev => ({
      ...prev,
      [key]: {
        value,
        timestamp: Date.now(),
        ...metadata
      }
    }));
  }, []);

  const getAverageMetric = useCallback((key, window = 10) => {
    // This would need to be implemented with a sliding window
    // For now, return the current value
    return metrics[key]?.value || 0;
  }, [metrics]);

  return { metrics, startTiming, recordMetric, getAverageMetric };
};