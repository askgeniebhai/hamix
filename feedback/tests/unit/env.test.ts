import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("getEnv", () => {
  it("parses valid environment variables", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.BETTER_AUTH_SECRET = "a".repeat(32);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";

    const { getEnv } = await import("@/lib/env");
    const env = getEnv();

    expect(env.DATABASE_URL).toBe("postgresql://user:pass@host/db");
    expect(env.BETTER_AUTH_SECRET).toHaveLength(32);
  });

  it("defaults BETTER_AUTH_URL when unset", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.BETTER_AUTH_SECRET = "a".repeat(32);
    delete process.env.BETTER_AUTH_URL;

    const { getEnv } = await import("@/lib/env");
    expect(getEnv().BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("throws when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    process.env.BETTER_AUTH_SECRET = "a".repeat(32);

    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow();
  });

  it("throws when BETTER_AUTH_SECRET is too short", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.BETTER_AUTH_SECRET = "too-short";

    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow();
  });
});
