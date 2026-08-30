/**
 * The boundary between this app's notification logic and however an
 * email actually gets delivered. `lib/changelog/data.ts`'s
 * `publishChangelogEntry()` depends only on this interface — never on
 * `resend` directly — so tests can supply a deterministic fake
 * (`tests/support/fake-email-transport.ts`) instead of hitting a real
 * provider, and production can swap providers without touching
 * notification logic (`DECISIONS.md` D8-002).
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Passed through to the provider as an idempotency key where
   * supported (Resend: the `Idempotency-Key` header) — a second send
   * with the same key is a no-op on the provider's side too, defense
   * in depth alongside this app's own database-level uniqueness.
   */
  idempotencyKey: string;
}

export interface EmailSendResult {
  id: string;
}

/** Thrown by a transport when a send cannot even be attempted (e.g. not configured) — distinct from the provider rejecting the send itself. */
export class EmailTransportUnavailableError extends Error {}

export interface EmailTransport {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
