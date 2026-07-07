import { describe, expect, it } from "vitest";

import { BCRYPT_COST, hashPassword, verifyPassword } from "../lib/password";

describe("password helpers", () => {
  it("uses bcrypt cost factor 12", () => {
    expect(BCRYPT_COST).toBe(12);
  });

  it("hashes and verifies passwords", async () => {
    const password = "SecurePass123";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
