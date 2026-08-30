"use server";

import { revalidatePath } from "next/cache";

import { castVote, createPost, getBoardBySlug, removeVote } from "@/lib/feedback/data";
import { getParticipant, identifyParticipant } from "@/lib/feedback/participant";
import { isParticipantLimitError, PARTICIPANT_LIMIT_PUBLIC_MESSAGE } from "@/lib/billing/usage";
import {
  participantIdentitySchema,
  submitFeedbackSchema,
} from "@/lib/validation/feedback";

export interface FormState {
  error?: string;
}

const genericError = "Something went wrong. Please try again.";

export async function submitFeedbackAction(
  boardSlug: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = submitFeedbackSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? genericError };
  }

  const board = await getBoardBySlug(boardSlug);
  if (!board) {
    return { error: "This feedback board doesn't exist." };
  }

  const me = await identifyParticipant(board.organizationId, {
    name: parsed.data.name,
    email: parsed.data.email,
  });
  try {
    await createPost({
      organizationId: board.organizationId,
      boardId: board.id,
      participantId: me.id,
      title: parsed.data.title,
      description: parsed.data.description,
    });
  } catch (error) {
    return { error: isParticipantLimitError(error) ? PARTICIPANT_LIMIT_PUBLIC_MESSAGE : genericError };
  }

  revalidatePath(`/b/${boardSlug}`);
  return {};
}

/**
 * Casts a vote for `postId` on the board identified by `boardSlug`.
 * If the browser hasn't identified a participant yet, `formData` must
 * carry `name`/`email` (the vote control's inline identify step) —
 * the resulting identity is then reused for every later vote on this
 * device. `boardSlug`/`postId` are bound server-side by the caller
 * (`VoteControl`), never read from client-controlled form fields, and
 * `castVote` itself re-verifies the post belongs to this board's
 * organization before recording anything.
 */
export async function voteAction(
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
    const parsed = participantIdentitySchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? genericError };
    }
    me = await identifyParticipant(board.organizationId, parsed.data);
  }

  try {
    await castVote({
      organizationId: board.organizationId,
      postId,
      participantId: me.id,
    });
  } catch (error) {
    return { error: isParticipantLimitError(error) ? PARTICIPANT_LIMIT_PUBLIC_MESSAGE : genericError };
  }

  revalidatePath(`/b/${boardSlug}`);
  return {};
}

export async function unvoteAction(
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

  await removeVote({
    organizationId: board.organizationId,
    postId,
    participantId: me.id,
  });

  revalidatePath(`/b/${boardSlug}`);
  return {};
}
