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

async function changeStatus(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Change status" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

async function adminListOrder(page: Page): Promise<string[]> {
  return page.locator("main ul > li").allTextContents();
}

test.describe("status workflow", () => {
  test("submit -> admin sees Open -> search finds it -> filter Open -> Under Review -> public reflects it -> Planned -> refresh persists", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "StatusFlow",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Status flow post ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "A post to walk through the full status lifecycle.",
      name: "Status Customer",
      email: `status-customer-${id}@example.com`,
    });

    // New feedback defaults to Open, visible on the public board.
    const boardArticle = page.locator("article", { hasText: title });
    await expect(boardArticle.getByText("Open", { exact: true })).toBeVisible();

    // Admin sees it as Open.
    await page.goto("/feedback");
    await expect(page.getByRole("heading", { name: "Feedback", level: 1 })).toBeVisible();
    const adminCard = page.locator("li", { hasText: title });
    await expect(adminCard.getByText("Open", { exact: true })).toBeVisible();

    // Search finds it by title.
    await page.getByLabel("Search feedback").fill(title);
    await page.waitForURL(/[?&]q=/);
    await expect(page.getByText(title)).toBeVisible();

    // Filtering to Open still shows it; filtering to a different
    // status (with the search cleared) hides it.
    await page.goto(`/feedback?status=open`);
    await expect(page.getByText(title)).toBeVisible();
    await page.goto(`/feedback?status=complete`);
    await expect(page.getByText(title)).toHaveCount(0);
    await expect(page.getByText("No matching feedback")).toBeVisible();

    // Open the thread and change status to Under Review.
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Under Review");
    await expect(page.getByRole("combobox", { name: "Change status" })).toContainText(
      "Under Review",
    );

    // Public board and detail page both reflect the new status.
    await page.goto(`/b/${slug}`);
    await expect(
      page.locator("article", { hasText: title }).getByText("Under Review", { exact: true }),
    ).toBeVisible();
    await openPostDetail(page, title);
    await expect(page.getByText("Under Review", { exact: true })).toBeVisible();

    // Change to Planned from the admin thread; refresh persists it —
    // for both the admin view and the public view.
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Planned");
    await expect(page.getByRole("combobox", { name: "Change status" })).toContainText(
      "Planned",
    );
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Change status" })).toContainText(
      "Planned",
    );

    await page.goto(`/b/${slug}`);
    await expect(
      page.locator("article", { hasText: title }).getByText("Planned", { exact: true }),
    ).toBeVisible();
  });

  test("sort by votes and sort by comments order the admin list correctly", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "StatusSort",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const titleA = `Sort post A ${id}`;
    const titleB = `Sort post B ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title: titleA,
      description: "Will end up with more comments than votes.",
      name: "Sort Customer",
      email: `sort-customer-${id}@example.com`,
    });
    await submitFeedback(page, {
      title: titleB,
      description: "Will end up with more votes than comments.",
      name: "Sort Customer",
      email: `sort-customer-${id}@example.com`,
    });

    // Give post A two comments, post B one vote.
    await openPostDetail(page, titleA);
    await addComment(page, "First comment on A.");
    await addComment(page, "Second comment on A.");
    await page.goto(`/b/${slug}`);
    await page
      .getByRole("button", { name: new RegExp(`^Vote for “${titleB}”`) })
      .click();

    await page.goto("/feedback?sort=votes");
    let order = await adminListOrder(page);
    let indexA = order.findIndex((text) => text.includes(titleA));
    let indexB = order.findIndex((text) => text.includes(titleB));
    expect(indexB).toBeLessThan(indexA);

    await page.goto("/feedback?sort=comments");
    order = await adminListOrder(page);
    indexA = order.findIndex((text) => text.includes(titleA));
    indexB = order.findIndex((text) => text.includes(titleB));
    expect(indexA).toBeLessThan(indexB);
  });

  test("admin filters have no automatically detectable accessibility violations, and no horizontal overflow", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "StatusA11y",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title: `A11y status post ${id}`,
      description: "Checked for automated accessibility violations.",
      name: "A11y Tester",
      email: `a11y-status-${id}@example.com`,
    });

    await page.goto("/feedback");
    await page.getByRole("heading", { name: "Feedback", level: 1 }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("status security", () => {
  test("public board and detail pages show status but expose no control to change it", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "StatusPublic",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Public status post ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "The public should never be able to change this post's status.",
      name: "Public Tester",
      email: `public-status-${id}@example.com`,
    });

    // A fresh, unauthenticated visitor — the board and detail page
    // are public, but neither renders a status-changing control.
    await page.context().clearCookies();
    await page.goto(`/b/${slug}`);
    await expect(page.getByRole("combobox", { name: "Change status" })).toHaveCount(0);

    await openPostDetail(page, title);
    await expect(page.getByRole("combobox", { name: "Change status" })).toHaveCount(0);
  });
});
