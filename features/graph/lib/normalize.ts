const TYPE_ALIASES: Record<string, string> = {
  person: "person",
  people: "person",
  individual: "person",
  organization: "organization",
  organisation: "organization",
  company: "organization",
  org: "organization",
  corp: "organization",
  corporation: "organization",
  location: "location",
  place: "location",
  city: "location",
  country: "location",
  date: "date",
  amount: "amount",
  money: "amount",
  currency: "amount",
  other: "other",
};

/** Normalize entity type casing to lowercase canonical labels. */
export function normalizeEntityType(raw: string): string {
  const key = raw.trim().toLowerCase();
  return TYPE_ALIASES[key] ?? (key.replace(/\s+/g, "_").slice(0, 64) || "other");
}

export function normalizeEntityName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function entityMergeKey(name: string, type: string): string {
  return `${normalizeEntityType(type)}::${normalizeEntityName(name).toLowerCase()}`;
}
