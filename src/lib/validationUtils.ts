import { type ZodSchema, ZodError } from "zod";
import { toast } from "../hooks/useToast";
import { errorLogger } from "./errorLogger";
import DOMPurify from "dompurify";

// ============================================================================
// SECURITY & SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitize user input for database storage (stricter rules)
 */
export function sanitizeForDatabase(input: string): string {
  let sanitized = sanitizeUserInput(input);

  // Additional database-specific sanitization
  // Remove potential SQL injection patterns (basic protection)
  sanitized = sanitized.replace(/['"`;\\]/g, "");

  return sanitized;
}

/**
 * Validate and sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") {
    return "";
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email validation and sanitization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error("Invalid email format");
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumeric(input: string | number): number | null {
  if (typeof input === "number" && !isNaN(input)) {
    return input;
  }

  if (typeof input === "string") {
    const parsed = parseFloat(input.replace(/[^\d.-]/g, ""));
    return !isNaN(parsed) ? parsed : null;
  }

  return null;
}

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context?: string
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
      errorLogger.logError();

      return {
        success: false,
        errors: fieldErrors,
        message: "Please check the form for errors",
      };
    }

    // Non-Zod error
    errorLogger.logError();

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
    errorLogger.logApiError();

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

  // Use DOMPurify for comprehensive HTML sanitization
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed for plain text
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(
  input: string,
  maxLength: number = 1000
): string {
  if (typeof input !== "string") return "";

  // Trim whitespace first
  let sanitized = input.trim();

  // Remove dangerous characters that could be used for injection
  sanitized = sanitized.replace(/[<>'"&\\]/g, "");

  // Sanitize HTML to prevent XSS
  sanitized = sanitizeHtml(sanitized);

  // Additional security: remove potential script injection patterns
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/data:text\/html/gi, "");

  // Truncate if too long
  return sanitized.slice(0, maxLength);
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
