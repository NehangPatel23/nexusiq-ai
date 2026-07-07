import { describe, expect, it } from "vitest";

import {
  allPasswordRequirementsMet,
  evaluatePasswordRequirements,
  getPasswordStrength,
} from "../lib/password-requirements";

describe("password requirements", () => {
  it("evaluates all requirements for a strong password", () => {
    const results = evaluatePasswordRequirements("SecurePass1");
    expect(results.every((r) => r.met)).toBe(true);
    expect(allPasswordRequirementsMet("SecurePass1")).toBe(true);
  });

  it("flags missing uppercase", () => {
    const results = evaluatePasswordRequirements("password1");
    expect(results.find((r) => r.id === "uppercase")?.met).toBe(false);
  });

  it("flags missing number", () => {
    const results = evaluatePasswordRequirements("PasswordOnly");
    expect(results.find((r) => r.id === "number")?.met).toBe(false);
  });

  it("returns strength tiers", () => {
    expect(getPasswordStrength("")).toBe(0);
    expect(getPasswordStrength("short")).toBe(1);
    expect(getPasswordStrength("!!!!!!!!")).toBe(2);
    expect(getPasswordStrength("Password1")).toBe(4);
  });
});
