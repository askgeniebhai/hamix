import "server-only";

import { getEnv } from "@/lib/env";
import { ResendTransport } from "@/lib/email/resend-transport";
import {
  EmailTransportUnavailableError,
  type EmailMessage,
  type EmailSendResult,
  type EmailTransport,
} from "@/lib/email/transport";

/**
 * Fails only when a send is actually attempted — never at import or
 * build time. A zero-env production build (`DECISIONS.md` D2-001's
 * standing rule, extended here for email) must keep succeeding even
 * with no `RESEND_API_KEY` set; the failure has to surface at the one
 * point that matters, when `publishChangelogEntry()` tries to use it,
 * so it can record a truthful `failed` delivery instead of silently
 * doing nothing.
 */
class UnconfiguredTransport implements EmailTransport {
  async send(_message: EmailMessage): Promise<EmailSendResult> {
    throw new EmailTransportUnavailableError(
      "Email is not configured (RESEND_API_KEY / EMAIL_FROM_ADDRESS missing).",
    );
  }
}

let cached: EmailTransport | undefined;

/** Lazily resolves the real transport, memoized after the first call — mirrors `lib/db`'s and `lib/env`'s own lazy-construction pattern. */
export function getEmailTransport(): EmailTransport {
  if (!cached) {
    const env = getEnv();
    cached =
      env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS
        ? new ResendTransport(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS)
        : new UnconfiguredTransport();
  }
  return cached;
}
