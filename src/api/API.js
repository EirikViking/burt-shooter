// API client for highscore communication

const DEFAULT_TIMEOUT_MS = 6000; // Increased to 6 seconds for reliability

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

class APIClient {
  constructor() {
    // Detect if we're in production or development
    this.baseUrl = window.location.origin;
    this.debug = window.location.search.includes('debug=1');
  }

  async getHighscores() {
    const url = `${this.baseUrl}/api/highscores`;

    if (this.debug) {
      console.log('[API] Fetching highscores from:', url);
    }

    try {
      const response = await fetchWithTimeout(url);

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
      return scores.filter(entry => {
        // Must have at least name and score
        return entry && typeof entry.name === 'string' && typeof entry.score === 'number';
      }).map(entry => ({
        name: entry.name || 'Unknown',
        score: typeof entry.score === 'number' ? entry.score : parseInt(entry.score, 10) || 0,
        level: typeof entry.level === 'number' ? entry.level : parseInt(entry.level, 10) || 1,
        rankIndex: entry.rankIndex ?? entry.rank_index ?? 0,
        timestamp: entry.timestamp
      }));

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

  async submitScore(name, score, level, rankIndex) {
    try {
      const payload = { name, score, level, rankIndex };
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
      return result;
    } catch (error) {
      console.error('[API] Error submitting score:', error);
      throw error;
    }
  }
}

export const API = new APIClient();
