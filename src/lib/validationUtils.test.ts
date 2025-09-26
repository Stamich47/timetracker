import { describe, it, expect, vi } from "vitest";
import {
  validateData,
  sanitizeHtml,
  sanitizeUserInput,
  formatValidationErrors,
  isValidUUID,
  isValidEmail,
  validateFile,
} from "../lib/validationUtils";
import { z } from "zod";

// Mock error logger
vi.mock("../lib/errorLogger", () => ({
  errorLogger: {
    logError: vi.fn(),
    logApiError: vi.fn(),
  },
}));

describe("validationUtils", () => {
  describe("validateData", () => {
    const testSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
      age: z.number().min(18, "Must be 18 or older"),
    });

    it("should return success and data for valid input", () => {
      const validData = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      };

      const result = validateData(testSchema, validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toBeUndefined();
    });

    it("should return errors for invalid input", () => {
      const invalidData = {
        name: "",
        email: "invalid-email",
        age: 16,
      };

      const result = validateData(testSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors?.["name"]).toContain("Name is required");
      expect(result.errors?.["email"]).toContain("Invalid email");
      expect(result.errors?.["age"]).toContain("Must be 18 or older");
    });

    it("should handle non-Zod errors", () => {
      const result = validateData(testSchema, null);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Please check the form for errors");
    });
  });

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      const input = '<script>alert("xss")</script>Hello world';
      expect(sanitizeHtml(input)).toBe("Hello world");
    });

    it("should remove HTML tags", () => {
      const input = "<b>Bold</b> and <i>italic</i> text";
      expect(sanitizeHtml(input)).toBe("Bold and italic text");
    });

    it("should remove javascript protocols", () => {
      const input = '<a href="javascript:alert(1)">Click me</a>';
      expect(sanitizeHtml(input)).toBe("Click me");
    });

    it("should remove event handlers", () => {
      const input = '<div onclick="alert(1)">Test</div>';
      expect(sanitizeHtml(input)).toBe("Test");
    });

    it("should trim whitespace", () => {
      const input = "  <b> test </b>  ";
      expect(sanitizeHtml(input)).toBe("test");
    });

    it("should handle non-string input", () => {
      expect(sanitizeHtml(null as unknown as string)).toBe("");
      expect(sanitizeHtml(undefined as unknown as string)).toBe("");
      expect(sanitizeHtml(123 as unknown as string)).toBe("");
    });
  });

  describe("sanitizeUserInput", () => {
    it("should sanitize HTML and truncate if too long", () => {
      const input =
        "<script>alert(1)</script>Very long text that exceeds the maximum length allowed for input fields";
      const result = sanitizeUserInput(input, 20);
      expect(result).toBe("Very long text that");
      expect(result.length).toBe(19);
    });

    it("should handle normal text", () => {
      const input = "Normal text input";
      expect(sanitizeUserInput(input)).toBe("Normal text input");
    });

    it("should handle non-string input", () => {
      expect(sanitizeUserInput(null as unknown as string)).toBe("");
      expect(sanitizeUserInput(undefined as unknown as string)).toBe("");
    });
  });

  describe("formatValidationErrors", () => {
    it("should format field errors nicely", () => {
      const errors = {
        firstName: ["First name is required"],
        email: ["Invalid email format", "Email already exists"],
        age: ["Must be 18 or older"],
      };

      const result = formatValidationErrors(errors);

      expect(result).toContain("First Name: First name is required");
      expect(result).toContain("Email: Invalid email format");
      expect(result).toContain("Email: Email already exists");
      expect(result).toContain("Age: Must be 18 or older");
    });

    it("should handle field names with underscores", () => {
      const errors = {
        first_name: ["Required"],
        last_name: ["Required"],
      };

      const result = formatValidationErrors(errors);

      expect(result).toContain("First name: Required");
      expect(result).toContain("Last name: Required");
    });
  });

  describe("isValidUUID", () => {
    it("should validate UUID v4 format", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      const invalidUUID = "not-a-uuid";

      expect(isValidUUID(validUUID)).toBe(true);
      expect(isValidUUID(invalidUUID)).toBe(false);
    });

    it("should handle various UUID versions", () => {
      expect(isValidUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true); // v1
      expect(isValidUUID("6ba7b811-9dad-21d1-80b4-00c04fd430c8")).toBe(true); // v2
      expect(isValidUUID("6ba7b812-9dad-31d1-80b4-00c04fd430c8")).toBe(true); // v3
      expect(isValidUUID("6ba7b813-9dad-41d1-80b4-00c04fd430c8")).toBe(true); // v4
      expect(isValidUUID("6ba7b814-9dad-51d1-80b4-00c04fd430c8")).toBe(true); // v5
    });
  });

  describe("isValidEmail", () => {
    it("should validate email addresses", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@example.co.uk")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
    });
  });

  describe("validateFile", () => {
    it("should validate file size", () => {
      const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.txt"); // 6MB
      const result = validateFile(largeFile, 5 * 1024 * 1024); // 5MB limit

      expect(result.success).toBe(false);
      expect(result.message).toContain("File size must be less than 5MB");
    });

    it("should validate file type", () => {
      const txtFile = new File(["content"], "test.txt", { type: "text/plain" });
      const result = validateFile(txtFile, 1024 * 1024, [
        "image/jpeg",
        "image/png",
      ]);

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "File type must be one of: image/jpeg, image/png"
      );
    });

    it("should accept valid files", () => {
      const imageFile = new File(["fake image content"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = validateFile(imageFile);

      expect(result.success).toBe(true);
      expect(result.data).toBe(imageFile);
    });
  });
});
