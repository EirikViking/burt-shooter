// API client for highscore communication

const DEFAULT_TIMEOUT_MS = 12000; // First attempt: 12 seconds for cold starts
const RETRY_TIMEOUT_MS = 15000; // Retry attempts: 15 seconds
const MAX_RETRIES = 4; // Total: 1 initial + 3 retries
const RETRY_DELAYS = [0, 800, 2000, 4000]; // Exponential backoff delays

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      const timeoutError = new Error('Fetch timeout');
      timeoutError.code = 'FETCH_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with automatic retry and exponential backoff
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {function} onRetry - Callback (attemptNumber, delay) => void
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithRetry(url, options = {}, onRetry = null) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Wait for backoff delay (except first attempt)
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt] || 4000;
      if (onRetry) onRetry(attempt, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const timeout = attempt === 0 ? DEFAULT_TIMEOUT_MS : RETRY_TIMEOUT_MS;
      const response = await fetchWithTimeout(url, options, timeout);
      return response; // Success!
    } catch (error) {
      lastError = error;
      // Continue to next retry unless this is the last attempt
      if (attempt < MAX_RETRIES - 1) {
        console.log(`[API] Attempt ${attempt + 1} failed, retrying...`, error.message);
      }
    }
  }

  // All attempts failed
  throw lastError;
}

class APIClient {
  constructor() {
    // Detect if we're in production or development
    this.baseUrl = window.location.origin;
    this.debug = window.location.search.includes('debug=1');

    // Session cache for last good response
    this._cachedHighscores = null;
    this._cacheTimestamp = 0;
    this._cacheMaxAge = 30000; // 30 seconds

    // Submission deduplication
    this._submissionInFlight = false;
    this._currentSubmissionId = null;
  }

  async getHighscores(options = {}) {
    const { useCache = true, onRetry = null } = options;
    const url = `${this.baseUrl}/api/highscores`;

    // Return cached data if available and fresh
    if (useCache && this._cachedHighscores && (Date.now() - this._cacheTimestamp < this._cacheMaxAge)) {
      if (this.debug) {
        console.log('[API] Returning cached highscores');
      }
      return this._cachedHighscores;
    }

    if (this.debug) {
      console.log('[API] Fetching highscores from:', url);
    }

    try {
      const response = await fetchWithRetry(url, {}, onRetry);

      if (this.debug) {
        console.log('[API] Response status:', response.status);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (this.debug) {
          console.log('[API] Error response (first 200 chars):', errorText.substring(0, 200));
        }
        throw new Error(`Failed to fetch highscores: ${response.status}`);
      }

      const text = await response.text();

      if (this.debug) {
        console.log('[API] Response text (first 200 chars):', text.substring(0, 200));
      }

      // Defensive parsing: handle empty, non-JSON, or wrapped responses
      if (!text || text.trim() === '') {
        console.warn('[API] Empty response, returning empty array');
        return [];
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[API] Failed to parse JSON:', parseError);
        return [];
      }

      // Handle various response shapes
      let scores = [];
      if (Array.isArray(data)) {
        scores = data;
      } else if (data && Array.isArray(data.scores)) {
        scores = data.scores;
      } else if (data && Array.isArray(data.data)) {
        scores = data.data;
      } else if (data && Array.isArray(data.highscores)) {
        scores = data.highscores;
      } else {
        console.warn('[API] Unexpected response shape:', typeof data);
        return [];
      }

      if (this.debug) {
        console.log('[API] Parsed entry count:', scores.length);
      }

      // Validate and sanitize entries
      const sanitized = scores.filter(entry => {
        // Must have at least name and score
        return entry && typeof entry.name === 'string' && typeof entry.score === 'number';
      }).map(entry => ({
        name: entry.name || 'Unknown',
        score: typeof entry.score === 'number' ? entry.score : parseInt(entry.score, 10) || 0,
        level: typeof entry.level === 'number' ? entry.level : parseInt(entry.level, 10) || 1,
        rankIndex: entry.rankIndex ?? entry.rank_index ?? 0,
        timestamp: entry.timestamp
      }));

      // Cache successful response
      this._cachedHighscores = sanitized;
      this._cacheTimestamp = Date.now();

      return sanitized;

    } catch (error) {
      if (error.code === 'FETCH_TIMEOUT') {
        console.error('[API] Highscore fetch timed out after 6 seconds');
      } else {
        console.error('[API] Error fetching highscores:', error);
      }
      // Re-throw so caller can handle UI state
      throw error;
    }
  }

  async submitScore(name, score, level, rankIndex, submissionId) {
    // Guard: Prevent duplicate submissions while one is in flight
    if (this._submissionInFlight) {
      console.warn('[API] Submission already in flight, blocking duplicate');
      throw new Error('Submission already in progress');
    }

    try {
      this._submissionInFlight = true;
      this._currentSubmissionId = submissionId;

      const payload = { name, score, level, rankIndex, submissionId };
      console.log('[API] Submitting payload:', payload);

      const response = await fetchWithTimeout(`${this.baseUrl}/api/highscores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('[API] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] Error response:', errorText);
        throw new Error(`Failed to submit score: ${response.status}`);
      }

      const result = await response.json();
      console.log('[API] Success response:', result);

      // Invalidate cache to force fresh fetch after submission
      this._cachedHighscores = null;
      this._cacheTimestamp = 0;

      return result;
    } catch (error) {
      console.error('[API] Error submitting score:', error);
      throw error;
    } finally {
      this._submissionInFlight = false;
      this._currentSubmissionId = null;
    }
  }
}

export const API = new APIClient();
