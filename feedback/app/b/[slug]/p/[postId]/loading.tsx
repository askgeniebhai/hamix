import { Skeleton } from "@/components/ui/skeleton";

export default function PostLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col" aria-busy="true">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-10">
          <Skeleton className="h-4 w-32" />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10"
      >
        <Skeleton className="h-32 rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
