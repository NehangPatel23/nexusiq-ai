import { prisma } from "@/lib/db";

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateUniqueOrgSlug(name: string): Promise<string> {
  const base = slugifyName(name) || "organization";
  let slug = base;
  let counter = 1;

  while (
    await prisma.organization.findFirst({
      where: { slug, deletedAt: null },
    })
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}
