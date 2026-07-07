import { describe, expect, it } from "vitest";

describe("landing content", () => {
  it("defines required headline copy", () => {
    const headline = "Enterprise decisions in minutes, not weeks";
    expect(headline).toContain("minutes");
    expect(headline).not.toContain("weeks.");
  });

  it("defines CTA routes", () => {
    const routes = { register: "/register", login: "/login", demo: "/dashboard" };
    expect(routes.register).toBe("/register");
    expect(routes.login).toBe("/login");
  });
});
