import type { Page } from "@playwright/test";

import { slugify } from "../lib/validation/auth";

export { slugify };

export const PASSWORD = "correcthorsebatterystaple";

export function unique(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function signUp(
  page: Page,
  { name, email, password }: { name: string; email: string; password: string },
) {
  await page.goto("/signup");
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function createWorkspace(page: Page, name: string) {
  await page.getByRole("heading", { name: "Name your workspace" }).waitFor();
  await page.locator("#name").fill(name);
  await page.getByRole("button", { name: "Create workspace" }).click();
  // Wait for the dashboard to actually finish rendering (not just the
  // navigation to start) so callers never observe a transitional
  // loading state (e.g. root loading.tsx's skeleton, which has no
  // landmarks/h1 of its own and would make an immediately-following
  // accessibility scan flaky).
  await page.getByRole("heading", { name, level: 1 }).waitFor();
}

export async function logOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
}

export async function submitFeedback(
  page: Page,
  input: { title: string; description: string; name: string; email: string },
) {
  // The submission form is collapsed behind a "Share feedback" toggle
  // by default (the request list is shown first) — open it if it
  // isn't already. `isVisible()` doesn't wait, so it can't tell
  // "not rendered yet" from "already open, no toggle to click" right
  // after a fresh navigation; a short, tolerant `click()` (which does
  // auto-wait) does, without blocking indefinitely when the toggle
  // genuinely isn't there.
  try {
    await page.getByRole("button", { name: "Share feedback" }).click({ timeout: 3000 });
  } catch {
    // Already open — proceed straight to filling the form.
  }
  await page.locator("#title").fill(input.title);
  await page.locator("#description").fill(input.description);
  await page.locator("#name").fill(input.name);
  await page.locator("#email").fill(input.email);
  await page.getByRole("button", { name: "Submit feedback" }).click();
  await page.getByText(input.title).first().waitFor();
}

/** Clicks a post's title link on a feedback list (public board or admin) and waits for its detail page. */
export async function openPostDetail(page: Page, title: string) {
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.getByRole("heading", { name: title, level: 1 }).waitFor();
  // On a client-side transition, `document.title` (set from the route's
  // metadata) can lag a tick behind the visible heading — wait for it
  // too, so an immediately-following accessibility scan doesn't
  // observe a transient empty <title>.
  await page.waitForFunction((t) => document.title.includes(t), title);
}

export async function addComment(
  page: Page,
  body: string,
  buttonName: "Post comment" | "Post reply" = "Post comment",
) {
  await page.locator("textarea[name=body]").fill(body);
  await page.getByRole("button", { name: buttonName }).click();
  await page.getByText(body).first().waitFor();
}

/** Signs up a fresh unique user and creates a workspace, landing on /dashboard. */
export async function signUpWithWorkspace(
  page: Page,
  { namePrefix }: { namePrefix: string },
) {
  const id = unique();
  const email = `${namePrefix}-${id}@example.com`.toLowerCase();
  const workspaceName = `${namePrefix} Workspace ${id}`;
  await signUp(page, { name: "Test User", email, password: PASSWORD });
  await createWorkspace(page, workspaceName);
  return { id, email, workspaceName };
}
