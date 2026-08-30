import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { signUpWithWorkspace } from "./helpers";

test.describe("runtime health", () => {
  test("the app responds healthy", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

test.describe("public entry shell", () => {
  test("loads and renders the shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nudge/);
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Nudge" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Turn feedback into what you build next.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simple pricing" }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("Login goes to the login page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Login" })
      .click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Start Free goes to signup", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Start Free" })
      .click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await page.goto("/");
    // Wait for the real hero content (not just navigation) before
    // scanning — the marketing page's home hero is heavier than the
    // old placeholder shell was, and a scan that runs mid-paint can
    // catch a transient state (e.g. no <h1> or empty <title> yet)
    // that was never actually shown to a user — the same class of
    // flake `e2e/helpers.ts`'s `createWorkspace`/`openPostDetail`
    // already guard against.
    await page
      .getByRole("heading", {
        name: "Turn feedback into what you build next.",
      })
      .waitFor();
    await page.waitForFunction(() => document.title.length > 0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("workspace shell (authenticated)", () => {
  test("renders navigation and the real workspace summary", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "ShellSmoke",
    });
    await expect(
      page.getByRole("heading", { name: workspaceName, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your public feedback board" }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Workspace" });
    await expect(nav.getByRole("link", { name: "Feedback", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Changelog", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Billing", exact: true })).toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await signUpWithWorkspace(page, { namePrefix: "ShellA11y" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("has no horizontal overflow", async ({ page }) => {
    await signUpWithWorkspace(page, { namePrefix: "ShellOverflow" });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("not found", () => {
  test("renders a friendly empty state for unknown routes", async ({
    page,
  }) => {
    const res = await page.goto("/this-route-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await page.goto("/this-route-does-not-exist");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
