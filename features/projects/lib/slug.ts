import { prisma } from "@/lib/db";

import { slugifyName } from "@/features/organizations/lib/slug";

export { slugifyName };

export async function generateUniqueProjectSlug(
  workspaceId: string,
  name: string,
  excludeProjectId?: string,
): Promise<string> {
  const base = slugifyName(name) || "project";
  let slug = base;
  let counter = 1;

  while (
    await prisma.project.findFirst({
      where: {
        workspaceId,
        slug,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
      },
    })
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function isProjectSlugAvailable(
  workspaceId: string,
  slug: string,
  excludeProjectId?: string,
): Promise<boolean> {
  const normalized = slugifyName(slug);
  if (!normalized) {
    return false;
  }

  const existing = await prisma.project.findFirst({
    where: {
      workspaceId,
      slug: normalized,
      ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
    },
  });

  return !existing;
}
