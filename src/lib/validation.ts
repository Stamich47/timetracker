import { z } from "zod";

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

// Common validation patterns
export const UUIDSchema = z.string().uuid("Invalid UUID format");
export const EmailSchema = z.string().email("Invalid email format");
export const DateTimeSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), "Invalid datetime format");

// HTML sanitization helper
const sanitizeHtml = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .trim();
};

// Safe string schema with HTML sanitization
export const SafeStringSchema = (minLength = 0, maxLength = 1000) =>
  z
    .string()
    .trim()
    .min(minLength, `Minimum ${minLength} characters required`)
    .max(maxLength, `Maximum ${maxLength} characters allowed`)
    .transform(sanitizeHtml);

// ============================================================================
// TIME ENTRY SCHEMAS
// ============================================================================

export const TimeEntryCreateSchema = z.object({
  project_id: UUIDSchema.optional(),
  description: SafeStringSchema(0, 500).default(""),
  start_time: DateTimeSchema.optional(),
  end_time: DateTimeSchema.optional(),
  duration: z
    .number()
    .min(0, "Duration must be positive")
    .max(24 * 60 * 60 * 1000, "Maximum 24 hours allowed") // milliseconds
    .optional(),
  tags: z
    .array(SafeStringSchema(1, 50))
    .max(10, "Maximum 10 tags allowed")
    .default([])
    .optional(),
  billable: z.boolean().default(true).optional(),
  hourly_rate: z
    .number()
    .min(0, "Rate must be positive")
    .max(10000, "Rate too high")
    .optional(),
});

export const TimeEntryUpdateSchema = TimeEntryCreateSchema.partial();

export const TimeEntrySchema = TimeEntryCreateSchema.extend({
  id: UUIDSchema,
  user_id: UUIDSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
  is_running: z.boolean().optional(),
  // Allow nested project data from Supabase joins
  project: z
    .object({
      id: UUIDSchema,
      name: z.string(),
      color: z.string(),
      client: z
        .object({
          id: UUIDSchema,
          name: z.string(),
        })
        .optional(),
    })
    .optional(),
});

