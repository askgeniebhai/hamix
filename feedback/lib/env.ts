import { z } from "zod";

/**
 * Server-side environment validation. Only imported by modules that
 * actually need a variable (lib/db, lib/auth) — never by page/layout
 * components — so the public shell renders without requiring a live
 * database or auth secret to exist yet (M2 is foundation only).
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Postgres/Neon connection string)"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Lazily validates and returns process.env, memoized after the first call. */
export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}
