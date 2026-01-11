// API client for highscore communication

const DEFAULT_TIMEOUT_MS = 1800;

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
  }

  async getHighscores() {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/api/highscores`);
      if (!response.ok) {
        throw new Error('Failed to fetch highscores');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching highscores:', error);
      // Return empty array as fallback
      return [];
    }
  }

  async submitScore(name, score, level) {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/api/highscores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, score, level })
      });

      if (!response.ok) {
        throw new Error('Failed to submit score');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    }
  }
}

export const API = new APIClient();
