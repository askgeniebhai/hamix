import { describe, expect, it } from "vitest";

import { POST_STATUSES, postStatusSchema } from "@/lib/feedback/status";
import { updateStatusSchema } from "@/lib/validation/feedback";

describe("postStatusSchema", () => {
  it.each(POST_STATUSES)("accepts the valid status %s", (status) => {
    const result = postStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status value", () => {
    const result = postStatusSchema.safeParse("archived");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = postStatusSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a non-string value", () => {
    const result = postStatusSchema.safeParse(123);
    expect(result.success).toBe(false);
  });

  it("is case-sensitive — rejects a differently-cased valid value", () => {
    const result = postStatusSchema.safeParse("Open");
    expect(result.success).toBe(false);
  });
});

describe("updateStatusSchema", () => {
  it("accepts a valid status field", () => {
    const result = updateStatusSchema.safeParse({ status: "under_review" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status field", () => {
    const result = updateStatusSchema.safeParse({ status: "not-a-status" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing status field", () => {
    const result = updateStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
