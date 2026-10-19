import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/auth";
import { NewTicketForm } from "@/components/NewTicketForm";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  return (
    <>
      <p style={{ margin: "0 0 14px" }}>
        <Link href="/portal" className="row" style={{ display: "inline-flex", gap: 6, fontSize: 13.5 }}>
          <Icon name="arrow-right" style={{ transform: "rotate(180deg)" }} size={15} /> Back to my
          support
        </Link>
      </p>

      <div className="page-head">
        <div>
          <h1>Create a ticket</h1>
          <p className="page-sub">
            Tell us what happened. We&apos;ll route your request to the right team.
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", alignItems: "start" }}>
        <div className="card">
          <NewTicketForm orgId={ctx.organizationId} />
        </div>

        <div className="card">
          <h3 className="card-title">What happens next</h3>
          <div className="stack">
            <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <span className="stat-icon" style={{ width: 30, height: 30 }}>
                <Icon name="inbox" size={15} />
              </span>
              <span className="muted" style={{ fontSize: 13.5 }}>
                Your request is logged and queued immediately.
              </span>
            </div>
            <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <span className="stat-icon" style={{ width: 30, height: 30 }}>
                <Icon name="bolt" size={15} />
              </span>
              <span className="muted" style={{ fontSize: 13.5 }}>
                Routing and SLA rules pick the right queue and target.
              </span>
            </div>
            <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <span className="stat-icon" style={{ width: 30, height: 30 }}>
                <Icon name="mail" size={15} />
              </span>
              <span className="muted" style={{ fontSize: 13.5 }}>
                You&apos;ll see replies here and can track status any time.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
