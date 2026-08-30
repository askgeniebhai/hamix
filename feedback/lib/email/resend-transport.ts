import "server-only";

import { Resend } from "resend";

import type { EmailMessage, EmailSendResult, EmailTransport } from "@/lib/email/transport";

/** The production `EmailTransport` — a thin wrapper over the official `resend` SDK, never a hand-rolled HTTP call. */
export class ResendTransport implements EmailTransport {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const result = await this.client.emails.send(
      {
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (result.error) {
      throw new Error(result.error.message);
    }
    if (!result.data) {
      throw new Error("Resend returned no data and no error");
    }
    return { id: result.data.id };
  }
}
