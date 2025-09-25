/**
 * Safe storage utilities for handling localStorage operations
 */

export class AppStorage {
  /**
   * Safely get an item from localStorage
   */
  static get(key: string): string | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return null;
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get item from localStorage: ${key}`, error);
      return null;
    }
  }

  /**
   * Safely set an item in localStorage
   */
  static set(key: string, value: string): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set item in localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Safely remove an item from localStorage
   */
  static remove(key: string): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item from localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Safely clear all localStorage
   */
  static clear(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn("Failed to clear localStorage", error);
      return false;
    }
  }

  /**
   * Safely get and parse JSON from localStorage
   */
  static getJSON<T>(key: string, fallback?: T): T | null {
    try {
      const item = this.get(key);
      if (item === null) {
        return fallback ?? null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Failed to parse JSON from localStorage: ${key}`, error);
      return fallback ?? null;
    }
  }

  /**
   * Safely stringify and set JSON in localStorage
   */
  static setJSON<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.set(key, serialized);
    } catch (error) {
      console.warn(`Failed to serialize JSON for localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Check if localStorage is available
   */
  static isAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // Report-specific storage methods
  static getReportsDateRange(): { success: boolean; data?: string } {
    try {
      const value = this.get("reports-date-range");
      return { success: true, data: value || undefined };
    } catch {
      return { success: false };
    }
  }

  static setReportsDateRange(dateRange: string): void {
    this.set("reports-date-range", dateRange);
  }

  static getCustomDateRange(): {
    success: boolean;
    data?: { start: string; end: string };
  } {
    try {
      const start = this.get("reports-custom-start-date");
      const end = this.get("reports-custom-end-date");
      if (start && end) {
        return { success: true, data: { start, end } };
      }
      return { success: true, data: undefined };
    } catch {
      return { success: false };
    }
  }

  static setCustomDateRange(startDate: string, endDate: string): void {
    this.set("reports-custom-start-date", startDate);
    this.set("reports-custom-end-date", endDate);
  }

  static getSelectedClientId(): { success: boolean; data?: string } {
    try {
      const value = this.get("reports-selected-client-id");
      return { success: true, data: value || undefined };
    } catch {
      return { success: false };
    }
  }

  static setSelectedClientId(clientId: string | null): void {
    if (clientId) {
      this.set("reports-selected-client-id", clientId);
    } else {
      this.remove("reports-selected-client-id");
    }
  }
}
