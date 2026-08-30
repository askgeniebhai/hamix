import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MessageCircle, SearchX } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/session";
import {
  getBoardForOrganization,
  listOrganizationPostsForAdmin,
} from "@/lib/feedback/data";
import { POST_STATUSES, type PostStatus } from "@/lib/feedback/status";
import { AdminFeedbackFilters } from "@/components/feedback/admin-feedback-filters";
import { StatusBadge } from "@/components/feedback/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Feedback",
};

type SearchParamValue = string | string[] | undefined;

interface AdminFeedbackPageProps {
  searchParams: Promise<{
    q?: SearchParamValue;
    status?: SearchParamValue;
    sort?: SearchParamValue;
  }>;
}

/** A repeated query param (`?q=a&q=b`) arrives as an array — only the first value is meaningful here. */
function firstValue(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: SearchParamValue): PostStatus | undefined {
  const raw = firstValue(value);
  return raw && (POST_STATUSES as readonly string[]).includes(raw)
    ? (raw as PostStatus)
    : undefined;
}

function parseSort(value: SearchParamValue): "newest" | "votes" | "comments" {
  const raw = firstValue(value);
  return raw === "votes" || raw === "comments" ? raw : "newest";
}

export default async function AdminFeedbackPage({
  searchParams,
}: AdminFeedbackPageProps) {
  const { organization } = await requireActiveOrganization();
  const board = await getBoardForOrganization(organization.id);

  const params = await searchParams;
  const query = firstValue(params.q)?.trim() ?? "";
  const status = parseStatus(params.status);
  const sort = parseSort(params.sort);

  const posts = board
    ? await listOrganizationPostsForAdmin(organization.id, { query, status, sort })
    : [];

  const hasActiveFilters = !!query || !!status;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Feedback</h1>
        {board ? (
          <p className="text-sm text-muted-foreground">
            Public board:{" "}
            <Link
              href={`/b/${board.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              /b/{board.slug}
            </Link>
          </p>
        ) : null}
      </div>

      {board && (posts.length > 0 || hasActiveFilters) ? (
        <AdminFeedbackFilters query={query} status={status ?? ""} sort={sort} />
      ) : null}

      {posts.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            headingLevel="h2"
            title="No matching feedback"
            description="Try a different search term or status filter."
          />
        ) : (
          <EmptyState
            icon={Inbox}
            headingLevel="h2"
            title="No feedback yet"
            description="Share your public board link so customers can start submitting requests."
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/feedback/${post.id}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {post.title}
                      </Link>
                      <StatusBadge status={post.status} />
                    </div>
                    <p className="text-sm text-pretty text-muted-foreground">
                      {post.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From {post.submitterName} · {post.submitterEmail}
                    </p>
                    <Link
                      href={`/feedback/${post.id}`}
                      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      {post.commentCount}{" "}
                      {post.commentCount === 1 ? "comment" : "comments"}
                    </Link>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                    {post.voteCount} {post.voteCount === 1 ? "vote" : "votes"}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
