import { z } from "zod";

/** The minimum identity needed to safely attribute a submission or vote to a real person — no other personal information is collected. */
export const participantIdentitySchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email address"),
});

export type ParticipantIdentityInput = z.infer<typeof participantIdentitySchema>;

export const submitFeedbackSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  description: z
    .string()
    .trim()
    .min(10, "Add a bit more detail (at least 10 characters)")
    .max(2000),
  name: participantIdentitySchema.shape.name,
  email: participantIdentitySchema.shape.email,
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
