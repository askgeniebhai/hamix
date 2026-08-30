"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/session";
import { createInternalComment } from "@/lib/feedback/data";
import { addCommentSchema } from "@/lib/validation/feedback";

export interface FormState {
  error?: string;
}

/**
 * A public team reply, posted by an authenticated workspace member.
 * `requireActiveOrganization()` is the entire "is this caller allowed
 * to reply as this organization's team" check — it re-verifies the
 * session's active organization against the `member` table (never
 * trusting the session cookie alone, per `lib/auth/session.ts`), so a
 * non-member can never post as this organization's team even if they
 * somehow knew a valid `postId`. `authorUserId` always comes from
 * that verified session, never from `formData`.
 */
export async function addInternalReplyAction(
  postId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, organization } = await requireActiveOrganization();

  const parsed = addCommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something went wrong." };
  }

  try {
    await createInternalComment({
      organizationId: organization.id,
      postId,
      authorUserId: session.user.id,
      body: parsed.data.body,
    });
  } catch {
    return { error: "Couldn't post that reply. Please try again." };
  }

  revalidatePath(`/feedback/${postId}`);
  return {};
}
