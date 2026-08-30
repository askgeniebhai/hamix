"use server";

import { unsubscribeByToken, type SubscribedPost } from "@/lib/feedback/data";

export interface ConfirmUnsubscribeState {
  submitted: boolean;
  result: SubscribedPost | null;
}

/**
 * The only place `unsubscribeByToken` (the deleting one) is called —
 * always from this explicit POST, never from the page's GET render.
 * That's what stops an email security scanner's link-prefetch, or a
 * client pre-rendering the page, from silently unsubscribing the real
 * recipient before they ever open the email (the confirm page renders
 * `previewUnsubscribeByToken`'s read-only result instead).
 */
export async function confirmUnsubscribeAction(
  token: string,
  _prevState: ConfirmUnsubscribeState,
): Promise<ConfirmUnsubscribeState> {
  const result = await unsubscribeByToken(token);
  return { submitted: true, result };
}
