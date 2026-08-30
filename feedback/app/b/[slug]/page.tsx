import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, MessageSquareText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SubmitFeedbackForm } from "@/components/feedback/submit-feedback-form";
import { VoteControl } from "@/components/feedback/vote-control";
import { getBoardBySlug, listBoardPosts } from "@/lib/feedback/data";
import { getParticipant } from "@/lib/feedback/participant";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BoardPageProps): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  return { title: board ? `${board.name} feedback` : "Feedback board" };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  if (!board) {
    notFound();
  }

  const me = await getParticipant(board.organizationId);
  const posts = await listBoardPosts(board.id, me?.id ?? null);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-6 py-10">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
            Feedback
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {board.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Share an idea, or vote for what matters most to you.
          </p>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10"
      >
        <SubmitFeedbackForm boardSlug={board.slug} />

        <section aria-labelledby="feedback-list-heading" className="flex flex-col gap-3">
          <h2
            id="feedback-list-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            {posts.length} {posts.length === 1 ? "request" : "requests"}
          </h2>

          {posts.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="No feedback yet"
              description="Be the first to share what you'd like to see."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <article className="flex items-start gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                    <VoteControl
                      boardSlug={board.slug}
                      postId={post.id}
                      title={post.title}
                      voteCount={post.voteCount}
                      voted={post.votedByViewer}
                      identified={!!me}
                    />
                    <div className="flex min-w-0 flex-col gap-1 pt-1">
                      <Link
                        href={`/b/${board.slug}/p/${post.id}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {post.title}
                      </Link>
                      <p className="text-sm text-pretty text-muted-foreground">
                        {post.description}
                      </p>
                      <Link
                        href={`/b/${board.slug}/p/${post.id}`}
                        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <MessageCircle className="size-3.5" aria-hidden="true" />
                        {post.commentCount}{" "}
                        {post.commentCount === 1 ? "comment" : "comments"}
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
