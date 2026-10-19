"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/guard";
import { applyWorkspaceUpdate } from "@/lib/update-center";

export async function updateWorkspaceAction() {
  const ctx = await requireStaff("ORG_ADMIN");

  await applyWorkspaceUpdate(ctx.organizationId, ctx.session.user.id);

  revalidatePath("/app");
  revalidatePath("/app/updates");
  revalidatePath("/app/widget");
  redirect("/app/updates?updated=1");
}
