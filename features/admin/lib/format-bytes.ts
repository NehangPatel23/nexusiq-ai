/** Format bytes for UI / tests (safe for client bundles). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = -1;
  do {
    value /= 1024;
    i += 1;
  } while (value >= 1024 && i < units.length - 1);
  const rounded = parseFloat(value.toFixed(value >= 10 ? 0 : 1));
  return `${rounded} ${units[i]}`;
}
