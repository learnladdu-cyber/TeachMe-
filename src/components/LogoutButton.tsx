"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button className="icon-btn" onClick={logout} disabled={busy} title="Sign out" aria-label="Sign out">
        <Icon name="logout" />
      </button>
    );
  }

  return (
    <button className="btn ghost" onClick={logout} disabled={busy}>
      <Icon name="logout" />
      {busy ? "…" : "Sign out"}
    </button>
  );
}
