import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit config for `npm run db:generate` / `db:push` / `db:studio`.
 * Points at an intentionally empty schema (see lib/db/schema.ts) — the
 * domain schema is introduced in a future milestone.
 */
export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
