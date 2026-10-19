import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecrets, encryptSecrets, maskSecret } from "@/lib/security/secrets";
import { INTEGRATIONS, getIntegrationDef, type IntegrationDef } from "./registry";

export type IntegrationView = {
  def: IntegrationDef;
  enabled: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, string | null>;
  updatedAt: Date | null;
};

function defaults(def: IntegrationDef): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of def.config) {
    if (field.default !== undefined) out[field.name] = field.default;
  }
  return out;
}

function asObject(value: Prisma.JsonValue | undefined | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function getConfig(key: string): Promise<Record<string, unknown>> {
  const def = getIntegrationDef(key);
  if (!def) return {};
  const row = await prisma.integration.findUnique({ where: { key }, select: { config: true } });
  return { ...defaults(def), ...asObject(row?.config) };
}

export async function getSecrets(key: string): Promise<Record<string, string>> {
  const row = await prisma.integration.findUnique({ where: { key }, select: { secrets: true } });
  return decryptSecrets(row?.secrets ?? null);
}

export async function isEnabled(key: string): Promise<boolean> {
  const row = await prisma.integration.findUnique({ where: { key }, select: { enabled: true } });
  return row?.enabled ?? false;
}

export async function listIntegrations(): Promise<IntegrationView[]> {
  const rows = await prisma.integration.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return INTEGRATIONS.map((def) => {
    const row = byKey.get(def.key);
    const stored = decryptSecrets(row?.secrets ?? null);
    const secrets: Record<string, string | null> = {};
    for (const field of def.secrets) secrets[field.name] = maskSecret(stored[field.name]);
    return {
      def,
      enabled: row?.enabled ?? false,
      config: { ...defaults(def), ...asObject(row?.config) },
      secrets,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function saveIntegration(
  key: string,
  input: {
    enabled?: boolean;
    config?: Record<string, unknown>;
    secrets?: Record<string, string>;
    actorId?: string | null;
  },
): Promise<void> {
  const def = getIntegrationDef(key);
  if (!def) throw new Error(`Unknown integration: ${key}`);

  const existing = await prisma.integration.findUnique({ where: { key } });
  const mergedSecrets = { ...decryptSecrets(existing?.secrets ?? null), ...(input.secrets ?? {}) };
  for (const [name, value] of Object.entries(mergedSecrets)) {
    if (!value) delete mergedSecrets[name];
  }

  await prisma.integration.upsert({
    where: { key },
    create: {
      key,
      category: def.category,
      enabled: input.enabled ?? false,
      config: (input.config ?? {}) as Prisma.InputJsonValue,
      secrets: encryptSecrets(mergedSecrets),
      updatedById: input.actorId ?? null,
    },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.config !== undefined ? { config: input.config as Prisma.InputJsonValue } : {}),
      secrets: encryptSecrets(mergedSecrets),
      updatedById: input.actorId ?? null,
    },
  });
}

// ---------- Typed accessors used by feature code ----------

export type SmtpSettings = {
  enabled: boolean;
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  fromEmail: string;
  fromName: string;
  username: string;
  password: string;
};

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const [enabled, config, secrets] = await Promise.all([
    isEnabled("smtp"),
    getConfig("smtp"),
    getSecrets("smtp"),
  ]);
  const host = String(config.host ?? "");
  const username = secrets.username ?? "";
  const password = secrets.password ?? "";
  return {
    enabled,
    configured: Boolean(host && username && password),
    host,
    port: Number(config.port ?? 587) || 587,
    secure: Boolean(config.secure),
    fromEmail: String(config.fromEmail ?? "") || username,
    fromName: String(config.fromName ?? "") || "HelpDeskFlow",
    username,
    password,
  };
}

export type EmailRules = {
  requireVerification: boolean;
  blockDisposable: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
};

export async function getEmailRules(): Promise<EmailRules> {
  const config = await getConfig("email_rules");
  const lines = (value: unknown) =>
    String(value ?? "")
      .split(/[\s,]+/)
      .map((part) => part.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);
  return {
    requireVerification: Boolean(config.requireVerification),
    blockDisposable: config.blockDisposable === undefined ? true : Boolean(config.blockDisposable),
    allowedDomains: lines(config.allowedDomains),
    blockedDomains: lines(config.blockedDomains),
  };
}

export type RazorpaySettings = {
  enabled: boolean;
  configured: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  currency: string;
};

export async function getRazorpaySettings(): Promise<RazorpaySettings> {
  const [enabled, config, secrets] = await Promise.all([
    isEnabled("razorpay"),
    getConfig("razorpay"),
    getSecrets("razorpay"),
  ]);
  const keyId = String(config.keyId ?? "");
  const keySecret = secrets.keySecret ?? "";
  return {
    enabled,
    configured: Boolean(keyId && keySecret),
    keyId,
    keySecret,
    webhookSecret: secrets.webhookSecret ?? "",
    currency: String(config.currency ?? "INR"),
  };
}

export type AiSettings = {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  model: string;
  apiKey: string;
};

export async function getAiSettings(): Promise<AiSettings> {
  const [enabledRow, config, secrets] = await Promise.all([
    isEnabled("openai"),
    getConfig("openai"),
    getSecrets("openai"),
  ]);
  const apiKey = secrets.apiKey || process.env.CHATBOT_LLM_KEY || "";
  const baseUrl = String(config.baseUrl ?? "") || process.env.CHATBOT_LLM_URL || "";
  const model = String(config.model ?? "") || process.env.CHATBOT_LLM_MODEL || "gpt-4o-mini";
  const enabled = enabledRow || Boolean(process.env.CHATBOT_LLM_KEY);
  return { enabled, configured: Boolean(apiKey && baseUrl), baseUrl, model, apiKey };
}
