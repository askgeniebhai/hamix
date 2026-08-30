import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PublicBoardNav } from "@/components/feedback/public-board-nav";
import { listPublishedChangelogEntries } from "@/lib/changelog/data";
import { getBoardBySlug } from "@/lib/feedback/data";
import { formatDate } from "@/lib/utils";

interface ChangelogPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ChangelogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  return { title: board ? `${board.name} changelog` : "Changelog" };
}

export default async function PublicChangelogPage({ params }: ChangelogPageProps) {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  if (!board) {
    notFound();
  }

  const entries = await listPublishedChangelogEntries(board.id);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-1 px-6 py-10">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ScrollText className="size-4 text-primary" aria-hidden="true" />
            Changelog
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {board.name}
          </h1>
          <p className="text-sm text-muted-foreground">What we&rsquo;ve shipped, most recent first.</p>
          <div className="pt-2">
            <PublicBoardNav boardSlug={board.slug} active="changelog" />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10"
      >
        {entries.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nothing published yet"
            description="Release notes will show up here as soon as they go live."
          />
        ) : (
          <ol className="flex flex-col gap-10">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-3 border-b border-border pb-10 last:border-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <time
                    dateTime={entry.publishedAt.toISOString()}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {formatDate(entry.publishedAt)}
                  </time>
                  <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
                </div>
                <p className="text-sm text-pretty whitespace-pre-wrap text-muted-foreground">
                  {entry.body}
                </p>
                {entry.linkedPosts.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {entry.linkedPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/b/${board.slug}/p/${post.id}`}
                        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        {post.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
