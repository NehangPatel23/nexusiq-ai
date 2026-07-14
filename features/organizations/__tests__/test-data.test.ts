import { describe, expect, it } from "vitest";

import { excludeTestData, isTestUserEmail } from "../../../scripts/lib/test-data";

describe("test data helpers", () => {
  it("detects e2e and integration emails", () => {
    expect(isTestUserEmail("e2e-123@test.com")).toBe(true);
    expect(isTestUserEmail("org-owner-e2e-1@test.com")).toBe(true);
    expect(isTestUserEmail("org-owner-1@example.com")).toBe(true);
    expect(isTestUserEmail("judge@acme.com")).toBe(false);
  });

  it("excludes test users from sync snapshots", () => {
    const filtered = excludeTestData({
      users: [
        {
          id: "u1",
          email: "e2e-1@test.com",
          name: "E2E",
          passwordHash: "x",
          image: null,
          theme: "dark",
          notificationPrefs: null,
          emailVerified: null,
          deletedAt: null,
          purgeAfter: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "u2",
          email: "real@acme.com",
          name: "Real",
          passwordHash: "x",
          image: null,
          theme: "dark",
          notificationPrefs: null,
          emailVerified: null,
          deletedAt: null,
          purgeAfter: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      passwordResetTokens: [],
      organizations: [
        {
          id: "o1",
          name: "Test Org",
          slug: "test-org",
          description: null,
          logoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          purgeAfter: null,
        },
        {
          id: "o2",
          name: "Real Org",
          slug: "real-org",
          description: null,
          logoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          purgeAfter: null,
        },
      ],
      organizationMembers: [
        {
          id: "m1",
          organizationId: "o1",
          userId: "u1",
          role: "OWNER",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "m2",
          organizationId: "o2",
          userId: "u2",
          role: "OWNER",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      teams: [],
      teamMembers: [],
      workspaces: [],
      projects: [],
      invites: [],
      notifications: [],
    });

    expect(filtered.users).toHaveLength(1);
    expect(filtered.users[0]?.email).toBe("real@acme.com");
    expect(filtered.organizations).toHaveLength(1);
    expect(filtered.organizations[0]?.slug).toBe("real-org");
  });
});
