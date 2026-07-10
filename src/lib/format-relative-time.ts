export function formatRelativeTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const diffMs = value.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSec < 60) {
    return formatter.format(Math.round(diffSec), "second");
  }

  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return formatter.format(diffMin, "minute");
  }

  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) {
    return formatter.format(diffHour, "hour");
  }

  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) {
    return formatter.format(diffDay, "day");
  }

  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) {
    return formatter.format(diffMonth, "month");
  }

  const diffYear = Math.round(diffMonth / 12);
  return formatter.format(diffYear, "year");
}
