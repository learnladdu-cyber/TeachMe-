import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { Icon } from "@/components/Icon";
import { createArticleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>New article</h1>
          <p className="page-sub">Draft an answer, then publish when it is ready.</p>
        </div>
        <Link href="/app/knowledge" className="btn ghost">
          Cancel
        </Link>
      </div>

      {sp.error === "missing" && (
        <div className="alert error">
          <Icon name="alert" />
          <span>A title and body are required.</span>
        </div>
      )}

      <form action={createArticleAction} className="card" style={{ maxWidth: 760 }}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" placeholder="How do I reset my password?" required />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <input id="category" name="category" placeholder="Account, Billing, Getting started…" />
            <div className="hint">Optional. Groups articles in the help center.</div>
          </div>
          <div className="field">
            <label htmlFor="body">Body</label>
            <textarea
              id="body"
              name="body"
              placeholder={"Write the answer in plain language.\n\nUse blank lines to separate steps."}
              style={{ minHeight: 260 }}
              required
            />
          </div>
          <label className="inline">
            <input type="checkbox" name="publish" /> Publish immediately
          </label>
          <div className="row">
            <button className="btn gold" type="submit">
              <Icon name="check" /> Save article
            </button>
            <Link href="/app/knowledge" className="btn ghost">
              Discard
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
