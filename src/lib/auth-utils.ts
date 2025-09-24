import { supabase } from "./supabase";

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Gets the current authenticated user ID
 * @returns Promise<string> The authenticated user's ID
 * @throws AuthenticationError if no user is authenticated
 */
export const getAuthenticatedUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new AuthenticationError(`Authentication failed: ${error.message}`);
  }

  if (!user) {
    throw new AuthenticationError("No authenticated user found");
  }

  return user.id;
};

/**
 * Gets the current authenticated user ID with development fallback
 * Only use this during development/testing - remove for production
 * @returns Promise<string> The authenticated user's ID or development fallback
 * @deprecated Use getAuthenticatedUserId() for production
 */
export const getUserIdWithFallback = async (): Promise<string> => {
  try {
    return await getAuthenticatedUserId();
  } catch (error) {
    // Only allow fallback in development
    if (import.meta.env.DEV) {
      console.warn(
        "⚠️ Using development fallback user ID. This should not happen in production!"
      );
      return "8c9c14aa-9be6-460c-b3b4-833a97431c4f";
    }
    throw error;
  }
};

/**
 * Checks if a user is currently authenticated
 * @returns Promise<boolean> True if authenticated, false otherwise
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await getAuthenticatedUserId();
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets the current user session
 * @returns The current session or null if not authenticated
 */
export const getCurrentSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new AuthenticationError(`Session error: ${error.message}`);
  }

  return session;
};
