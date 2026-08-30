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
    await expect(page).toHaveTitle(/Feedback/);
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Feedback" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Understand what your customers actually need.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("sends unauthenticated visitors to log in when opening the workspace", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Open workspace" })
      .click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await page.goto("/");
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
  test("renders navigation and empty-state foundation", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "ShellSmoke",
    });
    await expect(
      page.getByRole("heading", { name: `${workspaceName} is ready` }),
    ).toBeVisible();
    await expect(
      page.getByText("Roadmap and changelog tools will appear here"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View feedback" })).toBeVisible();
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
