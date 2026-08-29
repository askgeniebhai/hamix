import { describe, expect, it } from "vitest";

import {
  participantIdentitySchema,
  submitFeedbackSchema,
} from "@/lib/validation/feedback";

const validSubmission = {
  title: "Dark mode please",
  description: "Would love a dark mode toggle in settings.",
  name: "Jane Customer",
  email: "jane@example.com",
};

describe("submitFeedbackSchema", () => {
  it("accepts a valid submission", () => {
    expect(submitFeedbackSchema.safeParse(validSubmission).success).toBe(true);
  });

  it("rejects a title shorter than 3 characters", () => {
    const result = submitFeedbackSchema.safeParse({
      ...validSubmission,
      title: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a description shorter than 10 characters", () => {
    const result = submitFeedbackSchema.safeParse({
      ...validSubmission,
      description: "too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title longer than 140 characters", () => {
    const result = submitFeedbackSchema.safeParse({
      ...validSubmission,
      title: "a".repeat(141),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a description longer than 2000 characters", () => {
    const result = submitFeedbackSchema.safeParse({
      ...validSubmission,
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = submitFeedbackSchema.safeParse({
      ...validSubmission,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing name", () => {
    const result = submitFeedbackSchema.safeParse({
      ...validSubmission,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from title and description", () => {
    const result = submitFeedbackSchema.safeParse({
      ...validSubmission,
      title: "  Dark mode please  ",
      description: "  Would love a dark mode toggle in settings.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Dark mode please");
      expect(result.data.description).toBe(
        "Would love a dark mode toggle in settings.",
      );
    }
  });
});

describe("participantIdentitySchema", () => {
  it("accepts a valid name and email", () => {
    const result = participantIdentitySchema.safeParse({
      name: "Jane Customer",
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = participantIdentitySchema.safeParse({
      name: "Jane Customer",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = participantIdentitySchema.safeParse({
      name: "  ",
      email: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });
});
