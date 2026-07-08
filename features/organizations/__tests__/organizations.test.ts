import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { slugifyName } from "../lib/slug";
import {
  getRoleRank,
  hasMinRole,
  ORG_ROLES,
} from "../lib/roles";
import {
  createOrganizationSchema,
  inviteMemberSchema,
  updateOrganizationSchema,
} from "../schemas";

describe("organization schemas", () => {
  it("validates create organization input", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Acme Corp",
      description: "Test org",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short organization names", () => {
    const result = createOrganizationSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("validates update organization input", () => {
    const result = updateOrganizationSchema.safeParse({
      name: "Updated Name",
      description: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects owner role in invites", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "OWNER",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid invite input", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "ANALYST",
    });
    expect(result.success).toBe(true);
  });
});

describe("slugifyName", () => {
  it("converts names to URL-safe slugs", () => {
    expect(slugifyName("Acme Corp & Co.")).toBe("acme-corp-co");
    expect(slugifyName("  My Org  ")).toBe("my-org");
  });

  it("handles empty strings", () => {
    expect(slugifyName("!!!")).toBe("");
  });
});

describe("role hierarchy", () => {
  it("orders roles from viewer to owner", () => {
    expect(getRoleRank("OWNER")).toBeGreaterThan(getRoleRank("ADMIN"));
    expect(getRoleRank("ADMIN")).toBeGreaterThan(getRoleRank("ANALYST"));
    expect(getRoleRank("ANALYST")).toBeGreaterThan(getRoleRank("REVIEWER"));
    expect(getRoleRank("REVIEWER")).toBeGreaterThan(getRoleRank("VIEWER"));
  });

  it("checks minimum role requirements", () => {
    expect(hasMinRole("OWNER", "ADMIN")).toBe(true);
    expect(hasMinRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasMinRole("VIEWER", "ADMIN")).toBe(false);
    expect(hasMinRole("ANALYST", "REVIEWER")).toBe(true);
  });

  it("includes all organization roles", () => {
    expect(ORG_ROLES).toEqual(["OWNER", "ADMIN", "ANALYST", "REVIEWER", "VIEWER"]);
  });
});
