/**
 * CSRF Protection Utilities
 *
 * Provides additional client-side CSRF protection for sensitive operations.
 * Note: Supabase handles most CSRF protection server-side, but these utilities
 * add extra layers of security for critical operations.
 */

import { supabase } from "./supabase";

// Generate a cryptographically secure random token
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// Store CSRF token in session storage with expiration
export function storeCSRFToken(
  token: string,
  expiresInMinutes: number = 60
): void {
  const expiration = Date.now() + expiresInMinutes * 60 * 1000;
  const tokenData = {
    token,
    expiration,
  };
  sessionStorage.setItem("csrf_token", JSON.stringify(tokenData));
}

// Get stored CSRF token, checking expiration
export function getStoredCSRFToken(): string | null {
  try {
    const stored = sessionStorage.getItem("csrf_token");
    if (!stored) return null;

    const tokenData = JSON.parse(stored);
    if (Date.now() > tokenData.expiration) {
      sessionStorage.removeItem("csrf_token");
      return null;
    }

    return tokenData.token;
  } catch {
    return null;
  }
}

// Get or create CSRF token
export function getOrCreateCSRFToken(): string {
  let token = getStoredCSRFToken();
  if (!token) {
    token = generateCSRFToken();
    storeCSRFToken(token);
  }
  return token;
}

// Validate CSRF token
export function validateCSRFToken(token: string): boolean {
  const storedToken = getStoredCSRFToken();
  return storedToken === token;
}

// CSRF-protected request wrapper for sensitive operations
export async function makeSecureRequest<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    // Get current session to ensure user is authenticated
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required for this operation");
    }

    // Generate fresh CSRF token for this request
    const csrfToken = getOrCreateCSRFToken();

    // Add CSRF token to request headers (Supabase will handle server-side validation)
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set("X-CSRF-Token", csrfToken);
      headers.set("X-Requested-With", "XMLHttpRequest"); // Additional protection

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    // Execute the operation
    const result = await operation();

    // Restore original fetch
    window.fetch = originalFetch;

    return result;
  } catch (error) {
    console.error(`[CSRF Protection] Failed ${operationName}:`, error);
    throw error;
  }
}

// Clear CSRF token (useful on logout)
export function clearCSRFToken(): void {
  sessionStorage.removeItem("csrf_token");
}

// Initialize CSRF protection on app start
export function initializeCSRFProtection(): void {
  // Clear any expired tokens on app initialization
  getStoredCSRFToken();

  // Clear token on page unload for security
  window.addEventListener("beforeunload", () => {
    clearCSRFToken();
  });
}
