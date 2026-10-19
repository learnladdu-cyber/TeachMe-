import type { IntegrationCategory } from "@prisma/client";
import type { IconName } from "@/components/Icon";

export type IntegrationFieldType = "text" | "password" | "boolean" | "number" | "select" | "textarea";

export type IntegrationField = {
  name: string;
  label: string;
  type: IntegrationFieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  default?: string | number | boolean;
};

export type IntegrationDef = {
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  icon: IconName;
  config: IntegrationField[];
  secrets: IntegrationField[];
};

// The single source of truth for everything configurable from the admin panel.
// Adding a row here makes it editable in /admin/integrations automatically.
export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "smtp",
    name: "Outgoing email (SMTP)",
    category: "EMAIL",
    description: "Send verification, notification and system emails via your own SMTP server.",
    icon: "mail",
    config: [
      { name: "host", label: "SMTP host", type: "text", placeholder: "smtp.example.com", required: true },
      { name: "port", label: "Port", type: "number", default: 587 },
      { name: "secure", label: "Use TLS (implicit on connect)", type: "boolean", default: false },
      { name: "fromEmail", label: "From address", type: "text", placeholder: "support@example.com" },
      { name: "fromName", label: "From name", type: "text", placeholder: "HelpDeskFlow" },
    ],
    secrets: [
      { name: "username", label: "SMTP username", type: "password", placeholder: "apikey" },
      { name: "password", label: "SMTP password", type: "password" },
    ],
  },
  {
    key: "email_rules",
    name: "Email verification rules",
    category: "EMAIL",
    description: "Control who can sign up and whether email addresses must be verified.",
    icon: "shield",
    config: [
      { name: "requireVerification", label: "Require email verification on signup", type: "boolean", default: false },
      { name: "blockDisposable", label: "Block disposable email domains", type: "boolean", default: true },
      { name: "allowedDomains", label: "Allowed domains (one per line, empty = any)", type: "textarea", placeholder: "example.com\nacme.io" },
      { name: "blockedDomains", label: "Blocked domains (one per line)", type: "textarea", placeholder: "spam.com" },
    ],
    secrets: [],
  },
  {
    key: "razorpay",
    name: "Razorpay payments",
    category: "PAYMENTS",
    description: "Accept subscription payments and upgrade tenant plans automatically.",
    icon: "ticket",
    config: [
      { name: "keyId", label: "Key ID", type: "text", placeholder: "rzp_live_xxxxxxxx", required: true },
      { name: "currency", label: "Currency", type: "select", default: "INR", options: [{ value: "INR", label: "INR" }, { value: "USD", label: "USD" }] },
    ],
    secrets: [
      { name: "keySecret", label: "Key secret", type: "password" },
      { name: "webhookSecret", label: "Webhook secret", type: "password" },
    ],
  },
  {
    key: "openai",
    name: "AI assistant (OpenAI-compatible)",
    category: "AI",
    description: "Power the support chatbot with an LLM. Falls back to docs retrieval when disabled.",
    icon: "sparkles",
    config: [
      { name: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.openai.com/v1", default: "https://api.openai.com/v1" },
      { name: "model", label: "Model", type: "text", placeholder: "gpt-4o-mini", default: "gpt-4o-mini" },
    ],
    secrets: [{ name: "apiKey", label: "API key", type: "password" }],
  },
  {
    key: "google_oauth",
    name: "Google OAuth / SSO",
    category: "OAUTH",
    description: "Enable single sign-on with Google for workspace members.",
    icon: "lock",
    config: [{ name: "clientId", label: "Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com" }],
    secrets: [{ name: "clientSecret", label: "Client secret", type: "password" }],
  },
  {
    key: "s3",
    name: "Object storage (S3-compatible)",
    category: "STORAGE",
    description: "Store attachments and exports in S3, MinIO or any compatible bucket.",
    icon: "document",
    config: [
      { name: "bucket", label: "Bucket", type: "text" },
      { name: "region", label: "Region", type: "text", placeholder: "us-east-1" },
      { name: "endpoint", label: "Endpoint", type: "text", placeholder: "https://s3.amazonaws.com" },
      { name: "publicBaseUrl", label: "Public base URL", type: "text" },
    ],
    secrets: [
      { name: "accessKeyId", label: "Access key ID", type: "password" },
      { name: "secretAccessKey", label: "Secret access key", type: "password" },
    ],
  },
  {
    key: "webhooks",
    name: "Outbound webhooks",
    category: "WEBHOOKS",
    description: "POST platform events to your endpoints. One URL per line.",
    icon: "bolt",
    config: [
      { name: "endpoints", label: "Endpoints", type: "textarea", placeholder: "https://example.com/hooks/hdf" },
      { name: "events", label: "Events (one per line)", type: "textarea", placeholder: "payment.paid\norganization.created" },
    ],
    secrets: [{ name: "signingSecret", label: "Signing secret", type: "password" }],
  },
];

export function getIntegrationDef(key: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((i) => i.key === key);
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  EMAIL: "Email",
  PAYMENTS: "Payments",
  OAUTH: "SSO & OAuth",
  AI: "AI & automation",
  STORAGE: "Storage",
  WEBHOOKS: "Webhooks",
  GENERAL: "General",
};
