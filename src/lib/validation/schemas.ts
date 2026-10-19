import { z } from "zod";
import {
  isUuid,
  normalizeEmail,
  sanitizeMultiline,
  sanitizeSingleLine,
} from "@/lib/security/sanitize";

// Reusable, sanitizing building blocks for every input boundary (API bodies,
// query strings and server-action form data).

export const emailSchema = z
  .string()
  .trim()
  .max(200)
  .transform(normalizeEmail)
  .pipe(z.string().email("Enter a valid email address."));

export const uuidSchema = z.string().refine(isUuid, "Invalid identifier.");

export const optionalUuidSchema = z
  .union([uuidSchema, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

// Single-line text, tag-stripped and length-bounded before validation.
export function shortText(maxLength: number, options: { min?: number } = {}) {
  const min = options.min ?? 1;
  return z.preprocess(
    (value) => sanitizeSingleLine(value, maxLength),
    z.string().min(min, "This field is required.").max(maxLength),
  );
}

// Free-text body, newline-preserving and length-bounded before validation.
export function longText(maxLength: number, options: { min?: number } = {}) {
  const min = options.min ?? 1;
  return z.preprocess(
    (value) => sanitizeMultiline(value, maxLength),
    z.string().min(min, "This field is required.").max(maxLength),
  );
}

export const localeSchema = z.enum(["en", "hi", "es", "fr", "de"]).catch("en");
export const timezoneSchema = z
  .string()
  .trim()
  .max(64)
  .regex(/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)*$/, "Enter a valid timezone identifier.")
  .catch("UTC");

export const pageSizeSchema = z.coerce.number().int().min(1).max(100).catch(25);

// Collects FormData into a plain object (repeated keys become arrays).
export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    const current = result[key];
    if (current === undefined) result[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else result[key] = [current, value];
  }
  return result;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[]; fieldErrors: Record<string, string[]> };

export function parseForm<S extends z.ZodTypeAny>(schema: S, formData: FormData): ParseResult<z.infer<S>> {
  const parsed = schema.safeParse(formToObject(formData));
  if (parsed.success) return { success: true, data: parsed.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "_";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  const errors = Object.values(fieldErrors).flat();
  return { success: false, errors, fieldErrors };
}
