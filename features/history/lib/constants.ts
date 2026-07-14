/** Grace period before hard-purge of tombstoned users / orgs. */
export const DELETION_GRACE_MS = 24 * 60 * 60 * 1000;

export function purgeAfterFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + DELETION_GRACE_MS);
}

export function isWithinGrace(purgeAfter: Date | null | undefined, now: Date = new Date()): boolean {
  if (!purgeAfter) return false;
  return purgeAfter.getTime() > now.getTime();
}
