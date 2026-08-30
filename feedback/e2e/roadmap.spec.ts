import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  openPostDetail,
  signUpWithWorkspace,
  slugify,
  submitFeedback,
  unique,
} from "./helpers";

/**
 * Changes status and waits for the write to actually land, not just
 * for the trigger's own label. `StatusSelect` updates that label
 * optimistically — synchronously on click, before the server action's
 * `await` resolves — so waiting on it alone doesn't prove the mutation
 * committed; a `page.goto` fired right after can still outrace the
 * real database write. Waiting for the underlying POST response (the
 * Server Action invocation) does.
 */
async function changeStatus(page: Page, label: string) {
  const mutation = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.ok(),
  );
  await page.getByRole("combobox", { name: "Change status" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await mutation;
  await expect(page.getByRole("combobox", { name: "Change status" })).toContainText(label);
}

test.describe("public roadmap", () => {
  test("submit -> Planned appears in Roadmap -> In Progress moves -> Complete moves -> refresh persists; Open/Under Review never appear", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "RoadmapFlow",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Roadmap flow post ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "Walks the full roadmap lifecycle.",
      name: "Roadmap Customer",
      email: `roadmap-customer-${id}@example.com`,
    });

    // Still Open — absent from the roadmap entirely.
    await page.goto(`/b/${slug}/roadmap`);
    await expect(page.getByText(title)).toHaveCount(0);

    // Under Review — an internal triage state, still not shown publicly.
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Under Review");
    await page.goto(`/b/${slug}/roadmap`);
    await expect(page.getByText(title)).toHaveCount(0);

    // Planned — now appears, in the Planned section.
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Planned");
    await page.goto(`/b/${slug}/roadmap`);
    const plannedSection = page.locator("section", { has: page.getByRole("heading", { name: "Planned" }) });
    await expect(plannedSection.getByText(title)).toBeVisible();

    // In Progress — moves out of Planned, into In Progress.
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "In Progress");
    await page.goto(`/b/${slug}/roadmap`);
    await expect(plannedSection.getByText(title)).toHaveCount(0);
    const inProgressSection = page.locator("section", {
      has: page.getByRole("heading", { name: "In Progress" }),
    });
    await expect(inProgressSection.getByText(title)).toBeVisible();

    // Complete — moves again, and a page reload still shows it there.
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Complete");
    await page.goto(`/b/${slug}/roadmap`);
    await expect(inProgressSection.getByText(title)).toHaveCount(0);
    const completeSection = page.locator("section", {
      has: page.getByRole("heading", { name: "Complete" }),
    });
    await expect(completeSection.getByText(title)).toBeVisible();

    await page.reload();
    await expect(completeSection.getByText(title)).toBeVisible();

    // Each roadmap card links to the same public detail page.
    await completeSection.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  });

  test("each roadmap card links to its own post detail page, not another's", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "RoadmapLink",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const titleA = `Roadmap link A ${id}`;
    const titleB = `Roadmap link B ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title: titleA,
      description: "First roadmap item.",
      name: "Roadmap Customer",
      email: `roadmap-link-${id}@example.com`,
    });
    await submitFeedback(page, {
      title: titleB,
      description: "Second roadmap item.",
      name: "Roadmap Customer",
      email: `roadmap-link-${id}@example.com`,
    });

    await page.goto("/feedback");
    await openPostDetail(page, titleA);
    await changeStatus(page, "Planned");
    await page.goto("/feedback");
    await openPostDetail(page, titleB);
    await changeStatus(page, "Complete");

    await page.goto(`/b/${slug}/roadmap`);
    await page.getByRole("link", { name: titleB }).click();
    await expect(page.getByRole("heading", { name: titleB, level: 1 })).toBeVisible();
  });
});

test.describe("roadmap security / tenant isolation", () => {
  test("tenant A's roadmap post is never visible on tenant B's roadmap", async ({
    page,
  }) => {
    const orgA = await signUpWithWorkspace(page, { namePrefix: "RoadmapTenantA" });
    const slugA = slugify(orgA.workspaceName);
    const idA = unique();
    const titleA = `Tenant A roadmap post ${idA}`;

    await page.goto(`/b/${slugA}`);
    await submitFeedback(page, {
      title: titleA,
      description: "Belongs only to tenant A.",
      name: "Tenant A Customer",
      email: `tenant-a-roadmap-${idA}@example.com`,
    });
    await page.goto("/feedback");
    await openPostDetail(page, titleA);
    await changeStatus(page, "Planned");

    await page.context().clearCookies();
    const orgB = await signUpWithWorkspace(page, { namePrefix: "RoadmapTenantB" });
    const slugB = slugify(orgB.workspaceName);

    await page.goto(`/b/${slugB}/roadmap`);
    await expect(page.getByText(titleA)).toHaveCount(0);
  });

  test("public roadmap exposes no control to change status", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "RoadmapNoMutate",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const title = `Roadmap no-mutate post ${id}`;

    await page.goto(`/b/${slug}`);
    await submitFeedback(page, {
      title,
      description: "The public roadmap must never allow a status change.",
      name: "Roadmap Customer",
      email: `roadmap-no-mutate-${id}@example.com`,
    });
    await page.goto("/feedback");
    await openPostDetail(page, title);
    await changeStatus(page, "Planned");

    await page.context().clearCookies();
    await page.goto(`/b/${slug}/roadmap`);
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Change status" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Change status/i })).toHaveCount(0);
  });

  test("an unknown board's roadmap 404s safely", async ({ page }) => {
    // `notFound()` here streams after the shell has already started as
    // a 200 (this Next.js version's Cache Components architecture —
    // the same characteristic the pre-existing `/b/[slug]` board page
    // already has; see `DECISIONS.md` D7-002), so the HTTP status
    // itself isn't 404. What "safe" means here is what actually
    // matters: no board/post data leaks, the root not-found UI
    // renders, and the response is marked `noindex`.
    await page.goto("/b/this-board-does-not-exist/roadmap");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      "noindex",
    );
  });

  test("an unauthenticated visitor can view the roadmap", async ({ page }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "RoadmapPublicView",
    });
    const slug = slugify(workspaceName);

    await page.context().clearCookies();
    const response = await page.goto(`/b/${slug}/roadmap`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
  });
});

test.describe("roadmap accessibility & responsiveness", () => {
  test("roadmap has no automatically detectable accessibility violations, and no horizontal overflow", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "RoadmapA11y",
    });
    const slug = slugify(workspaceName);
    const id = unique();
    const titles = ["Planned", "In Progress", "Complete"].map(
      (status) => `A11y ${status} post ${id}`,
    );

    await page.goto(`/b/${slug}`);
    for (const title of titles) {
      await submitFeedback(page, {
        title,
        description: "Checked for automated accessibility violations.",
        name: "A11y Tester",
        email: `a11y-roadmap-${id}-${title.length}@example.com`,
      });
    }

    await page.goto("/feedback");
    for (const [index, status] of ["Planned", "In Progress", "Complete"].entries()) {
      await openPostDetail(page, titles[index]);
      await changeStatus(page, status);
      await page.goto("/feedback");
    }

    await page.goto(`/b/${slug}/roadmap`);
    await page.getByRole("link", { name: "Roadmap", exact: true }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    // Every roadmap card and both nav tabs remain reachable by keyboard.
    await expect(page.getByRole("link", { name: "Feedback", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
  });

  test("empty roadmap shows a calm empty state instead of blank sections", async ({
    page,
  }) => {
    const { workspaceName } = await signUpWithWorkspace(page, {
      namePrefix: "RoadmapEmpty",
    });
    const slug = slugify(workspaceName);

    await page.goto(`/b/${slug}/roadmap`);
    await expect(page.getByText("Nothing on the roadmap yet")).toBeVisible();
  });
});
