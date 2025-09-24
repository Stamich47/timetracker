import { type ZodSchema, ZodError } from "zod";
import { toast } from "../hooks/useToast";
import { errorLogger } from "./errorLogger";

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
}

/**
 * Safely validate data with a Zod schema
 */
export function validateData<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};

      error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      });

      // Log validation error for debugging
      errorLogger.logError(
        new Error(`Validation failed: ${error.message}`),
        undefined,
        {
          context,
          fieldErrors,
          originalData: data,
        }
      );

      return {
        success: false,
        errors: fieldErrors,
        message: "Please check the form for errors",
      };
    }

    // Non-Zod error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown validation error";
    errorLogger.logError(
      new Error(`Unexpected validation error: ${errorMessage}`),
      undefined,
      { context, originalData: data }
    );

    return {
      success: false,
      message: "An unexpected error occurred during validation",
    };
  }
}

/**
 * Validate data and show toast notification on error
 */
export function validateWithToast<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): T | null {
  const result = validateData(schema, data, context);

  if (!result.success) {
    const errorMessages = result.errors
      ? Object.values(result.errors).flat()
      : [result.message || "Validation failed"];

    toast.error(
      errorMessages.slice(0, 3).join(", "), // Show max 3 errors
      "Validation Error"
    );

    return null;
  }

  return result.data!;
}

/**
 * Validate API response from Supabase
 */
export function validateApiResponse<T>(
  schema: ZodSchema<T>,
  response: unknown,
  endpoint: string
): ValidationResult<T> {
  const result = validateData(schema, response, `API Response: ${endpoint}`);

  if (!result.success) {
    // Log API response validation failure
    errorLogger.logApiError(
      new Error(`API response validation failed for ${endpoint}`),
      endpoint,
      "GET",
      {
        validationErrors: result.errors,
        responseData: response,
      }
    );

    // Show user-friendly error message
    toast.error(
      "Received invalid data from server. Please try again.",
      "Data Error"
    );
  }

  return result;
}

/**
 * Validate API response but continue execution even if validation fails
 * This is useful for gradual rollout of validation without breaking existing functionality
 */
export function validateApiResponseSoft<T>(
  schema: ZodSchema<T>,
  response: unknown,
  endpoint: string
): T {
  const result = validateData(schema, response, `API Response: ${endpoint}`);

  if (!result.success) {
    // Log validation warning but continue
    console.warn(
      `API response validation warning for ${endpoint}:`,
      result.errors
    );
    // Return the raw response for now
    return response as T;
  }

  return result.data!;
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";

  return (
    input
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove all HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove javascript: protocols
      .replace(/javascript:/gi, "")
      // Remove on* event handlers
      .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\s*on\w+\s*=\s*'[^']*'/gi, "")
      // Trim whitespace
      .trim()
  );
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(
  input: string,
  maxLength: number = 1000
): string {
  if (typeof input !== "string") return "";

  return sanitizeHtml(input)
    .slice(0, maxLength) // Truncate if too long
    .trim();
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: Record<string, string[]>
): string {
  const messages: string[] = [];

  Object.entries(errors).forEach(([field, fieldErrors]) => {
    const fieldName = field
      .replace(/([A-Z])/g, " $1") // Add space before capitals
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .replace(/_/g, " "); // Replace underscores with spaces

    fieldErrors.forEach((error) => {
      messages.push(`${fieldName}: ${error}`);
    });
  });

  return messages.join("\n");
}

/**
 * Check if string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if string is a valid email
 */
export function isValidEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  maxSize: number = 5 * 1024 * 1024, // 5MB default
  allowedTypes: string[] = ["image/jpeg", "image/png", "image/gif"]
): ValidationResult<File> {
  if (file.size > maxSize) {
    return {
      success: false,
      message: `File size must be less than ${Math.round(
        maxSize / 1024 / 1024
      )}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      message: `File type must be one of: ${allowedTypes.join(", ")}`,
    };
  }

  return {
    success: true,
    data: file,
  };
}

/**
 * Debounced validation for real-time form validation
 */
export function createDebouncedValidator<T>(
  schema: ZodSchema<T>,
  callback: (result: ValidationResult<T>) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (data: unknown) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validateData(schema, data);
      callback(result);
    }, delay);
  };
}

// ============================================================================
// FORM VALIDATION HOOKS
// ============================================================================

export interface FieldError {
  message: string;
  type: "required" | "format" | "length" | "custom";
}

export interface FormValidation {
  isValid: boolean;
  errors: Record<string, FieldError>;
  touched: Record<string, boolean>;
}

/**
 * Create a validation function for React forms
 */
export function createFormValidator<T>(schema: ZodSchema<T>) {
  return {
    validate: (data: unknown): ValidationResult<T> => {
      return validateData(schema, data);
    },

    validateField: (_fieldName: string, value: unknown): FieldError | null => {
      // Simple field validation - we'll validate the full object later
      // This is mainly for basic checks like required fields
      if (value === null || value === undefined || value === "") {
        return {
          message: "This field is required",
          type: "required",
        };
      }
      return null;
    },

    getEmptyForm: (): Partial<T> => {
      // Return an empty object that matches the schema structure
      return {};
    },
  };
}
