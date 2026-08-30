import { Skeleton } from "@/components/ui/skeleton";

export default function ChangelogLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col" aria-busy="true">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 py-10">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="mt-2 h-9 w-56 rounded-full" />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-10"
      >
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </main>
    </div>
  );
}
