import { describe, expect, it } from "vitest";

import {
  createOrganizationSchema,
  signInSchema,
  signUpSchema,
  slugify,
} from "@/lib/validation/auth";

describe("signUpSchema", () => {
  it("accepts valid input", () => {
    const result = signUpSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correcthorsebatterystaple",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      name: "Ada",
      email: "not-an-email",
      password: "correcthorsebatterystaple",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = signUpSchema.safeParse({
      name: "   ",
      email: "ada@example.com",
      password: "correcthorsebatterystaple",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts valid input", () => {
    const result = signInSchema.safeParse({
      email: "ada@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({
      email: "ada@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createOrganizationSchema", () => {
  it("accepts a valid name and slug", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Acme Inc",
      slug: "acme-inc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a slug with uppercase letters", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Acme Inc",
      slug: "Acme-Inc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with spaces or symbols", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Acme Inc",
      slug: "acme inc!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = createOrganizationSchema.safeParse({
      name: "A",
      slug: "a",
    });
    expect(result.success).toBe(false);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Acme Inc")).toBe("acme-inc");
  });

  it("strips symbols", () => {
    expect(slugify("Acme, Inc.!")).toBe("acme-inc");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugify("  Acme   & Co.  ")).toBe("acme-co");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long)).toHaveLength(60);
  });
});
