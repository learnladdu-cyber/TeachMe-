import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/guard";
import { getArticle } from "@/lib/knowledge";
import { isUuid } from "@/lib/security/sanitize";
import { Icon } from "@/components/Icon";
import { deleteArticleAction, toggleArticleStatusAction, updateArticleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const ctx = await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;

  const article = await getArticle(ctx.organizationId, id);
  if (!article) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{article.title}</h1>
          <p className="page-sub">
            <span className="code">/{article.slug}</span> · {article.views} views · updated{" "}
            {new Date(article.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="page-actions">
          <span className={`badge ${article.status === "PUBLISHED" ? "status-RESOLVED" : "status-PENDING"}`}>
            {article.status.toLowerCase()}
          </span>
          <Link href="/app/knowledge" className="btn ghost">
            Back
          </Link>
        </div>
      </div>

      {sp.saved && (
        <div className="alert success">
          <Icon name="check" />
          <span>Article saved.</span>
        </div>
      )}
      {sp.error === "missing" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>A title and body are required.</span>
        </div>
      )}

      <div className="split">
        <form action={updateArticleAction} className="card">
          <input type="hidden" name="id" value={article.id} />
          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" defaultValue={article.title} required />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <input id="category" name="category" defaultValue={article.category ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="body">Body</label>
              <textarea id="body" name="body" defaultValue={article.body} style={{ minHeight: 320 }} required />
            </div>
            <label className="inline">
              <input type="checkbox" name="publish" defaultChecked={article.status === "PUBLISHED"} /> Published
            </label>
            <div className="row">
              <button className="btn gold" type="submit">
                <Icon name="check" /> Save changes
              </button>
            </div>
          </div>
        </form>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <h3 className="card-title">Publishing</h3>
            <div className="meta-list">
              <div className="meta-item">
                <span className="k">Status</span>
                <span className="v">{article.status.toLowerCase()}</span>
              </div>
              <div className="meta-item">
                <span className="k">Published at</span>
                <span className="v">
                  {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="meta-item">
                <span className="k">Views</span>
                <span className="v">{article.views}</span>
              </div>
            </div>
            <div className="divider" />
            <form action={toggleArticleStatusAction}>
              <input type="hidden" name="id" value={article.id} />
              <input
                type="hidden"
                name="status"
                value={article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
              />
              <button className="btn secondary block" type="submit">
                <Icon name={article.status === "PUBLISHED" ? "lock" : "send"} />
                {article.status === "PUBLISHED" ? "Unpublish" : "Publish now"}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title">Danger zone</h3>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 0 }}>
              Deleting an article is permanent and removes it from the help center.
            </p>
            <form action={deleteArticleAction}>
              <input type="hidden" name="id" value={article.id} />
              <button className="btn secondary block" type="submit">
                <Icon name="trash" /> Delete article
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
