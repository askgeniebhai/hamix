import { describe, expect, it } from "vitest";

import { renderChangelogNotificationEmail } from "@/lib/email/templates";

const baseInput = {
  workspaceName: "Acme Inc",
  entryTitle: "Dark mode is here",
  entryBody: "We shipped dark mode across the whole app.",
  changelogUrl: "https://example.com/b/acme/changelog",
  linkedPosts: [{ title: "Add dark mode", url: "https://example.com/b/acme/p/post-1" }],
  unsubscribeUrl: "https://example.com/unsubscribe/token-123",
};

describe("renderChangelogNotificationEmail", () => {
  it("includes the workspace name and entry title in the subject", () => {
    const email = renderChangelogNotificationEmail(baseInput);
    expect(email.subject).toContain("Acme Inc");
    expect(email.subject).toContain("Dark mode is here");
  });

  it("includes the body, linked post, changelog link, and unsubscribe link in both html and text", () => {
    const email = renderChangelogNotificationEmail(baseInput);
    for (const part of [email.html, email.text]) {
      expect(part).toContain("We shipped dark mode across the whole app.");
      expect(part).toContain("Add dark mode");
      expect(part).toContain(baseInput.changelogUrl);
      expect(part).toContain(baseInput.unsubscribeUrl);
    }
  });

  it("omits the linked-requests section entirely when there are none", () => {
    const email = renderChangelogNotificationEmail({ ...baseInput, linkedPosts: [] });
    expect(email.html).not.toContain("Your request");
    expect(email.text).not.toContain("Your request");
  });

  it("escapes HTML special characters in user-supplied content — never raw-injects them", () => {
    const email = renderChangelogNotificationEmail({
      ...baseInput,
      entryTitle: '<script>alert("xss")</script>',
      entryBody: "Body with <b>tags</b> & \"quotes\"",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>tags</b>");
  });
});
