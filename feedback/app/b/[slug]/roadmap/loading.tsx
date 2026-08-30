import { Skeleton } from "@/components/ui/skeleton";

export default function RoadmapLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col" aria-busy="true">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-10">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="mt-2 h-9 w-40 rounded-full" />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 px-6 py-10 md:grid-cols-3"
      >
        {[0, 1, 2].map((column) => (
          <div key={column} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ))}
      </main>
    </div>
  );
}
