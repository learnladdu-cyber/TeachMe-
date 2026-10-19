export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "org";
}

export async function uniqueSlug(
  desired: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(desired);
  let candidate = base;
  let n = 1;
  while (await exists(candidate)) {
    candidate = `${base}-${++n}`;
  }
  return candidate;
}
