import { describe, expect, it } from "vitest";

import { changelogBodySchema, changelogTitleSchema, saveChangelogDraftSchema } from "@/lib/validation/changelog";

describe("changelogTitleSchema", () => {
  it("accepts a reasonable title", () => {
    expect(changelogTitleSchema.safeParse("Dark mode is here").success).toBe(true);
  });

  it("rejects a too-short title", () => {
    expect(changelogTitleSchema.safeParse("Hi").success).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(changelogTitleSchema.safeParse("").success).toBe(false);
  });

  it("rejects a title over 140 characters", () => {
    expect(changelogTitleSchema.safeParse("a".repeat(141)).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const result = changelogTitleSchema.safeParse("   Dark mode   ");
    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe("Dark mode");
  });
});

describe("changelogBodySchema", () => {
  it("accepts a reasonable body", () => {
    expect(changelogBodySchema.safeParse("We shipped dark mode across the whole app.").success).toBe(
      true,
    );
  });

  it("rejects a too-short body", () => {
    expect(changelogBodySchema.safeParse("Shipped.").success).toBe(false);
  });

  it("rejects a body over 5000 characters", () => {
    expect(changelogBodySchema.safeParse("a".repeat(5001)).success).toBe(false);
  });
});

describe("saveChangelogDraftSchema", () => {
  it("accepts valid title + body", () => {
    const result = saveChangelogDraftSchema.safeParse({
      title: "Dark mode is here",
      body: "We shipped dark mode across the whole app.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing body", () => {
    const result = saveChangelogDraftSchema.safeParse({ title: "Dark mode is here" });
    expect(result.success).toBe(false);
  });
});
