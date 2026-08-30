import { describe, expect, it } from "vitest";

import { addCommentSchema, commentBodySchema } from "@/lib/validation/feedback";

describe("commentBodySchema", () => {
  it("accepts a normal comment", () => {
    const result = commentBodySchema.safeParse("Any timeline on this?");
    expect(result.success).toBe(true);
  });

  it("rejects an empty comment", () => {
    const result = commentBodySchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only comment", () => {
    const result = commentBodySchema.safeParse("   ");
    expect(result.success).toBe(false);
  });

  it("rejects a comment longer than 2000 characters", () => {
    const result = commentBodySchema.safeParse("a".repeat(2001));
    expect(result.success).toBe(false);
  });

  it("accepts a comment at exactly 2000 characters", () => {
    const result = commentBodySchema.safeParse("a".repeat(2000));
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = commentBodySchema.safeParse("  Hello there  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Hello there");
    }
  });
});

describe("addCommentSchema", () => {
  it("accepts a valid body field", () => {
    const result = addCommentSchema.safeParse({ body: "Looking forward to this." });
    expect(result.success).toBe(true);
  });

  it("rejects a missing body field", () => {
    const result = addCommentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
