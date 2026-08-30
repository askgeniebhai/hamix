"use server";

import { revalidatePath } from "next/cache";

import {
  createExternalComment,
  getBoardBySlug,
  subscribeToPost,
  unsubscribeFromPost,
} from "@/lib/feedback/data";
import { getParticipant, identifyParticipant } from "@/lib/feedback/participant";
import {
  addCommentSchema,
  participantIdentitySchema,
} from "@/lib/validation/feedback";

export interface FormState {
  error?: string;
}

const genericError = "Something went wrong. Please try again.";

/**
 * A public reply from an external feedback participant. Mirrors
 * `app/b/[slug]/actions.ts`'s `voteAction`: if the browser hasn't
 * identified a participant yet, `formData` must carry `name`/`email`
 * (the comment form's inline identify step); either way the resulting
 * identity — never a client-supplied id — is what
 * `createExternalComment` attaches the comment to, and it re-verifies
 * the post belongs to this board's organization before writing
 * anything.
 */
export async function addExternalCommentAction(
  boardSlug: string,
  postId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const board = await getBoardBySlug(boardSlug);
  if (!board) {
    return { error: "This feedback board doesn't exist." };
  }

  const parsedBody = addCommentSchema.safeParse({ body: formData.get("body") });
  if (!parsedBody.success) {
    return { error: parsedBody.error.issues[0]?.message ?? genericError };
  }

  let me = await getParticipant(board.organizationId);
  if (!me) {
    const parsedIdentity = participantIdentitySchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
    });
    if (!parsedIdentity.success) {
      return { error: parsedIdentity.error.issues[0]?.message ?? genericError };
    }
    me = await identifyParticipant(board.organizationId, parsedIdentity.data);
  }

  try {
    await createExternalComment({
      organizationId: board.organizationId,
      postId,
      participantId: me.id,
      body: parsedBody.data.body,
    });
  } catch {
    return { error: genericError };
  }

  revalidatePath(`/b/${boardSlug}/p/${postId}`);
  return {};
}

/**
 * The *only* code path that creates a `post_subscription` row — a
 * participant explicitly clicking "Follow updates." If the browser
 * hasn't identified a participant yet, `formData` must carry
 * `name`/`email` (the same inline-identify step vote/comment already
 * use); either way, submitting/voting/commenting elsewhere never
 * subscribes anyone by itself (M8's "do not silently fabricate
 * marketing consent," `DECISIONS.md` D8-003).
 */
export async function followAction(
  boardSlug: string,
  postId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const board = await getBoardBySlug(boardSlug);
  if (!board) {
    return { error: "This feedback board doesn't exist." };
  }

  let me = await getParticipant(board.organizationId);
  if (!me) {
    const parsedIdentity = participantIdentitySchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
    });
    if (!parsedIdentity.success) {
      return { error: parsedIdentity.error.issues[0]?.message ?? genericError };
    }
    me = await identifyParticipant(board.organizationId, parsedIdentity.data);
  }

  try {
    await subscribeToPost({ organizationId: board.organizationId, postId, participantId: me.id });
  } catch {
    return { error: genericError };
  }

  revalidatePath(`/b/${boardSlug}/p/${postId}`);
  return {};
}

export async function unfollowAction(
  boardSlug: string,
  postId: string,
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const board = await getBoardBySlug(boardSlug);
  if (!board) {
    return { error: "This feedback board doesn't exist." };
  }

  const me = await getParticipant(board.organizationId);
  if (!me) {
    return {};
  }

  await unsubscribeFromPost({ organizationId: board.organizationId, postId, participantId: me.id });

  revalidatePath(`/b/${boardSlug}/p/${postId}`);
  return {};
}
