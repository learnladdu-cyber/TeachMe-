"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

export async function markAllReadAction() {
  const session = await requireSession();
  await markAllNotificationsRead(session.user.id);
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}

export async function markReadAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (id) await markNotificationRead(session.user.id, id);
  revalidatePath("/app/notifications");
}
