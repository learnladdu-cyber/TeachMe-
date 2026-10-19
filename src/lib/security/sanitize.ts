// Input sanitization primitives.
//
// React escapes all rendered text, so these helpers are defence-in-depth
// against control-character injection, log injection, oversized payloads and
// accidental HTML/script content in structured fields.

// C0/C1 control characters except tab (\u0009) and newline (\u000A).
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const HTML_TAG = /<[^>]*>/g;

export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

// Single-line structured values (names, titles, subjects, categories): tags are
// stripped and whitespace collapsed.
export function sanitizeSingleLine(value: unknown, maxLength = 200): string {
  return stripControlChars(String(value ?? ""))
    .replace(HTML_TAG, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// Free-text bodies: preserve meaningful content but normalize newlines and
// remove control characters. Output is escaped by React on render.
export function sanitizeMultiline(value: unknown, maxLength = 20000): string {
  return stripControlChars(String(value ?? ""))
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function stripTags(value: string): string {
  return value.replace(HTML_TAG, "");
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

// Use whenever untrusted text must be embedded in an HTML string.
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'`]/g, (c) => HTML_ENTITIES[c] ?? c);
}

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Guards against prototype-pollution payloads in parsed JSON.
export function hasDangerousKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasDangerousKeys);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) return true;
      if (hasDangerousKeys((value as Record<string, unknown>)[key])) return true;
    }
  }
  return false;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function normalizeEmail(value: unknown): string {
  return stripControlChars(String(value ?? "")).trim().toLowerCase().slice(0, 200);
}

export function sanitizeSlug(value: unknown, maxLength = 80): string {
  return stripControlChars(String(value ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

// Prevents open-redirects: only same-site absolute paths are permitted.
export function safeInternalPath(value: unknown, fallback = "/"): string {
  const path = String(value ?? "");
  if (path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")) return path;
  return fallback;
}

// Neutralises log/audit injection from user-controlled strings.
export function sanitizeForLog(value: unknown, maxLength = 500): string {
  return stripControlChars(String(value ?? ""))
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, maxLength);
}

// Normalises a free-text search term for database queries.
export function sanitizeSearchTerm(value: unknown, maxLength = 100): string {
  return sanitizeSingleLine(value, maxLength);
}
