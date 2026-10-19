import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/guard";
import { Icon } from "@/components/Icon";
import { ensureChatKey } from "@/lib/chat/service";
import { isBehind, LATEST_VERSION } from "@/lib/releases";
import { WidgetSetup } from "@/components/widget/WidgetSetup";
import { updateChatWidgetAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChatWidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const ctx = await requireStaff("ORG_ADMIN");
  const sp = await searchParams;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      name: true,
      chatEnabled: true,
      chatWelcome: true,
      chatAccent: true,
      chatLauncherLabel: true,
      chatPosition: true,
      chatAllowedOrigins: true,
      appVersion: true,
      chatWidgetVersion: true,
    },
  });
  if (!org) notFound();

  const [chatKey, publishedCount] = await Promise.all([
    ensureChatKey(ctx.organizationId),
    prisma.knowledgeArticle.count({
      where: { organizationId: ctx.organizationId, status: "PUBLISHED" },
    }),
  ]);

  const outdated = isBehind(org.appVersion);

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const embedUrl = `${appUrl}/embed/${chatKey}`;
  const snippet = `<script src="${appUrl}/chat-widget.js" data-key="${chatKey}" async></script>`;
  const allowedOrigins = Array.isArray(org.chatAllowedOrigins) ? org.chatAllowedOrigins : [];
  const accent = /^#[0-9a-fA-F]{6}$/.test(org.chatAccent) ? org.chatAccent : "#1b1533";
  const position = org.chatPosition === "left" ? "left" : "right";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Chat widget</h1>
          <p className="page-sub">
            Add an AI support assistant to your website — answered from your knowledge base and
            handled in this workspace.
          </p>
        </div>
        <span className={`pill ${org.chatEnabled ? "ok" : "warn"}`}>
          {org.chatEnabled ? "Enabled" : "Disabled"} · engine v{org.chatWidgetVersion}
        </span>
      </div>

      {sp.saved && (
        <div className="alert success">
          <Icon name="check" />
          <span>Widget settings saved.</span>
        </div>
      )}
      {sp.error === "widget" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>Could not save the widget settings. Check the accent colour.</span>
        </div>
      )}

      {outdated && (
        <div className="alert warn">
          <Icon name="sparkles" />
          <span>
            This workspace is on v{org.appVersion}. Update to v{LATEST_VERSION} to get the latest
            widget engine and features. <Link href="/app/updates">Go to Updates</Link>.
          </span>
        </div>
      )}

      {publishedCount === 0 && (
        <div className="alert warn">
          <Icon name="alert" />
          <span>
            You have no published articles yet, so the assistant can only fall back to “talk to a
            human”. <Link href="/app/knowledge/new">Add your first article</Link>.
          </span>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <span className="stat-k">Published docs</span>
          <span className="stat-v">{publishedCount}</span>
          <span className="stat-sub">Powering the assistant</span>
        </div>
        <div className="stat">
          <span className="stat-k">Allowed origins</span>
          <span className="stat-v">{allowedOrigins.length === 0 ? "Any" : allowedOrigins.length}</span>
          <span className="stat-sub">{allowedOrigins.length === 0 ? "No domain lock" : "Domain locked"}</span>
        </div>
        <div className="stat">
          <span className="stat-k">Launcher</span>
          <span className="stat-v" style={{ fontSize: 18 }}>
            {org.chatLauncherLabel}
          </span>
          <span className="stat-sub">{position} · {accent}</span>
        </div>
      </div>

      <WidgetSetup
        widgetKey={chatKey}
        embedUrl={embedUrl}
        previewPath={`/embed/${chatKey}`}
        snippet={snippet}
        organizationName={org.name}
        initial={{
          enabled: org.chatEnabled,
          welcome: org.chatWelcome,
          accent,
          launcherLabel: org.chatLauncherLabel,
          position,
          allowedOrigins: allowedOrigins.join("\n"),
        }}
        saveAction={updateChatWidgetAction}
      />
    </>
  );
}
