import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AddCommentForm } from "@/components/feedback/add-comment-form";
import { CommentThread } from "@/components/feedback/comment-thread";
import { StatusBadge } from "@/components/feedback/status-badge";
import { VoteControl } from "@/components/feedback/vote-control";
import {
  getBoardBySlug,
  getPostForBoard,
  listCommentsForPost,
} from "@/lib/feedback/data";
import { getParticipant } from "@/lib/feedback/participant";
import { formatDate } from "@/lib/utils";

interface PostPageProps {
  params: Promise<{ slug: string; postId: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug, postId } = await params;
  const board = await getBoardBySlug(slug);
  if (!board) {
    return { title: "Feedback board" };
  }
  const post = await getPostForBoard(board.id, postId, null);
  return { title: post ? post.title : "Feedback" };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug, postId } = await params;
  const board = await getBoardBySlug(slug);
  if (!board) {
    notFound();
  }

  const me = await getParticipant(board.organizationId);
  const post = await getPostForBoard(board.id, postId, me?.id ?? null);
  if (!post) {
    notFound();
  }

  const comments = await listCommentsForPost(board.organizationId, postId);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-6 py-10">
          <Link
            href={`/b/${slug}`}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {board.name}
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10"
      >
        <article className="flex items-start gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <VoteControl
            boardSlug={slug}
            postId={post.id}
            title={post.title}
            voteCount={post.voteCount}
            voted={post.votedByViewer}
            identified={!!me}
          />
          <div className="flex min-w-0 flex-col gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{post.title}</h1>
              <StatusBadge status={post.status} />
            </div>
            <p className="text-sm text-pretty text-muted-foreground">
              {post.description}
            </p>
            <p className="text-xs text-muted-foreground">
              Submitted by {post.submitterName} · {formatDate(post.createdAt)}
            </p>
          </div>
        </article>

        <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
          <h2
            id="comments-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </h2>
          <CommentThread comments={comments} />
          <AddCommentForm boardSlug={slug} postId={post.id} identified={!!me} />
        </section>
      </main>
    </div>
  );
}
