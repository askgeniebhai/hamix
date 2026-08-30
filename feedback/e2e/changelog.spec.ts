import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  addComment,
  openPostDetail,
  signUpWithWorkspace,
  slugify,
  submitFeedback,
  unique,
} from "./helpers";

/** Mirrors `e2e/status.spec.ts`/`e2e/roadmap.spec.ts`'s hardened helper — waits for the mutation's own network response, not just the optimistic UI label, so a navigation right after doesn't outrace the database write (`DECISIONS.md` D7-003). */
async function changeStatus(page: Page, label: string) {
  const mutation = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.ok(),
  );
  await page.getByRole("combobox", { name: "Change status" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await mutation;
}

test.describe("changelog — close the loop", () => {
  test("submit -> follow -> vote/comment -> admin completes -> create changelog -> link -> publish -> public changelog shows it -> exactly one delivery record", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "ChangelogFlow",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Changelog flow request ${id}`;
    const customerEmail = `changelog-customer-${id}@example.com`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "Walks the full close-the-loop flow.",
      name: "Changelog Customer",
      email: customerEmail,
    });

    // Follow updates on the request — an explicit, separate action.
    await openPostDetail(page, title);
    await page.getByRole("button", { name: "Follow updates" }).click();
    await expect(page.getByRole("button", { name: "Stop following" })).toBeVisible();

    // Vote and comment as the same (now-identified) participant.
    await page.getByRole("button", { name: new RegExp(`^Vote for “${title}”`) }).click();
    await addComment(page, "Adding more detail as the original requester.");

    // Admin marks it Complete.
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Complete");

    // Create a changelog draft.
    await page.goto("/changelog");
    await page.getByRole("link", { name: "New entry" }).first().click();
    const entryTitle = `Changelog entry ${id}`;
    await page.getByLabel("Title").fill(entryTitle);
    await page
      .getByLabel("What shipped")
      .fill(`We shipped "${title}" — thanks for the request!`);
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("heading", { name: entryTitle, level: 1 }).waitFor();

    // Link the completed request.
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    const linkResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page.getByRole("button", { name: "Link" }).click();
    await linkResponse;
    await expect(page.getByRole("button", { name: "Unlink" })).toBeVisible();

    // Publish.
    const publishResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page.getByRole("button", { name: "Publish" }).click();
    await publishResponse;
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    // Exactly one delivery record was created for the one follower —
    // whether it reads "notified" or "failed" depends on whether this
    // environment has RESEND_API_KEY configured (it doesn't, in CI),
    // but the count must be exactly one either way, and never silently
    // absent.
    const deliveryText = await page.getByText(/notified/).textContent();
    expect(deliveryText).toMatch(/^(1 notified|0 notified, 1 failed)/);

    // Public changelog shows the published release, with the linked
    // request, and refresh persists it.
    await page.goto(`/b/${slug}/changelog`);
    await expect(page.getByRole("heading", { name: entryTitle, level: 2 })).toBeVisible();
    await expect(page.getByText(`We shipped "${title}"`)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: entryTitle, level: 2 })).toBeVisible();

    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  });
});

test.describe("changelog security / tenant isolation", () => {
  test("a draft entry is never visible on the public changelog", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "ChangelogDraft",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const draftTitle = `Unpublished draft ${id}`;

    await page.goto("/changelog");
    await page.getByRole("link", { name: "New entry" }).first().click();
    await page.getByLabel("Title").fill(draftTitle);
    await page.getByLabel("What shipped").fill("This draft must never appear publicly.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("heading", { name: draftTitle, level: 1 }).waitFor();

    await page.goto(`/b/${slug}/changelog`);
    await expect(page.getByText(draftTitle)).toHaveCount(0);
  });

  test("unauthenticated visitors cannot reach the admin changelog", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/changelog");
    await expect(page).toHaveURL(/\/login/);
  });

  test("public changelog exposes no admin controls", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "ChangelogNoAdmin",
    });
    const slug = slugify(workspaceName);

    await page.context().clearCookies();
    await page.goto(`/b/${slug}/changelog`);
    await expect(page.getByRole("link", { name: "New entry" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
  });

  test("an unknown board's changelog behaves safely — no data leak, generic not-found UI", async ({
    page,
  }) => {
    await page.goto("/b/this-board-does-not-exist/changelog");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("an unrecognized or already-used unsubscribe link is handled gracefully", async ({
    page,
  }) => {
    await page.goto("/unsubscribe/not-a-real-token");
    await expect(page.getByRole("heading", { name: "Nothing to unfollow" })).toBeVisible();
  });
});

test.describe("changelog follow / unfollow", () => {
  test("stop following removes the subscription and the control reflects it", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "ChangelogFollow",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Follow toggle request ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "Checks the follow/unfollow toggle.",
      name: "Follow Tester",
      email: `follow-toggle-${id}@example.com`,
    });

    await openPostDetail(page, title);
    await page.getByRole("button", { name: "Follow updates" }).click();
    await expect(page.getByRole("button", { name: "Stop following" })).toBeVisible();

    await page.getByRole("button", { name: "Stop following" }).click();
    await expect(page.getByRole("button", { name: "Follow updates" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Follow updates" })).toBeVisible();
  });
});

test.describe("changelog accessibility & responsiveness", () => {
  test("admin changelog list and entry editor have no automatically detectable accessibility violations, and no horizontal overflow", async ({
    page,
  }) => {
    await signUpWithWorkspace(page, { namePrefix: "ChangelogA11yAdmin" });

    await page.goto("/changelog");
    await page.getByRole("heading", { name: "Changelog", level: 1 }).waitFor();
    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    await page.getByRole("link", { name: "New entry" }).first().click();
    await page.getByRole("heading", { name: "New entry", level: 1 }).waitFor();
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test("public changelog has no automatically detectable accessibility violations, and no horizontal overflow", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "ChangelogA11yPublic",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `A11y changelog request ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "Checked for automated accessibility violations.",
      name: "A11y Tester",
      email: `a11y-changelog-${id}@example.com`,
    });
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Complete");

    await page.goto("/changelog");
    await page.getByRole("link", { name: "New entry" }).first().click();
    const entryTitle = `A11y changelog entry ${id}`;
    await page.getByLabel("Title").fill(entryTitle);
    await page.getByLabel("What shipped").fill("Checked for automated accessibility violations.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("heading", { name: entryTitle, level: 1 }).waitFor();
    const linkResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page.getByRole("button", { name: "Link" }).click();
    await linkResponse;
    await expect(page.getByRole("button", { name: "Unlink" })).toBeVisible();
    const publishResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page.getByRole("button", { name: "Publish" }).click();
    await publishResponse;

    await page.goto(`/b/${slug}/changelog`);
    await page.getByRole("heading", { name: entryTitle, level: 2 }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
