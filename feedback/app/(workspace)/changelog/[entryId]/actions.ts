"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/session";
import {
  linkPostToChangelogEntry,
  publishChangelogEntry,
  unlinkPostFromChangelogEntry,
  updateChangelogDraft,
} from "@/lib/changelog/data";
import { getBoardForOrganization } from "@/lib/feedback/data";
import { saveChangelogDraftSchema } from "@/lib/validation/changelog";

export interface FormState {
  error?: string;
}

async function revalidateChangelogPaths(organizationId: string, entryId: string) {
  revalidatePath("/changelog");
  revalidatePath(`/changelog/${entryId}`);
  const board = await getBoardForOrganization(organizationId);
  if (board) {
    revalidatePath(`/b/${board.slug}/changelog`);
  }
}

export async function updateDraftAction(
  entryId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { organization } = await requireActiveOrganization();

  const parsed = saveChangelogDraftSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something went wrong." };
  }

  try {
    await updateChangelogDraft({
      organizationId: organization.id,
      entryId,
      title: parsed.data.title,
      body: parsed.data.body,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't save. Please try again." };
  }

  await revalidateChangelogPaths(organization.id, entryId);
  return {};
}

export async function linkPostAction(
  entryId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { organization } = await requireActiveOrganization();
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { error: "Missing request." };
  }

  try {
    await linkPostToChangelogEntry({ organizationId: organization.id, entryId, postId });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't link that request." };
  }

  await revalidateChangelogPaths(organization.id, entryId);
  return {};
}

export async function unlinkPostAction(
  entryId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { organization } = await requireActiveOrganization();
  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) {
    return { error: "Missing request." };
  }

  try {
    await unlinkPostFromChangelogEntry({ organizationId: organization.id, entryId, postId });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't unlink that request." };
  }

  await revalidateChangelogPaths(organization.id, entryId);
  return {};
}

export async function publishAction(
  entryId: string,
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { organization } = await requireActiveOrganization();

  try {
    await publishChangelogEntry({ organizationId: organization.id, entryId });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't publish. Please try again." };
  }

  await revalidateChangelogPaths(organization.id, entryId);
  return {};
}
