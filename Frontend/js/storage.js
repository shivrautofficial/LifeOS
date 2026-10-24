/* ==========================================================================
   LifeOS Storage Module
   Centralized Local Persistence Abstraction (LocalStorage wrapper)
   ========================================================================== */

const STORAGE_PREFIX = 'lifeos_';

export const storage = {
  /**
   * Save a key-value pair to persistent storage
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(STORAGE_PREFIX + key, serialized);
      return true;
    } catch (err) {
      console.warn(`[LifeOS Storage] Failed to write key "${key}":`, err);
      return false;
    }
  },

  /**
   * Retrieve a value from persistent storage
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.warn(`[LifeOS Storage] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  },

  /**
   * Remove a specific key from persistent storage
   * @param {string} key
   * @returns {boolean}
   */
  remove(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch (err) {
      console.warn(`[LifeOS Storage] Failed to remove key "${key}":`, err);
      return false;
    }
  },

  /**
   * Clear all LifeOS-related keys from persistent storage
   */
  clear() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
      return true;
    } catch (err) {
      console.warn('[LifeOS Storage] Failed to clear storage:', err);
      return false;
    }
  },

  /**
   * Export all stored LifeOS data as a JSON string
   * @returns {string}
   */
  exportData() {
    const data = {};
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => {
      const cleanKey = k.replace(STORAGE_PREFIX, '');
      data[cleanKey] = this.get(cleanKey);
    });
    return JSON.stringify(data, null, 2);
  },

  /**
   * Import LifeOS data from a JSON object or string
   * @param {string|object} data
   * @returns {boolean}
   */
  importData(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (typeof parsed !== 'object' || parsed === null) return false;

      Object.entries(parsed).forEach(([key, value]) => {
        this.set(key, value);
      });
      return true;
    } catch (err) {
      console.error('[LifeOS Storage] Failed to import data:', err);
      return false;
    }
  }
};
