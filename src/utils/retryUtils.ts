export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
      
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

export const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
    return true;
  }
  
  // Supabase connection errors
  if (error.message?.includes('connection') || error.message?.includes('timeout')) {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (error.status && [408, 429, 500, 502, 503, 504].includes(error.status)) {
    return true;
  }
  
  return false;
};