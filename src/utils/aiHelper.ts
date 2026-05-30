interface CachePayload<T> {
  data: T;
  timestamp: number;
}

/**
 * Retrieves an item from localStorage if it exists and has not expired.
 * @param key The cache key
 * @param maxAgeMs Maximum allowed age of the cache in milliseconds
 */
export function getCachedAiItem<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const parsed: CachePayload<T> = JSON.parse(raw);
    const age = Date.now() - parsed.timestamp;
    
    if (age > maxAgeMs) {
      localStorage.removeItem(key); // clean up expired item
      return null;
    }
    
    return parsed.data;
  } catch (e) {
    console.error('Failed to read AI cache for key:', key, e);
    return null;
  }
}

/**
 * Saves an item to localStorage with a current timestamp.
 * @param key The cache key
 * @param data The data payload to save
 */
export function setCachedAiItem<T>(key: string, data: T): void {
  try {
    const payload: CachePayload<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to write AI cache for key:', key, e);
  }
}

/**
 * Formats standard API/network error messages into friendly, human-readable instructions.
 */
export function formatAiError(err: unknown): string {
  if (!err) return 'An unknown error occurred.';
  const errMsg = err instanceof Error ? err.message : String(err);
  const msgLower = errMsg.toLowerCase();

  if (
    msgLower.includes('api key not valid') || 
    msgLower.includes('invalid api key') || 
    msgLower.includes('api_key_invalid') || 
    msgLower.includes('invalid_api_key') ||
    msgLower.includes('api key is invalid')
  ) {
    return 'Invalid API Key: Please verify that your Gemini or OpenAI key is entered correctly in the Settings tab.';
  }
  
  if (
    msgLower.includes('quota') || 
    msgLower.includes('rate limit') || 
    msgLower.includes('429') || 
    msgLower.includes('exhausted') ||
    msgLower.includes('too many requests')
  ) {
    return 'Rate Limit Exceeded: You have hit the rate limit or run out of free quota. Please check your developer console billing status or wait a minute before trying again.';
  }
  
  if (
    msgLower.includes('billing') || 
    msgLower.includes('403') || 
    msgLower.includes('forbidden') || 
    msgLower.includes('permission') ||
    msgLower.includes('access_denied')
  ) {
    return 'Permission Denied (403): Access is blocked. Ensure billing is active on your API account or that your key has permission to call this model.';
  }
  
  if (
    msgLower.includes('model not found') || 
    msgLower.includes('404') || 
    msgLower.includes('not found') ||
    msgLower.includes('unsupported model')
  ) {
    return 'Model Not Found (404): The selected model is either deprecated or not supported by your API tier. Please try selecting a different model in the Settings tab.';
  }
  
  if (
    msgLower.includes('failed to fetch') || 
    msgLower.includes('network') || 
    msgLower.includes('offline') ||
    msgLower.includes('dns')
  ) {
    return 'Network Error: Failed to connect to the AI service. Please check your internet connection and verify that your browser can access googleapis.com or openai.com.';
  }
  
  if (
    msgLower.includes('json') || 
    msgLower.includes('parse') ||
    msgLower.includes('unexpected token')
  ) {
    return 'Parsing Error: The AI did not return a valid structured response. Please click Regenerate to try again.';
  }
  
  return errMsg;
}
