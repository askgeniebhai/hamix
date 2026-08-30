import { z } from "zod";

export const changelogTitleSchema = z
  .string()
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(140);

export const changelogBodySchema = z
  .string()
  .trim()
  .min(10, "Add a bit more detail (at least 10 characters)")
  .max(5000, "Keep it under 5000 characters");

export const saveChangelogDraftSchema = z.object({
  title: changelogTitleSchema,
  body: changelogBodySchema,
});

export type SaveChangelogDraftInput = z.infer<typeof saveChangelogDraftSchema>;
