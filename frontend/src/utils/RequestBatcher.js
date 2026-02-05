// Request batching system to reduce server load
class RequestBatcher {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 5;
    this.delay = options.delay || 100;
    this.maxWait = options.maxWait || 1000;
    this.queue = [];
    this.processing = false;
    this.lastProcessTime = 0;
  }

  // Add request to batch queue
  async addRequest(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        requestFn,
        resolve,
        reject,
        priority: options.priority || 'normal',
        timestamp: Date.now(),
        retries: 0,
        maxRetries: options.maxRetries || 3
      };

      // Insert based on priority
      if (request.priority === 'high') {
        this.queue.unshift(request);
      } else {
        this.queue.push(request);
      }

      this.scheduleProcessing();
    });
  }

  // Schedule batch processing
  scheduleProcessing() {
    if (this.processing) return;

    const timeSinceLastProcess = Date.now() - this.lastProcessTime;
    const shouldProcessImmediately = 
      this.queue.length >= this.batchSize || 
      timeSinceLastProcess >= this.maxWait ||
      this.queue.some(req => req.priority === 'high');

    if (shouldProcessImmediately) {
      this.processBatch();
    } else {
      setTimeout(() => {
        if (!this.processing && this.queue.length > 0) {
          this.processBatch();
        }
      }, this.delay);
    }
  }

  // Process current batch
  async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    this.lastProcessTime = Date.now();

    // Take batch from queue
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      // Process requests with controlled concurrency
      const results = await Promise.allSettled(
        batch.map(async (request) => {
          try {
            const result = await this.executeWithRetry(request);
            return { request, result, success: true };
          } catch (error) {
            return { request, error, success: false };
          }
        })
      );

      // Handle results
      results.forEach(({ value: outcome }) => {
        if (outcome.success) {
          outcome.request.resolve(outcome.result);
        } else {
          outcome.request.reject(outcome.error);
        }
      });

    } catch (error) {
      // Handle batch-level errors
      batch.forEach(request => {
        request.reject(new Error(`Batch processing failed: ${error.message}`));
      });
    } finally {
      this.processing = false;
      
      // Process next batch if queue has items
      if (this.queue.length > 0) {
        setTimeout(() => this.scheduleProcessing(), this.delay);
      }
    }
  }

  // Execute request with retry logic
  async executeWithRetry(request) {
    let lastError;
    
    for (let i = 0; i <= request.maxRetries; i++) {
      try {
        const result = await request.requestFn();
        return result;
      } catch (error) {
        lastError = error;
        request.retries = i + 1;
        
        // Don't retry on certain error types
        if (error.response?.status === 404 || error.response?.status === 401) {
          throw error;
        }
        
        // Skip retry on last attempt
        if (i === request.maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const backoffTime = Math.min(
          1000 * Math.pow(2, i) + Math.random() * 1000,
          10000
        );
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    
    throw lastError;
  }

  // Get queue statistics
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      priorities: {
        high: this.queue.filter(r => r.priority === 'high').length,
        normal: this.queue.filter(r => r.priority === 'normal').length
      },
      oldestRequest: this.queue.length > 0 
        ? Date.now() - Math.min(...this.queue.map(r => r.timestamp))
        : 0
    };
  }

  // Clear queue
  clear() {
    const clearedRequests = this.queue.splice(0);
    clearedRequests.forEach(request => {
      request.reject(new Error('Request queue cleared'));
    });
    return clearedRequests.length;
  }
}

// Smart retry utility with exponential backoff
export class SmartRetry {
  static async execute(requestFn, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = (error) => !error.response || error.response.status >= 500
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        );
        
        console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// Rate limiter for API calls
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if we've exceeded the limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.throttle(); // Recursive call after waiting
      }
    }
    
    // Add current request timestamp
    this.requests.push(now);
  }
}

// Create singleton instances
export const bookRequestBatcher = new RequestBatcher({
  batchSize: 3,
  delay: 200,
  maxWait: 1500
});

export const searchRequestBatcher = new RequestBatcher({
  batchSize: 2,
  delay: 300,
  maxWait: 1000
});

export const apiRateLimiter = new RateLimiter(8, 1000);

export default RequestBatcher;