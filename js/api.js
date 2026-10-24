/* ==========================================================================
   LifeOS API Module
   Centralized Backend Integration Interface
   * Note: Prepared for future backend connectivity. No mock endpoints invented.
   ========================================================================== */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Set base URL when backend becomes available
   * @param {string} url
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Set authorization token for future protected endpoints
   * @param {string} token
   */
  setAuthToken(token) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  /**
   * Generic request dispatcher
   * @param {string} endpoint
   * @param {object} [options]
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    if (!this.baseUrl) {
      // Graceful offline development fallback
      console.info(`[LifeOS API] Request to "${endpoint}" deferred (No backend runtime configured).`);
      return { success: true, localOnly: true, data: null };
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`[LifeOS API] Request failed for ${url}:`, err);
      throw err;
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers
    });
  }

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const api = new ApiClient();
