import { requireStaff } from "@/lib/guard";
import { ChatConsole } from "@/components/chat/ChatConsole";

export const dynamic = "force-dynamic";

export default async function LiveChatPage() {
  const ctx = await requireStaff();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Live chat</h1>
          <p className="page-sub">
            Real-time conversations with visitors, answered from your knowledge base.
          </p>
        </div>
      </div>
      <ChatConsole organizationId={ctx.organizationId} />
    </>
  );
}