// Response schemas for API validation
export const TimeEntriesResponseSchema = z.array(TimeEntrySchema);

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const ProjectCreateSchema = z.object({
  name: SafeStringSchema(1, 100),
  description: SafeStringSchema(0, 1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format")
    .default("#3B82F6"),
  client_id: UUIDSchema.optional(),
  hourly_rate: z
    .number()
    .min(0, "Rate must be positive")
    .max(10000, "Rate too high")
    .optional(),
  is_active: z.boolean().default(true),
  estimated_hours: z
    .number()
    .min(0, "Estimated hours must be positive")
    .max(10000, "Too many hours")
    .optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const ProjectSchema = ProjectCreateSchema.extend({
  id: UUIDSchema,
  user_id: UUIDSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const ProjectsResponseSchema = z.array(ProjectSchema);

// ============================================================================
// CLIENT SCHEMAS
// ============================================================================

export const ClientCreateSchema = z.object({
  name: SafeStringSchema(1, 100),
  email: EmailSchema.optional(),
  company: SafeStringSchema(0, 100).optional(),
  phone: z
    .string()
    .regex(/^[\d\s\-+()]+$/, "Invalid phone format")
    .max(20, "Phone too long")
    .optional(),
  address: SafeStringSchema(0, 500).optional(),
  notes: SafeStringSchema(0, 1000).optional(),
  hourly_rate: z
    .number()
    .min(0, "Rate must be positive")
    .max(10000, "Rate too high")
    .optional(),
  is_active: z.boolean().default(true),
});

export const ClientUpdateSchema = ClientCreateSchema.partial();

export const ClientSchema = ClientCreateSchema.extend({
  id: UUIDSchema,
  user_id: UUIDSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const ClientsResponseSchema = z.array(ClientSchema);

// ============================================================================
// USER & SETTINGS SCHEMAS
// ============================================================================

export const UserSettingsSchema = z.object({
  id: UUIDSchema.optional(),
  user_id: UUIDSchema,
  timezone: z
    .string()
    .min(1, "Timezone required")
    .max(50, "Timezone too long")
    .default("UTC"),
  time_format: z.enum(["12h", "24h"]).default("12h"),
  date_format: z
    .enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"])
    .default("MM/DD/YYYY"),
  currency: z
    .string()
    .length(3, "Currency must be 3 characters")
    .regex(/^[A-Z]{3}$/, "Invalid currency code")
    .default("USD"),
  default_hourly_rate: z
    .number()
    .min(0, "Rate must be positive")
    .max(10000, "Rate too high")
    .optional(),
  auto_start_timer: z.boolean().default(false),
  remind_break: z.boolean().default(false),
  break_reminder_interval: z
    .number()
    .min(15, "Minimum 15 minutes")
    .max(480, "Maximum 8 hours")
    .default(60), // minutes
  theme: z.enum(["light", "dark", "system"]).default("system"),
  notifications_enabled: z.boolean().default(true),
  created_at: DateTimeSchema.optional(),
  updated_at: DateTimeSchema.optional(),
});

export const UserProfileSchema = z.object({
  id: UUIDSchema,
  email: EmailSchema,
  full_name: SafeStringSchema(1, 100).optional(),
  avatar_url: z.string().url("Invalid URL").optional(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

// ============================================================================
// FORM VALIDATION SCHEMAS
// ============================================================================

export const TimerFormSchema = z.object({
  project_id: UUIDSchema.optional(),
  description: SafeStringSchema(0, 500),
  start_time: z.string().optional(), // Will be validated as datetime when submitted
  end_time: z.string().optional(),
});

export const ProjectFormSchema = z.object({
  name: SafeStringSchema(1, 100),
  description: SafeStringSchema(0, 1000),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  client_id: z.string().optional(), // Will be validated as UUID when submitted
  hourly_rate: z
    .union([
      z.string().transform((val) => (val === "" ? undefined : parseFloat(val))),
      z.number(),
      z.undefined(),
    ])
    .refine((val) => val === undefined || (val >= 0 && val <= 10000), {
      message: "Rate must be between 0 and 10000",
    }),
});

export const ClientFormSchema = z.object({
  name: SafeStringSchema(1, 100),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  company: SafeStringSchema(0, 100),
  phone: z.string().max(20, "Phone too long").optional(),
  address: SafeStringSchema(0, 500),
  hourly_rate: z
    .union([
      z.string().transform((val) => (val === "" ? undefined : parseFloat(val))),
      z.number(),
      z.undefined(),
    ])
    .refine((val) => val === undefined || (val >= 0 && val <= 10000), {
      message: "Rate must be between 0 and 10000",
    }),
});

// ============================================================================
// API RESPONSE VALIDATION
// ============================================================================

export const SupabaseErrorSchema = z.object({
  message: z.string(),
  details: z.string().optional(),
  hint: z.string().optional(),
  code: z.string().optional(),
});

export const SupabaseResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    data: z.union([dataSchema, z.null()]),
    error: z.union([SupabaseErrorSchema, z.null()]),
    count: z.number().optional(),
    status: z.number(),
    statusText: z.string(),
  });

// ============================================================================
// EXPORT TYPES
// ============================================================================

// Infer TypeScript types from schemas
export type TimeEntry = z.infer<typeof TimeEntrySchema>;
export type TimeEntryCreate = z.infer<typeof TimeEntryCreateSchema>;
export type TimeEntryUpdate = z.infer<typeof TimeEntryUpdateSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

export type Client = z.infer<typeof ClientSchema>;
export type ClientCreate = z.infer<typeof ClientCreateSchema>;
export type ClientUpdate = z.infer<typeof ClientUpdateSchema>;

export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

export type TimerForm = z.infer<typeof TimerFormSchema>;
export type ProjectForm = z.infer<typeof ProjectFormSchema>;
export type ClientForm = z.infer<typeof ClientFormSchema>;

export type SupabaseError = z.infer<typeof SupabaseErrorSchema>;
