import type { ArticleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

export async function listArticles(
  organizationId: string,
  opts: { q?: string; status?: ArticleStatus | "ALL" } = {},
) {
  return prisma.knowledgeArticle.findMany({
    where: {
      organizationId,
      ...(opts.status && opts.status !== "ALL" ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { title: { contains: opts.q, mode: "insensitive" } },
              { body: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function articleStats(organizationId: string) {
  const [all, published, drafts, views] = await Promise.all([
    prisma.knowledgeArticle.count({ where: { organizationId } }),
    prisma.knowledgeArticle.count({ where: { organizationId, status: "PUBLISHED" } }),
    prisma.knowledgeArticle.count({ where: { organizationId, status: "DRAFT" } }),
    prisma.knowledgeArticle.aggregate({ where: { organizationId }, _sum: { views: true } }),
  ]);
  return { all, published, drafts, views: views._sum.views ?? 0 };
}

export async function getArticle(organizationId: string, id: string) {
  return prisma.knowledgeArticle.findFirst({ where: { id, organizationId } });
}

export async function uniqueArticleSlug(organizationId: string, title: string, ignoreId?: string) {
  const base = slugify(title);
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.knowledgeArticle.findFirst({
      where: { organizationId, slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${++n}`;
  }
}

export async function createArticle(
  organizationId: string,
  authorId: string,
  input: { title: string; body: string; category?: string | null; status: ArticleStatus },
) {
  const slug = await uniqueArticleSlug(organizationId, input.title);
  return prisma.knowledgeArticle.create({
    data: {
      organizationId,
      authorId,
      title: input.title,
      body: input.body,
      category: input.category || null,
      slug,
      status: input.status,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    },
  });
}

export async function updateArticle(
  organizationId: string,
  id: string,
  input: { title: string; body: string; category?: string | null; status: ArticleStatus },
) {
  const existing = await getArticle(organizationId, id);
  if (!existing) throw new Error("Article not found");
  const slug =
    existing.title === input.title
      ? existing.slug
      : await uniqueArticleSlug(organizationId, input.title, id);
  return prisma.knowledgeArticle.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      category: input.category || null,
      slug,
      status: input.status,
      publishedAt: input.status === "PUBLISHED" ? existing.publishedAt ?? new Date() : null,
    },
  });
}

export async function setArticleStatus(organizationId: string, id: string, status: ArticleStatus) {
  const existing = await getArticle(organizationId, id);
  if (!existing) throw new Error("Article not found");
  return prisma.knowledgeArticle.update({
    where: { id },
    data: { status, publishedAt: status === "PUBLISHED" ? existing.publishedAt ?? new Date() : null },
  });
}

export async function deleteArticle(organizationId: string, id: string) {
  const existing = await getArticle(organizationId, id);
  if (!existing) throw new Error("Article not found");
  await prisma.knowledgeArticle.delete({ where: { id } });
}
