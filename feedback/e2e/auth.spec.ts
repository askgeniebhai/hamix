import { expect, test } from "@playwright/test";

import {
  PASSWORD,
  createWorkspace,
  logIn,
  logOut,
  signUp,
  signUpWithWorkspace,
  unique,
} from "./helpers";

test.describe("full lifecycle", () => {
  test("signup -> create workspace -> enter workspace -> logout -> protected route rejected -> login again -> workspace persists", async ({
    page,
  }) => {
    const id = unique();
    const email = `lifecycle-${id}@example.com`;
    const workspaceName = `Lifecycle Workspace ${id}`;

    await signUp(page, { name: "Lifecycle User", email, password: PASSWORD });
    await expect(page).toHaveURL(/\/onboarding$/);

    await createWorkspace(page, workspaceName);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: workspaceName, level: 1 }),
    ).toBeVisible();

    await logOut(page);
    await expect(page).toHaveURL(/\/login$/);

    // Protected route rejected once logged out.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await logIn(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);

    // Workspace persists across the logout/login cycle.
    await expect(
      page.getByRole("heading", { name: workspaceName, level: 1 }),
    ).toBeVisible();
  });
});

test.describe("security", () => {
  test("unauthenticated requests to protected routes are rejected", async ({
    page,
  }) => {
    for (const path of ["/dashboard", "/settings", "/onboarding", "/feedback"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("invalid login shows an error and does not authenticate", async ({
    page,
  }) => {
    const { email } = await signUpWithWorkspace(page, {
      namePrefix: "BadLogin",
    });
    await logOut(page);
    await expect(page).toHaveURL(/\/login$/);

    await page.locator("#email").fill(email);
    await page.locator("#password").fill("totally-wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Confirm it never actually authenticated.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("session persists across a page reload", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "Persist",
    });
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: workspaceName, level: 1 }),
    ).toBeVisible();
  });

  test("signup rejects an invalid email and a too-short password", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.locator("#name").fill("Bad Input");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    // Client-side validation kept the user on the page.
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByText(/valid email/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("secrets are never present in page responses", async ({ page }) => {
    const secret = process.env.BETTER_AUTH_SECRET;
    const dbUrl = process.env.DATABASE_URL;

    for (const path of ["/", "/signup", "/login"]) {
      await page.goto(path);
      const html = await page.content();
      if (secret) expect(html).not.toContain(secret);
      if (dbUrl) expect(html).not.toContain(dbUrl);
    }
  });
});

test.describe("tenant isolation", () => {
  test("a user cannot switch into an organization they are not a member of, and never sees its data", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const { workspaceName: orgAName } = await signUpWithWorkspace(pageA, {
      namePrefix: "TenantA",
    });
    await expect(pageA).toHaveURL(/\/dashboard$/);

    const sessionA = await pageA.evaluate(async () => {
      const res = await fetch("/api/auth/get-session");
      return res.json();
    });
    const orgAId: string = sessionA.session.activeOrganizationId;
    expect(orgAId).toBeTruthy();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const { workspaceName: orgBName } = await signUpWithWorkspace(pageB, {
      namePrefix: "TenantB",
    });
    await expect(pageB).toHaveURL(/\/dashboard$/);

    // As user B, attempt to switch the active organization to A's — must
    // be rejected: B is not a member of A.
    const attempt = await pageB.evaluate(async (targetOrgId: string) => {
      const res = await fetch("/api/auth/organization/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: targetOrgId }),
      });
      return { status: res.status };
    }, orgAId);
    expect(attempt.status).toBeGreaterThanOrEqual(400);

    // B's session must still be scoped to B — never A.
    const sessionBAfter = await pageB.evaluate(async () => {
      const res = await fetch("/api/auth/get-session");
      return res.json();
    });
    expect(sessionBAfter.session.activeOrganizationId).not.toBe(orgAId);

    // B's dashboard must never render A's workspace name.
    await pageB.goto("/dashboard");
    await expect(pageB.getByRole("heading", { name: orgAName, level: 1 })).toHaveCount(0);
    await expect(
      pageB.getByRole("heading", { name: orgBName, level: 1 }),
    ).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
