import { randomUUID } from "node:crypto";

import type { EmailMessage, EmailSendResult, EmailTransport } from "@/lib/email/transport";

/**
 * A deterministic, in-memory stand-in for `ResendTransport` — this
 * project's testing standard forbids calling a real external service
 * from CI/tests (`SECURITY.md`), so `publishChangelogEntry()` accepts
 * an injectable `EmailTransport` and every integration test that
 * exercises publishing supplies one of these instead of the real
 * one. `failNextSends` lets a test simulate the provider itself
 * rejecting a send, to prove the `failed` delivery-state path without
 * needing a real outage.
 */
export class FakeEmailTransport implements EmailTransport {
  readonly sent: EmailMessage[] = [];
  private failNext = 0;
  private failureMessage = "Simulated provider failure";

  failNextSends(count: number, message = "Simulated provider failure"): void {
    this.failNext = count;
    this.failureMessage = message;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error(this.failureMessage);
    }
    this.sent.push(message);
    return { id: randomUUID() };
  }
}
