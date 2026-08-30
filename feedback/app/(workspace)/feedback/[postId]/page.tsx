import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CommentThread } from "@/components/feedback/comment-thread";
import { InternalReplyForm } from "@/components/feedback/internal-reply-form";
import { StatusSelect } from "@/components/feedback/status-select";
import { requireActiveOrganization } from "@/lib/auth/session";
import { getPostForOrganization, listCommentsForPost } from "@/lib/feedback/data";
import { formatDate } from "@/lib/utils";

interface AdminPostPageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({
  params,
}: AdminPostPageProps): Promise<Metadata> {
  const { postId } = await params;
  const { organization } = await requireActiveOrganization();
  const post = await getPostForOrganization(organization.id, postId);
  return { title: post ? post.title : "Feedback" };
}

export default async function AdminPostPage({ params }: AdminPostPageProps) {
  const { postId } = await params;
  const { organization } = await requireActiveOrganization();

  const post = await getPostForOrganization(organization.id, postId);
  if (!post) {
    notFound();
  }

  const comments = await listCommentsForPost(organization.id, postId);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Link
        href="/feedback"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Feedback
      </Link>

      <article className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-lg font-semibold text-foreground">{post.title}</h1>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
            {post.voteCount} {post.voteCount === 1 ? "vote" : "votes"}
          </span>
        </div>
        <p className="text-sm text-pretty text-muted-foreground">
          {post.description}
        </p>
        <p className="text-xs text-muted-foreground">
          From {post.submitterName} · {post.submitterEmail} ·{" "}
          {formatDate(post.createdAt)}
        </p>
        <StatusSelect postId={post.id} status={post.status} />
      </article>

      <section aria-labelledby="admin-comments-heading" className="flex flex-col gap-4">
        <h2
          id="admin-comments-heading"
          className="text-sm font-medium text-muted-foreground"
        >
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h2>
        <CommentThread comments={comments} />
        <InternalReplyForm postId={post.id} />
      </section>
    </div>
  );
}
