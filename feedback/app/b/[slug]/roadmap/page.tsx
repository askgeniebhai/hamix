import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronUp, MessageCircle, Milestone } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PublicBoardNav } from "@/components/feedback/public-board-nav";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { getBoardBySlug, listRoadmapPosts } from "@/lib/feedback/data";
import { POST_STATUS_LABELS, ROADMAP_STATUSES } from "@/lib/feedback/status";

interface RoadmapPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RoadmapPageProps): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  return { title: board ? `${board.name} roadmap` : "Roadmap" };
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  if (!board) {
    notFound();
  }

  const posts = await listRoadmapPosts(board.id);
  const sections = ROADMAP_STATUSES.map((status) => ({
    status,
    posts: posts.filter((post) => post.status === status),
  }));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-6 py-10">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Milestone className="size-4 text-primary" aria-hidden="true" />
            Roadmap
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {board.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            What we&rsquo;re planning, building, and have shipped.
          </p>
          <div className="pt-2">
            <PublicBoardNav boardSlug={board.slug} active="roadmap" />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10"
      >
        {posts.length === 0 ? (
          <EmptyState
            icon={Milestone}
            title="Nothing on the roadmap yet"
            description="Planned, in-progress, and completed requests will show up here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
            {sections.map((section) => (
              <section
                key={section.status}
                aria-labelledby={`roadmap-${section.status}-heading`}
                className="flex min-w-0 flex-col gap-3"
              >
                <h2
                  id={`roadmap-${section.status}-heading`}
                  className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {POST_STATUS_LABELS[section.status]}
                </h2>

                {section.posts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    Nothing here yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {section.posts.map((post) => (
                      <li key={post.id}>
                        <Link
                          href={`/b/${board.slug}/p/${post.id}`}
                          className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <Card className="transition-colors hover:ring-foreground/20">
                            <CardContent className="flex flex-col gap-3">
                              <span className="text-sm font-medium text-pretty text-foreground">
                                {post.title}
                              </span>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <StatusBadge status={post.status} />
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span
                                    className="flex items-center gap-1 tabular-nums"
                                    aria-label={`${post.voteCount} ${post.voteCount === 1 ? "vote" : "votes"}`}
                                  >
                                    <ChevronUp className="size-3.5" aria-hidden="true" />
                                    <span aria-hidden="true">{post.voteCount}</span>
                                  </span>
                                  <span
                                    className="flex items-center gap-1 tabular-nums"
                                    aria-label={`${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`}
                                  >
                                    <MessageCircle className="size-3.5" aria-hidden="true" />
                                    <span aria-hidden="true">{post.commentCount}</span>
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
