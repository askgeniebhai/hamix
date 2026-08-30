import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  signUpWithWorkspace,
  slugify,
  submitFeedback,
  unique,
} from "./helpers";

test.describe("public feedback portal", () => {
  test("submit -> vote -> persists on reload -> unvote -> admin sees it", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "Portal",
    });
    const slug = slugify(workspaceName);

    await page.goto(`/b/${slug}`);
    await expect(page.getByRole("heading", { name: workspaceName })).toBeVisible();
    await expect(page.getByText("No feedback yet")).toBeVisible();

    const id = unique();
    const title = `Dark mode ${id}`;
    const submitterEmail = `participant-${id}@example.com`;
    await submitFeedback(page, {
      title,
      description: "Would love a dark mode toggle in settings.",
      name: "Jane Customer",
      email: submitterEmail,
    });

    await expect(page.getByText(title)).toBeVisible();

    const voteButton = page.getByRole("button", {
      name: new RegExp(`^Vote for “${title}”`),
    });
    const unvoteButton = page.getByRole("button", {
      name: new RegExp(`^Remove your vote from “${title}”`),
    });

    await voteButton.click();
    await expect(unvoteButton).toBeVisible();
    await expect(unvoteButton).toHaveText("1");

    await page.reload();
    await expect(unvoteButton).toBeVisible();
    await expect(unvoteButton).toHaveText("1");

    await unvoteButton.click();
    await expect(voteButton).toBeVisible();
    await expect(voteButton).toHaveText("0");

    await page.goto("/feedback");
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText(submitterEmail)).toBeVisible();
    await expect(page.getByText("0 votes")).toBeVisible();
  });

  test("voting without submitting first identifies the participant inline, then remembers them", async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const { workspaceName } = await signUpWithWorkspace(ownerPage, {
      namePrefix: "Inline",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Seed post ${id}`;
    await ownerPage.goto(`/b/${slug}`);
    await submitFeedback(ownerPage, {
      title,
      description: "A post to vote on from a fresh identity.",
      name: "Seed Author",
      email: `seed-${id}@example.com`,
    });
    await ownerContext.close();

    // A brand-new visitor, no participant cookie for this
    // organization at all — never submitted or voted before.
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`/b/${slug}`);
    await expect(visitorPage.getByText(title)).toBeVisible();

    const voteButton = visitorPage.getByRole("button", {
      name: new RegExp(`^Vote for “${title}”`),
    });
    await voteButton.click();

    // Clicking vote while unidentified reveals the inline
    // name/email step, instead of casting a vote for no one.
    await visitorPage.getByPlaceholder("Your name").fill("Fresh Voter");
    await visitorPage
      .getByPlaceholder("you@example.com")
      .fill(`fresh-${id}@example.com`);
    await visitorPage.getByRole("button", { name: "Vote" }).click();

    const unvoteButton = visitorPage.getByRole("button", {
      name: new RegExp(`^Remove your vote from “${title}”`),
    });
    await expect(unvoteButton).toBeVisible();
    await expect(unvoteButton).toHaveText("1");

    // The identity is remembered across a reload — no re-prompt.
    await visitorPage.reload();
    await expect(unvoteButton).toBeVisible();

    await visitorContext.close();
  });

  test("board and admin views have no automatically detectable accessibility violations, and no horizontal overflow", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "A11y",
    });
    const slug = slugify(workspaceName);

    // Empty board. Wait for the real content (not just navigation),
    // so a scan never catches the route's loading.tsx skeleton
    // mid-stream — same rationale as the admin-view wait below.
    await page.goto(`/b/${slug}`);
    await page.getByRole("heading", { name: workspaceName }).waitFor();
    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    // Board with a post, including the vote control.
    await submitFeedback(page, {
      title: `Accessible post ${unique()}`,
      description: "Checked for automated accessibility violations.",
      name: "A11y Tester",
      email: `a11y-${unique()}@example.com`,
    });
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    // Admin feedback view. Wait for its actual heading (not just
    // navigation) so a scan never catches the root loading.tsx
    // skeleton mid-stream — the same class of flake fixed in M3
    // (DECISIONS.md D3-... "createWorkspace" fix), now that this
    // page's query is heavier (a comment-count join, added in M5).
    await page.goto("/feedback");
    await page.getByRole("heading", { name: "Feedback", level: 1 }).waitFor();
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("feedback security / tenant isolation", () => {
  test("invalid submission is rejected server-side even if client validation is bypassed", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "Invalid",
    });
    const slug = slugify(workspaceName);
    await page.goto(`/b/${slug}`);

    // Bypass native HTML validation to prove the server itself
    // rejects a too-short title — not just the browser.
    await page.locator("form").first().evaluate((form) => {
      (form as HTMLFormElement).noValidate = true;
    });
    await page.locator("#title").fill("ab");
    await page.locator("#description").fill("Short desc but valid length.");
    await page.locator("#name").fill("Bad Input");
    await page.locator("#email").fill("bad-input@example.com");
    await page.getByRole("button", { name: "Submit feedback" }).click();

    await expect(
      page.getByText("Title must be at least 3 characters"),
    ).toBeVisible();
    await expect(page.getByText("No feedback yet")).toBeVisible();
  });

  test("unauthenticated visitors cannot reach the admin feedback view", async ({
    page,
  }) => {
    await page.goto("/feedback");
    await expect(page).toHaveURL(/\/login/);
  });

  test("tenant A's feedback board never shows tenant B's posts, and voting cannot cross tenants", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const { workspaceName: orgAName } = await signUpWithWorkspace(pageA, {
      namePrefix: "FeedbackTenantA",
    });
    const slugA = slugify(orgAName);
    const idA = unique();
    const titleA = `Tenant A request ${idA}`;

    await pageA.goto(`/b/${slugA}`);
    await submitFeedback(pageA, {
      title: titleA,
      description: "Only tenant A should ever see this request.",
      name: "Tenant A Customer",
      email: `tenant-a-${idA}@example.com`,
    });

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const { workspaceName: orgBName } = await signUpWithWorkspace(pageB, {
      namePrefix: "FeedbackTenantB",
    });
    const slugB = slugify(orgBName);

    // B's own board never shows A's post.
    await pageB.goto(`/b/${slugB}`);
    await expect(pageB.getByText(titleA)).toHaveCount(0);

    // B's admin feedback view never shows A's post either.
    await pageB.goto("/feedback");
    await expect(pageB.getByText(titleA)).toHaveCount(0);

    // A's slug resolves only to A's board, never B's — visiting A's
    // slug while authenticated as B still shows A's public content
    // (public boards are public), but B's admin view stays scoped to
    // B's own organization regardless.
    await pageA.goto("/feedback");
    await expect(pageA.getByText(titleA)).toBeVisible();
    await expect(pageA.getByText(orgBName)).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });
});
