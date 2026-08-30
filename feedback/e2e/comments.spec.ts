import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  addComment,
  openPostDetail,
  signUpWithWorkspace,
  slugify,
  submitFeedback,
  unique,
} from "./helpers";

test.describe("feedback detail & comments", () => {
  test("external submits feedback -> opens it -> comments -> persists on reload -> internal member replies -> public visitor sees both -> admin sees the thread", async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const { workspaceName } = await signUpWithWorkspace(ownerPage, {
      namePrefix: "Thread",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Thread post ${id}`;

    await ownerPage.goto(`/b/${slug}`);
    await submitFeedback(ownerPage, {
      title,
      description: "A post to build a full comment thread on.",
      name: "Thread Author",
      email: `thread-author-${id}@example.com`,
    });

    await openPostDetail(ownerPage, title);
    await expect(ownerPage.getByText("No comments yet")).toBeVisible();
    await addComment(ownerPage, "Any timeline on this?");
    await expect(ownerPage.getByText("1 comment")).toBeVisible();

    await ownerPage.reload();
    await expect(ownerPage.getByText("Any timeline on this?")).toBeVisible();

    // The internal team reply happens as the authenticated workspace
    // owner, in the same context, via the protected admin thread view.
    await ownerPage.goto("/feedback");
    await openPostDetail(ownerPage, title);
    await expect(ownerPage.getByText("Any timeline on this?")).toBeVisible();
    await addComment(ownerPage, "We're looking into this!", "Post reply");
    await expect(ownerPage.getByText("Team", { exact: true })).toBeVisible();

    // A separate, unauthenticated visitor sees both the customer
    // comment and the team reply on the public thread.
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`/b/${slug}`);
    await openPostDetail(visitorPage, title);
    await expect(visitorPage.getByText("2 comments")).toBeVisible();
    await expect(visitorPage.getByText("Any timeline on this?")).toBeVisible();
    await expect(visitorPage.getByText("We're looking into this!")).toBeVisible();
    await expect(visitorPage.getByText("Team", { exact: true })).toBeVisible();

    await ownerContext.close();
    await visitorContext.close();
  });

  test("commenting without prior identification identifies the participant inline, then remembers them", async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const { workspaceName } = await signUpWithWorkspace(ownerPage, {
      namePrefix: "InlineComment",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Inline comment post ${id}`;
    await ownerPage.goto(`/b/${slug}`);
    await submitFeedback(ownerPage, {
      title,
      description: "A post to comment on from a fresh identity.",
      name: "Seed Author",
      email: `seed-${id}@example.com`,
    });
    await ownerContext.close();

    // A brand-new visitor, no participant cookie for this
    // organization — never submitted or voted before.
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`/b/${slug}`);
    await openPostDetail(visitorPage, title);

    await visitorPage.locator("textarea[name=body]").fill("First time commenting here.");
    await visitorPage.getByLabel("Your name").fill("Fresh Commenter");
    await visitorPage.getByLabel("Your email").fill(`fresh-${id}@example.com`);
    await visitorPage.getByRole("button", { name: "Post comment" }).click();
    await visitorPage.getByText("First time commenting here.").first().waitFor();

    // Reload and comment again — no re-identification prompt.
    await visitorPage.reload();
    await expect(visitorPage.getByLabel("Your name")).toHaveCount(0);
    await addComment(visitorPage, "Second comment, same identity.");
    await expect(visitorPage.getByText("2 comments")).toBeVisible();

    await visitorContext.close();
  });
});

test.describe("comment security / tenant isolation", () => {
  test("invalid, empty, and oversized comments are rejected server-side even if client validation is bypassed", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "InvalidComment",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Invalid comment post ${id}`;
    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "A post to attempt invalid comments on.",
      name: "Invalid Test Author",
      email: `invalid-author-${id}@example.com`,
    });
    await openPostDetail(page, title);

    const form = page.locator("form", { has: page.locator("textarea[name=body]") });
    await form.evaluate((el) => {
      (el as HTMLFormElement).noValidate = true;
    });

    // Empty.
    await page.locator("textarea[name=body]").fill("   ");
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText("Write a comment before posting")).toBeVisible();
    await expect(page.getByText("No comments yet")).toBeVisible();

    // Oversized — set the value directly, bypassing the textarea's
    // own `maxlength` attribute (which `.fill()` respects even with
    // the form's `noValidate` set), to prove the *server* enforces
    // the 2000-character limit too, not just the browser.
    await page
      .locator("textarea[name=body]")
      .evaluate((el, value) => {
        (el as HTMLTextAreaElement).value = value;
      }, "a".repeat(2001));
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(
      page.getByText("Comments are limited to 2000 characters"),
    ).toBeVisible();
    await expect(page.getByText("No comments yet")).toBeVisible();
  });

  test("unauthenticated visitors and non-member workspace users cannot reach or affect another organization's admin thread", async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const { workspaceName: orgAName } = await signUpWithWorkspace(pageA, {
      namePrefix: "CommentTenantA",
    });
    const slugA = slugify(orgAName);
    const idA = unique();
    const titleA = `Tenant A comment post ${idA}`;
    await pageA.goto(`/b/${slugA}`);
    await submitFeedback(pageA, {
      title: titleA,
      description: "Only tenant A should ever see or reply to this.",
      name: "Tenant A Customer",
      email: `tenant-a-comment-${idA}@example.com`,
    });
    await openPostDetail(pageA, titleA);
    await addComment(pageA, "A customer comment only tenant A should see.");
    await pageA.goto("/feedback");
    await openPostDetail(pageA, titleA);
    const postAUrl = pageA.url();

    // Unauthenticated visitor to the admin thread URL is redirected
    // to log in, never sees the thread.
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(postAUrl);
    await expect(anonPage).toHaveURL(/\/login/);
    await anonContext.close();

    // Tenant B, authenticated but not a member of tenant A, cannot
    // view or reply to tenant A's post — the URL 404s for them.
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const { workspaceName: orgBName } = await signUpWithWorkspace(pageB, {
      namePrefix: "CommentTenantB",
    });
    const slugB = slugify(orgBName);

    await pageB.goto(postAUrl);
    await expect(pageB.getByRole("heading", { name: "Page not found" })).toBeVisible();

    // Tenant B's own board and admin view never show tenant A's post
    // or its comment.
    await pageB.goto(`/b/${slugB}`);
    await expect(pageB.getByText(titleA)).toHaveCount(0);
    await pageB.goto("/feedback");
    await expect(pageB.getByText(titleA)).toHaveCount(0);
    await expect(
      pageB.getByText("A customer comment only tenant A should see."),
    ).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });

  test("detail pages have no automatically detectable accessibility violations, and no horizontal overflow", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "CommentA11y",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `A11y comment post ${id}`;
    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "Checked for automated accessibility violations.",
      name: "A11y Tester",
      email: `a11y-comment-${id}@example.com`,
    });

    await openPostDetail(page, title);
    await addComment(page, "A comment to check thread accessibility.");

    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    await page.goto("/feedback");
    await openPostDetail(page, title);
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
