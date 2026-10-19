import type { Metadata } from "next";
import { EmbedChat } from "@/components/chat/EmbedChat";
import { getChatConfig, getOrgByChatKey } from "@/lib/chat/service";
import { chatKeySchema } from "@/lib/chat/validation";

export const metadata: Metadata = {
  title: "Support chat",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function clean(value: string | string[] | undefined, max: number): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed || null;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="embed-chat embed-chat--notice">
      <p className="embed-chat__hint">{children}</p>
    </div>
  );
}

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { key } = await params;
  const sp = await searchParams;

  if (!chatKeySchema.safeParse(key).success) {
    return <Notice>This chat widget is not available.</Notice>;
  }

  const org = await getOrgByChatKey(key);
  if (!org) return <Notice>This chat widget is not available.</Notice>;

  const config = await getChatConfig(org.id);
  if (!config || !config.enabled) {
    return <Notice>Chat is currently turned off.</Notice>;
  }

  // The workspace preview can override the cosmetic settings without saving,
  // so a brand can try colours and copy before committing. These only apply
  // when explicitly requested with ?preview=1.
  const preview = sp.preview === "1" || sp.preview === "true";
  let accent = config.accent;
  let welcome = config.welcome;
  let launcherLabel = config.launcherLabel;
  let position = config.position;

  if (preview) {
    const a = clean(sp.accent, 7);
    if (a && /^#[0-9a-fA-F]{6}$/.test(a)) accent = a;
    welcome = clean(sp.welcome, 240) ?? welcome;
    launcherLabel = clean(sp.label, 60) ?? launcherLabel;
    position = sp.position === "left" ? "left" : position;
  }

  return (
    <EmbedChat
      config={{
        key,
        organizationName: config.organizationName,
        welcome,
        accent,
        launcherLabel,
        position,
        preview,
      }}
    />
  );
}
