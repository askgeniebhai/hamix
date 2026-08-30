import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MessageCircle } from "lucide-react";

import { requireActiveOrganization } from "@/lib/auth/session";
import {
  getBoardForOrganization,
  listOrganizationPostsForAdmin,
} from "@/lib/feedback/data";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Feedback",
};

export default async function AdminFeedbackPage() {
  const { organization } = await requireActiveOrganization();
  const board = await getBoardForOrganization(organization.id);
  const posts = board
    ? await listOrganizationPostsForAdmin(organization.id)
    : [];

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

      {posts.length === 0 ? (
        <EmptyState
          icon={Inbox}
          headingLevel="h2"
          title="No feedback yet"
          description="Share your public board link so customers can start submitting requests."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/feedback/${post.id}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {post.title}
                    </Link>
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
