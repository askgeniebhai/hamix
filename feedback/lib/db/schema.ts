/**
 * Drizzle schema — intentionally empty.
 *
 * M2 wires the database connection foundation only; per MILESTONES.md
 * the domain schema (Organization, User, Board, Post, Vote, ...
 * see docs/M1_ARCHITECTURE_DECISION.md) is introduced in a future,
 * separately authorized milestone. drizzle-kit points at this file so
 * `drizzle.config.ts` is valid from day one, even with no tables yet.
 */
export {};
