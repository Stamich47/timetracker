/**
 * Safe array utilities for handling potentially undefined arrays
 */

export class SafeArray {
  /**
   * Safely find an item in an array
   */
  static find<T>(
    array: T[] | undefined | null,
    predicate: (item: T, index: number, array: T[]) => boolean
  ): T | undefined {
    if (!Array.isArray(array)) {
      return undefined;
    }
    return array.find(predicate);
  }

  /**
   * Safely filter an array
   */
  static filter<T>(
    array: T[] | undefined | null,
    predicate: (item: T, index: number, array: T[]) => boolean
  ): T[] {
    if (!Array.isArray(array)) {
      return [];
    }
    return array.filter(predicate);
  }

  /**
   * Safely map over an array
   */
  static map<T, U>(
    array: T[] | undefined | null,
    callback: (item: T, index: number, array: T[]) => U
  ): U[] {
    if (!Array.isArray(array)) {
      return [];
    }
    return array.map(callback);
  }

  /**
   * Safely reduce an array
   */
  static reduce<T, U>(
    array: T[] | undefined | null,
    callback: (
      previousValue: U,
      currentValue: T,
      currentIndex: number,
      array: T[]
    ) => U,
    initialValue: U
  ): U {
    if (!Array.isArray(array)) {
      return initialValue;
    }
    return array.reduce(callback, initialValue);
  }

  /**
   * Safely get array length
   */
  static length(array: unknown[] | undefined | null): number {
    if (!Array.isArray(array)) {
      return 0;
    }
    return array.length;
  }

  /**
   * Safely check if array is empty
   */
  static isEmpty(array: unknown[] | undefined | null): boolean {
    return !Array.isArray(array) || array.length === 0;
  }

  /**
   * Safely group array items by a key
   */
  static groupBy<T, K extends string | number>(
    array: T[] | undefined | null,
    keySelector: (item: T) => K
  ): Record<K, T[]> {
    const result = {} as Record<K, T[]>;

    if (!Array.isArray(array)) {
      return result;
    }

    for (const item of array) {
      const key = keySelector(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }

    return result;
  }

  /**
   * Safely ensure we have an array
   */
  static ensureArray<T>(value: T[] | T | undefined | null): T[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value !== undefined && value !== null) {
      return [value];
    }
    return [];
  }
}
