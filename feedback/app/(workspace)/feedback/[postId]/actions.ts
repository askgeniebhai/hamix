"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/session";
import { createInternalComment, getBoardForOrganization, updatePostStatus } from "@/lib/feedback/data";
import { addCommentSchema, updateStatusSchema } from "@/lib/validation/feedback";

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

/**
 * Changes a post's status. `requireActiveOrganization()` establishes
 * "this caller is a verified member of some organization"; the data
 * layer's `updatePostStatus()` independently re-verifies `postId`
 * belongs to *that specific* organization before writing (never the
 * other way around — the organization id always comes from the
 * session, never from `formData`). `status` is validated against the
 * exact five-value enum server-side, so a request naming anything
 * else is rejected here, before it could ever reach the database
 * (which would also reject it, via the `post_status` enum type).
 */
export async function updateStatusAction(
  postId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { organization } = await requireActiveOrganization();

  const parsed = updateStatusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) {
    return { error: "That's not a valid status." };
  }

  try {
    await updatePostStatus({
      organizationId: organization.id,
      postId,
      status: parsed.data.status,
    });
  } catch {
    return { error: "Couldn't update the status. Please try again." };
  }

  revalidatePath(`/feedback/${postId}`);
  revalidatePath("/feedback");
  const board = await getBoardForOrganization(organization.id);
  if (board) {
    revalidatePath(`/b/${board.slug}`);
    revalidatePath(`/b/${board.slug}/p/${postId}`);
  }
  return {};
}
