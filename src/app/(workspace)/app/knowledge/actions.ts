"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ArticleStatus } from "@prisma/client";
import { requireStaff } from "@/lib/guard";
import {
  createArticle,
  deleteArticle,
  setArticleStatus,
  updateArticle,
} from "@/lib/knowledge";
import { longText, parseForm, shortText, uuidSchema } from "@/lib/validation/schemas";
import { isUuid } from "@/lib/security/sanitize";

const articleSchema = z.object({
  title: shortText(200),
  body: longText(20000),
  category: shortText(120, { min: 0 }).transform((v) => v || null),
  status: z.enum(["DRAFT", "PUBLISHED"]).catch("DRAFT"),
});

function readArticle(formData: FormData) {
  return {
    title: formData.get("title"),
    body: formData.get("body"),
    category: formData.get("category"),
    status: formData.get("publish") === "on" ? "PUBLISHED" : "DRAFT",
  };
}

export async function createArticleAction(formData: FormData) {
  const ctx = await requireStaff();
  const parsed = articleSchema.safeParse(readArticle(formData));
  if (!parsed.success) redirect("/app/knowledge/new?error=invalid");

  const article = await createArticle(ctx.organizationId, ctx.session.user.id, {
    ...parsed.data,
    status: parsed.data.status as ArticleStatus,
  });
  revalidatePath("/app/knowledge");
  redirect(`/app/knowledge/${article.id}`);
}

export async function updateArticleAction(formData: FormData) {
  const ctx = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const parsed = articleSchema.safeParse(readArticle(formData));
  if (!isUuid(id) || !parsed.success) redirect(`/app/knowledge/${id}?error=invalid`);

  await updateArticle(ctx.organizationId, id, {
    ...parsed.data,
    status: parsed.data.status as ArticleStatus,
  });
  revalidatePath("/app/knowledge");
  revalidatePath(`/app/knowledge/${id}`);
  redirect(`/app/knowledge/${id}?saved=1`);
}

export async function toggleArticleStatusAction(formData: FormData) {
  const ctx = await requireStaff();
  const parsed = parseForm(
    z.object({
      id: uuidSchema,
      status: z.enum(["DRAFT", "PUBLISHED"]).catch("DRAFT"),
    }),
    formData,
  );
  if (!parsed.success) return;

  await setArticleStatus(ctx.organizationId, parsed.data.id, parsed.data.status as ArticleStatus);
  revalidatePath("/app/knowledge");
  revalidatePath(`/app/knowledge/${parsed.data.id}`);
}

export async function deleteArticleAction(formData: FormData) {
  const ctx = await requireStaff();
  const parsed = parseForm(z.object({ id: uuidSchema }), formData);
  if (!parsed.success) redirect("/app/knowledge?error=invalid");

  await deleteArticle(ctx.organizationId, parsed.data.id).catch(() => {});
  revalidatePath("/app/knowledge");
  redirect("/app/knowledge?deleted=1");
}
