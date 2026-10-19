"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";

export async function acceptInviteAction(formData: FormData) {
  const session = await requireSession();
  const token = String(formData.get("token") ?? "");
  const result = await acceptInvite(token, { id: session.user.id, email: session.user.email });
  revalidatePath("/app");
  if (result.ok) redirect("/app");
  redirect(`/invite/${token}?error=${result.reason}`);
}
