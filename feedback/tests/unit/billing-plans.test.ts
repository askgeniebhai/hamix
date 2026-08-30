import { describe, expect, it } from "vitest";

import {
  isEntitledStatus,
  PLAN_TRACKED_PARTICIPANT_LIMIT,
  resolveEffectivePlan,
  trackedParticipantLimitFor,
} from "@/lib/billing/plans";

describe("billing plans", () => {
  it("free and pro have distinct, positive tracked-participant limits, with pro strictly higher", () => {
    expect(PLAN_TRACKED_PARTICIPANT_LIMIT.free).toBe(25);
    expect(PLAN_TRACKED_PARTICIPANT_LIMIT.pro).toBe(100);
    expect(PLAN_TRACKED_PARTICIPANT_LIMIT.pro).toBeGreaterThan(PLAN_TRACKED_PARTICIPANT_LIMIT.free);
  });

  it("trackedParticipantLimitFor reads the same table isEntitledStatus/resolveEffectivePlan rely on", () => {
    expect(trackedParticipantLimitFor("free")).toBe(25);
    expect(trackedParticipantLimitFor("pro")).toBe(100);
  });

  it("only active, trialing, and past_due are entitled statuses", () => {
    expect(isEntitledStatus("active")).toBe(true);
    expect(isEntitledStatus("trialing")).toBe(true);
    expect(isEntitledStatus("past_due")).toBe(true);
    for (const status of ["none", "canceled", "incomplete", "incomplete_expired", "unpaid", "paused"]) {
      expect(isEntitledStatus(status)).toBe(false);
    }
  });

  it("resolveEffectivePlan is pro only when plan is pro AND status is entitled — never plan alone", () => {
    expect(resolveEffectivePlan({ plan: "pro", status: "active" })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "pro", status: "trialing" })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "pro", status: "past_due" })).toBe("pro");
    // The exact scenario a lapsed/canceled subscription must not fake:
    // a `pro` row whose status has moved on is not Pro.
    expect(resolveEffectivePlan({ plan: "pro", status: "canceled" })).toBe("free");
    expect(resolveEffectivePlan({ plan: "pro", status: "incomplete" })).toBe("free");
    expect(resolveEffectivePlan({ plan: "pro", status: "none" })).toBe("free");
    expect(resolveEffectivePlan({ plan: "free", status: "active" })).toBe("free");
  });

  it("resolveEffectivePlan treats a lapsed currentPeriodEnd as no longer entitled, even with a stale active/trialing status", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // The exact gap this guards: a missed cancellation webhook or a
    // renewal that never produced orders/paid leaves `status`
    // stuck "active" past the period it actually paid for.
    expect(resolveEffectivePlan({ plan: "pro", status: "active", currentPeriodEnd: yesterday })).toBe(
      "free",
    );
    expect(resolveEffectivePlan({ plan: "pro", status: "trialing", currentPeriodEnd: yesterday })).toBe(
      "free",
    );
    expect(resolveEffectivePlan({ plan: "pro", status: "active", currentPeriodEnd: tomorrow })).toBe(
      "pro",
    );
    // No period-end recorded at all never lapses this check on its own.
    expect(resolveEffectivePlan({ plan: "pro", status: "active", currentPeriodEnd: null })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "pro", status: "active" })).toBe("pro");
    // past_due is a provider-managed grace window, exempt from the
    // period-end check regardless of how stale currentPeriodEnd is.
    expect(resolveEffectivePlan({ plan: "pro", status: "past_due", currentPeriodEnd: yesterday })).toBe(
      "pro",
    );
  });
});
