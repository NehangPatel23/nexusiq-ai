import { prisma } from "@/lib/db";

import { slugifyName } from "@/features/organizations/lib/slug";

export { slugifyName };

export async function generateUniqueWorkspaceSlug(
  organizationId: string,
  name: string,
  excludeWorkspaceId?: string,
): Promise<string> {
  const base = slugifyName(name) || "workspace";
  let slug = base;
  let counter = 1;

  while (
    await prisma.workspace.findFirst({
      where: {
        organizationId,
        slug,
        ...(excludeWorkspaceId ? { id: { not: excludeWorkspaceId } } : {}),
      },
    })
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function isWorkspaceSlugAvailable(
  organizationId: string,
  slug: string,
  excludeWorkspaceId?: string,
): Promise<boolean> {
  const normalized = slugifyName(slug);
  if (!normalized) {
    return false;
  }

  const existing = await prisma.workspace.findFirst({
    where: {
      organizationId,
      slug: normalized,
      ...(excludeWorkspaceId ? { id: { not: excludeWorkspaceId } } : {}),
    },
  });

  return !existing;
}
