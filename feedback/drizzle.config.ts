import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit config for `npm run db:generate` / `db:push` / `db:studio`.
 * `./drizzle` holds the committed migration history (generated from
 * lib/db/schema.ts: the Better Auth core + organization schema, plus
 * the Board/Post/Vote/Participant domain schema added in M4) — it is
 * real, permanent source, not a build artifact; never delete it as
 * part of "cleanup".
 */
export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
