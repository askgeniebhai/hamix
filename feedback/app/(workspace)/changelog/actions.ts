"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireActiveOrganization } from "@/lib/auth/session";
import { createChangelogDraft } from "@/lib/changelog/data";
import { saveChangelogDraftSchema } from "@/lib/validation/changelog";

export interface FormState {
  error?: string;
}

/**
 * Creates a new draft from real, validated content — never a blank
 * placeholder row a link/publish step could act on before anyone
 * wrote anything. `createdByUserId` always comes from the verified
 * session, never `formData`.
 */
export async function createDraftAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, organization } = await requireActiveOrganization();

  const parsed = saveChangelogDraftSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something went wrong." };
  }

  const draft = await createChangelogDraft({
    organizationId: organization.id,
    createdByUserId: session.user.id,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  revalidatePath("/changelog");
  redirect(`/changelog/${draft.id}`);
}
