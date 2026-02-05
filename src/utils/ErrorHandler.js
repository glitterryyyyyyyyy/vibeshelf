import { useState, useCallback, useRef, useEffect } from 'react';
import cacheManager from '../utils/CacheManager';

// Enhanced error handling with smart retry and fallback strategies
export class ErrorHandler {
  constructor() {
    this.errorHistory = new Map();
    this.retryDelays = [1000, 2000, 5000, 10000]; // Progressive delays
    this.maxRetries = 3;
  }

  // Determine if error should trigger a retry
  shouldRetry(error, attemptCount) {
    if (attemptCount >= this.maxRetries) return false;
    
    // Don't retry on client errors (4xx)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }
    
    // Don't retry on network errors that indicate user is offline
    if (!navigator.onLine) return false;
    
    // Retry on server errors (5xx) and network errors
    return true;
  }

  // Get appropriate delay for retry attempt
  getRetryDelay(attemptCount, error) {
    // Use exponential backoff with jitter
    const baseDelay = this.retryDelays[Math.min(attemptCount, this.retryDelays.length - 1)] || 10000;
    const jitter = Math.random() * 1000;
    
    // Add extra delay for rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        return parseInt(retryAfter) * 1000;
      }
      return baseDelay * 2;
    }
    
    return baseDelay + jitter;
  }

  // Record error for analysis
  recordError(error, context = {}) {
    const errorKey = this.getErrorKey(error);
    const existingEntry = this.errorHistory.get(errorKey) || {
      count: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      contexts: []
    };

    existingEntry.count++;
    existingEntry.lastSeen = Date.now();
    existingEntry.contexts.push({
      ...context,
      timestamp: Date.now()
    });

    // Keep only last 5 contexts to prevent memory bloat
    if (existingEntry.contexts.length > 5) {
      existingEntry.contexts = existingEntry.contexts.slice(-5);
    }

    this.errorHistory.set(errorKey, existingEntry);
  }

  // Generate error key for tracking
  getErrorKey(error) {
    const status = error.response?.status || 'network';
    const url = error.config?.url || 'unknown';
    return `${status}-${url}`;
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      recentErrors: []
    };

    this.errorHistory.forEach((entry, key) => {
      stats.totalErrors += entry.count;
      
      const [status] = key.split('-');
      stats.errorsByType[status] = (stats.errorsByType[status] || 0) + entry.count;
      
      if (entry.lastSeen > Date.now() - 300000) { // Last 5 minutes
        stats.recentErrors.push({
          key,
          ...entry
        });
      }
    });

    return stats;
  }

  // Suggest fallback strategy based on error
  suggestFallback(error, context = {}) {
    const status = error.response?.status;
    
    if (status === 429 || status === 503) {
      return {
        type: 'rate_limit',
        suggestion: 'Use cached data and reduce request frequency',
        action: 'cache_fallback'
      };
    }
    
    if (status >= 500) {
      return {
        type: 'server_error',
        suggestion: 'Server overloaded, use cached data',
        action: 'cache_fallback'
      };
    }
    
    if (!navigator.onLine) {
      return {
        type: 'offline',
        suggestion: 'User is offline, use cached data',
        action: 'cache_fallback'
      };
    }
    
    return {
      type: 'unknown',
      suggestion: 'Try cache fallback or show error message',
      action: 'show_error'
    };
  }
}

// Create singleton error handler
const errorHandler = new ErrorHandler();

// Hook for handling API errors with smart retry and fallback
export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef(null);

  // Enhanced retry function with smart delays
  const retryWithFallback = useCallback(async (requestFn, options = {}) => {
    const {
      maxRetries = 3,
      fallbackData = null,
      cacheKey = null,
      cacheType = 'books',
      context = {}
    } = options;

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      try {
        setIsRetrying(attempt > 0);
        const result = await requestFn();
        
        // Success - reset error state
        setError(null);
        setRetryCount(0);
        setIsRetrying(false);
        
        return result;
        
      } catch (error) {
        lastError = error;
        errorHandler.recordError(error, { ...context, attempt });
        
        // Check if we should retry
        if (attempt >= maxRetries || !errorHandler.shouldRetry(error, attempt)) {
          break;
        }
        
        // Wait before retrying
        const delay = errorHandler.getRetryDelay(attempt, error);
        setRetryCount(attempt + 1);
        
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay);
        });
        
        attempt++;
      }
    }

    // All retries failed - try fallback strategies
    setIsRetrying(false);
    setError(lastError);
    
    const fallbackStrategy = errorHandler.suggestFallback(lastError, context);
    
    if (fallbackStrategy.action === 'cache_fallback' && cacheKey) {
      // Try to get cached data
      const cachedData = cacheManager.get(cacheType, cacheKey);
      if (cachedData) {
        console.warn('Using cached data due to error:', lastError.message);
        return cachedData;
      }
      
      // Try expired cache as last resort
      try {
        const expiredCache = localStorage.getItem(
          cacheManager.generateKey(cacheType, cacheKey)
        );
        if (expiredCache) {
          const parsed = JSON.parse(expiredCache);
          console.warn('Using expired cached data due to error:', lastError.message);
          return parsed.data;
        }
      } catch (parseError) {
        console.warn('Failed to parse expired cache:', parseError);
      }
    }
    
    // Return fallback data if provided
    if (fallbackData !== null) {
      return fallbackData;
    }
    
    // Re-throw the error if no fallback worked
    throw lastError;
    
  }, []);

  // Cancel ongoing retry
  const cancelRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  // Reset error state
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    cancelRetry();
  }, [cancelRetry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRetry();
    };
  }, [cancelRetry]);

  return {
    error,
    retryCount,
    isRetrying,
    retryWithFallback,
    cancelRetry,
    clearError,
    errorStats: errorHandler.getErrorStats()
  };
};

// Hook for network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [downtime, setDowntime] = useState(0);
  const [lastOnline, setLastOnline] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDowntime(0);
      setLastOnline(Date.now());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOnline(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Track downtime
    const downtimeInterval = setInterval(() => {
      if (!isOnline) {
        setDowntime(Date.now() - lastOnline);
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(downtimeInterval);
    };
  }, [isOnline, lastOnline]);

  return { isOnline, downtime, lastOnline };
};

// Smart fallback data generator
export const generateFallbackBooks = (count = 12) => {
  const fallbackBooks = [
    {
      id: 'fallback-1',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      description: 'A classic American novel set in the Jazz Age.',
      image_url: 'https://via.placeholder.com/300x450.png?text=The+Great+Gatsby',
      isFallback: true
    },
    {
      id: 'fallback-2',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      description: 'A story of racial injustice and childhood innocence.',
      image_url: 'https://via.placeholder.com/300x450.png?text=To+Kill+a+Mockingbird',
      isFallback: true
    },
    {
      id: 'fallback-3',
      title: '1984',
      author: 'George Orwell',
      description: 'A dystopian novel about totalitarian control.',
      image_url: 'https://via.placeholder.com/300x450.png?text=1984',
      isFallback: true
    },
    {
      id: 'fallback-4',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      description: 'A romantic novel about manners and marriage.',
      image_url: 'https://via.placeholder.com/300x450.png?text=Pride+and+Prejudice',
      isFallback: true
    }
  ];

  // Repeat and shuffle to get desired count
  const repeated = [];
  while (repeated.length < count) {
    repeated.push(...fallbackBooks.slice(0, count - repeated.length));
  }

  return repeated.map((book, index) => ({
    ...book,
    id: `${book.id}-${index}`,
    title: index > 0 ? `${book.title} (${index + 1})` : book.title
  }));
};

export default errorHandler;