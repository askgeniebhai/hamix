export interface ChangelogNotificationEmailInput {
  workspaceName: string;
  entryTitle: string;
  /** Plain-text body, already truncated by the caller if needed — this module does no truncation of its own. */
  entryBody: string;
  changelogUrl: string;
  linkedPosts: { title: string; url: string }[];
  unsubscribeUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A single, simple transactional template — not a template system, no
 * React Email — for the one email M8 sends: "a request you follow
 * shipped." Plain inline-styled HTML (works without a stylesheet in
 * any email client) plus a text alternative, both built from the same
 * input so they can never drift out of sync with each other.
 */
export function renderChangelogNotificationEmail(
  input: ChangelogNotificationEmailInput,
): RenderedEmail {
  const subject = `${input.workspaceName}: ${input.entryTitle}`;

  const linkedPostsHtml =
    input.linkedPosts.length > 0
      ? `<p style="margin:24px 0 8px;font-size:13px;font-weight:600;color:#6b7280;">Your request${
          input.linkedPosts.length > 1 ? "s" : ""
        }</p><ul style="margin:0;padding:0;list-style:none;">${input.linkedPosts
          .map(
            (post) =>
              `<li style="margin:0 0 6px;"><a href="${escapeHtml(post.url)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(post.title)}</a></li>`,
          )
          .join("")}</ul>`
      : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#6b7280;">${escapeHtml(input.workspaceName)}</p>
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(input.entryTitle)}</h1>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escapeHtml(input.entryBody)}</p>
                ${linkedPostsHtml}
                <p style="margin:28px 0 0;">
                  <a href="${escapeHtml(input.changelogUrl)}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:8px;">View changelog</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:520px;margin:16px 0 0;font-size:12px;color:#9ca3af;">
            You're receiving this because you followed a request on ${escapeHtml(input.workspaceName)}'s feedback board.
            <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#9ca3af;">Stop following</a>.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const linkedPostsText =
    input.linkedPosts.length > 0
      ? `\n\nYour request${input.linkedPosts.length > 1 ? "s" : ""}:\n${input.linkedPosts.map((post) => `- ${post.title}: ${post.url}`).join("\n")}`
      : "";

  const text = `${input.workspaceName}: ${input.entryTitle}

${input.entryBody}${linkedPostsText}

View changelog: ${input.changelogUrl}

You're receiving this because you followed a request on ${input.workspaceName}'s feedback board.
Stop following: ${input.unsubscribeUrl}`;

  return { subject, html, text };
}
