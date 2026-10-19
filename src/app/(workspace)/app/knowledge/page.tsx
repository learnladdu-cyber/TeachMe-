import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { articleStats, listArticles } from "@/lib/knowledge";
import { Icon } from "@/components/Icon";
import { ArtKnowledge } from "@/components/illustrations";
import { deleteArticleAction, toggleArticleStatusAction } from "./actions";

export const dynamic = "force-dynamic";

function when(value: Date): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; deleted?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const status = sp.status === "PUBLISHED" || sp.status === "DRAFT" ? sp.status : "ALL";

  const [articles, stats] = await Promise.all([
    listArticles(ctx.organizationId, { q, status }),
    articleStats(ctx.organizationId),
  ]);

  const tabs = [
    { key: "ALL", label: "All", count: stats.all },
    { key: "PUBLISHED", label: "Published", count: stats.published },
    { key: "DRAFT", label: "Drafts", count: stats.drafts },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (key !== "ALL") p.set("status", key);
    const s = p.toString();
    return `/app/knowledge${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Knowledge base</h1>
          <p className="page-sub">
            {stats.published} published · {stats.drafts} drafts · {stats.views} total views
          </p>
        </div>
        <div className="page-actions">
          <form className="row" action="/app/knowledge" method="get" style={{ gap: 8 }}>
            {status !== "ALL" && <input type="hidden" name="status" value={status} />}
            <div style={{ position: "relative" }}>
              <span
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
              >
                <Icon name="search" size={16} />
              </span>
              <input
                name="q"
                placeholder="Search articles"
                defaultValue={q ?? ""}
                style={{ width: 220, paddingLeft: 36 }}
              />
            </div>
            <button className="btn secondary" type="submit">
              Search
            </button>
          </form>
          <Link href="/app/knowledge/new" className="btn gold">
            <Icon name="plus" /> New article
          </Link>
        </div>
      </div>

      {sp.deleted && (
        <div className="alert success">
          <Icon name="check" />
          <span>Article deleted.</span>
        </div>
      )}

      <div className="toolbar">
        <div className="segmented">
          {tabs.map((t) => (
            <Link key={t.key} href={tabHref(t.key)} className={status === t.key ? "on" : ""}>
              {t.label} <span className="muted">· {t.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="empty">
          <ArtKnowledge style={{ width: 220, margin: "0 auto 14px" }} />
          <h3>No articles yet</h3>
          <p>Publish answers once and deflect repeat questions for good.</p>
          <Link href="/app/knowledge/new" className="btn gold">
            <Icon name="plus" /> Write the first article
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>Status</th>
                <th>Category</th>
                <th>Author</th>
                <th>Views</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/app/knowledge/${a.id}`} className="ticket-link">
                      {a.title}
                    </Link>
                    <div className="cell-sub code">/{a.slug}</div>
                  </td>
                  <td>
                    <span className={`badge ${a.status === "PUBLISHED" ? "status-RESOLVED" : "status-PENDING"}`}>
                      {a.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="muted">{a.category ?? "—"}</td>
                  <td className="muted">{a.author?.name ?? "—"}</td>
                  <td>{a.views}</td>
                  <td className="muted">{when(a.updatedAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                      <Link href={`/app/knowledge/${a.id}`} className="icon-btn" title="Edit">
                        <Icon name="edit" />
                      </Link>
                      <form action={toggleArticleStatusAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={a.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                        />
                        <button
                          className="icon-btn"
                          title={a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          type="submit"
                        >
                          <Icon name={a.status === "PUBLISHED" ? "lock" : "send"} />
                        </button>
                      </form>
                      <form action={deleteArticleAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="icon-btn" title="Delete" type="submit">
                          <Icon name="trash" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
