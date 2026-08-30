import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronUp, MessageCircle } from "lucide-react";

import { updateDraftAction } from "@/app/(workspace)/changelog/[entryId]/actions";
import { requireActiveOrganization } from "@/lib/auth/session";
import { getChangelogEntryForOrganization, listCompletablePosts } from "@/lib/changelog/data";
import { getBoardForOrganization } from "@/lib/feedback/data";
import { ChangelogDraftForm } from "@/components/changelog/changelog-draft-form";
import { FeedbackPicker } from "@/components/changelog/feedback-picker";
import { PublishButton } from "@/components/changelog/publish-button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface ChangelogEntryPageProps {
  params: Promise<{ entryId: string }>;
}

export async function generateMetadata({
  params,
}: ChangelogEntryPageProps): Promise<Metadata> {
  const { entryId } = await params;
  const { organization } = await requireActiveOrganization();
  const entry = await getChangelogEntryForOrganization(organization.id, entryId);
  return { title: entry ? entry.title : "Changelog" };
}

export default async function ChangelogEntryPage({ params }: ChangelogEntryPageProps) {
  const { entryId } = await params;
  const { organization } = await requireActiveOrganization();
  const entry = await getChangelogEntryForOrganization(organization.id, entryId);
  if (!entry) {
    notFound();
  }

  const boundUpdateAction = updateDraftAction.bind(null, entryId);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/changelog"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Changelog
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">{entry.title}</h1>
          <Badge variant={entry.state === "published" ? "default" : "outline"}>
            {entry.state === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        {entry.publishedAt ? (
          <p className="text-sm text-muted-foreground">Published {formatDate(entry.publishedAt)}</p>
        ) : null}
      </div>

      {entry.state === "draft" ? (
        <DraftEditor
          organizationId={organization.id}
          entryId={entryId}
          title={entry.title}
          body={entry.body}
          action={boundUpdateAction}
        />
      ) : (
        <PublishedSummary
          organizationId={organization.id}
          body={entry.body}
          linkedPosts={entry.linkedPosts}
          notifiedCount={entry.notifiedCount}
          failedCount={entry.failedCount}
          pendingCount={entry.pendingCount}
        />
      )}
    </div>
  );
}

async function DraftEditor({
  organizationId,
  entryId,
  title,
  body,
  action,
}: {
  organizationId: string;
  entryId: string;
  title: string;
  body: string;
  action: Parameters<typeof ChangelogDraftForm>[0]["action"];
}) {
  const completablePosts = await listCompletablePosts(organizationId, entryId);
  const linkedCount = completablePosts.filter((post) => post.linked).length;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Edit</h2>
        <ChangelogDraftForm
          action={action}
          initialTitle={title}
          initialBody={body}
          submitLabel="Save changes"
          pendingLabel="Saving…"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            Link completed requests {linkedCount > 0 ? `(${linkedCount} linked)` : ""}
          </h2>
        </div>
        <FeedbackPicker entryId={entryId} posts={completablePosts} />

        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Ready to publish?</h3>
          <p className="text-xs text-muted-foreground">
            Publishing is permanent — the entry becomes visible on the public changelog and
            subscribed customers on linked requests are notified. It cannot be unpublished.
          </p>
          <PublishButton entryId={entryId} />
        </div>
      </section>
    </div>
  );
}

function PublishedSummary({
  organizationId,
  body,
  linkedPosts,
  notifiedCount,
  failedCount,
  pendingCount,
}: {
  organizationId: string;
  body: string;
  linkedPosts: { id: string; title: string; voteCount: number; commentCount: number }[];
  notifiedCount: number;
  failedCount: number;
  pendingCount: number;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="text-sm text-pretty whitespace-pre-wrap text-foreground">{body}</p>

      {linkedPosts.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground">Linked requests</h2>
          <ul className="flex flex-col gap-2">
            {linkedPosts.map((post) => (
              <li
                key={post.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
              >
                <span className="truncate text-sm text-foreground">{post.title}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 tabular-nums">
                    <ChevronUp className="size-3.5" aria-hidden="true" />
                    {post.voteCount}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums">
                    <MessageCircle className="size-3.5" aria-hidden="true" />
                    {post.commentCount}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Delivery</h2>
        <p className="text-sm text-muted-foreground">
          {notifiedCount + failedCount + pendingCount === 0
            ? "No one was following the linked requests, so no notifications were sent."
            : `${notifiedCount} notified${failedCount > 0 ? `, ${failedCount} failed` : ""}${
                pendingCount > 0 ? `, ${pendingCount} pending` : ""
              }.`}
        </p>
        {failedCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            A failure usually means email isn&rsquo;t configured for this workspace yet.
          </p>
        ) : null}
      </section>

      <PublicChangelogLink organizationId={organizationId} />
    </div>
  );
}

async function PublicChangelogLink({ organizationId }: { organizationId: string }) {
  const board = await getBoardForOrganization(organizationId);
  if (!board) {
    return null;
  }
  return (
    <Link
      href={`/b/${board.slug}/changelog`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      View public changelog ↗
    </Link>
  );
}
